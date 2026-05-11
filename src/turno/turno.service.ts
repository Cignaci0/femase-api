import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Turno } from './entities/turno.entity';
import { Repository, In } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Cenco } from 'src/cencos/cenco.entity';
import { Semana } from 'src/semana/entities/semana.entity';
import { Horario } from 'src/horario/entities/horario.entity';
import { DetalleTurno } from 'src/detalle-turno/entities/detalle-turno.entity';
import { AuditoriaTurno } from 'src/detalle-turno/entities/auditoria-turno.entity';


@Injectable()
export class TurnoService {
  constructor(
    @InjectRepository(Turno)
    private turnoRepository: Repository<Turno>,
    @InjectRepository(Empleado)
    private empleadoRepository: Repository<Empleado>,
    @InjectRepository(Cenco)
    private cencoRepository: Repository<Cenco>,
    @InjectRepository(Semana)
    private semanaRepository: Repository<Semana>,
    @InjectRepository(Horario)
    private horarioRepository: Repository<Horario>,
    @InjectRepository(DetalleTurno)
    private detalleTurnoRepository: Repository<DetalleTurno>,
    @InjectRepository(AuditoriaTurno)
    private auditoriaTurnoRepository: Repository<AuditoriaTurno>
  ) { }

  async create(createTurnoDto: Turno, usuario: string) {
    try {
      const nuevo = this.turnoRepository.create(createTurnoDto);
      const guardada = await this.turnoRepository.save(nuevo);
      return {
        turno_id: guardada.turno_id,
        nombre: guardada.nombre,
        empresa: guardada.empresa
      }
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El registro ya existe o el identificador está duplicado');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }

      throw new InternalServerErrorException('Error crítico al crear el registro en la base de datos');
    }
  }


  findAll(empresa_id: number) {
    return this.turnoRepository.find({
      relations: ['empresa', 'estado', "detalle_turno.horario", "detalle_turno.dia"],
      order: {
        turno_id: 'asc'
      },
      where: {
        empresa: {
          empresa_id: empresa_id
        }
      }
    });
  }

  async update(id: number, updateTurnoDto: UpdateTurnoDto) {
    const result = await this.turnoRepository.preload({
      turno_id: id,
      ...updateTurnoDto,
    });

    if (!result) {
      throw new NotFoundException(`EL registro con ID ${id} no existe`);
    }

    try {
      const actualizada = await this.turnoRepository.save(result);

      if (updateTurnoDto.empresa) {
        const nuevaEmpresaId = typeof updateTurnoDto.empresa === 'object'
          ? (updateTurnoDto.empresa as any).empresa_id
          : updateTurnoDto.empresa;

        // 1. Desasignar Empleados de otra empresa
        const empleadosConTurno = await this.empleadoRepository.find({
          where: { turno: { turno_id: id } },
          relations: ['empresa', 'turno']
        });

        const empleadosADesasignar = empleadosConTurno.filter(emp => emp.empresa?.empresa_id !== Number(nuevaEmpresaId));

        if (empleadosADesasignar.length > 0) {
          empleadosADesasignar.forEach(emp => emp.turno = null);
          await this.empleadoRepository.save(empleadosADesasignar);
        }

        // 2. Desasignar Cencos de otra empresa
        const cencosConTurno = await this.cencoRepository.find({
          where: { turnos: { turno_id: id } },
          relations: ['turnos', 'departamento', 'departamento.empresa']
        });

        const cencosADesasignar = cencosConTurno.filter(cenco => cenco.departamento?.empresa?.empresa_id !== Number(nuevaEmpresaId));

        if (cencosADesasignar.length > 0) {
          for (const cenco of cencosADesasignar) {
            cenco.turnos = cenco.turnos.filter(t => t.turno_id !== id);
            await this.cencoRepository.save(cenco);
          }
        }
      }

      return {
        mensaje: 'Registro actualizado con éxito',
        id: actualizada.turno_id
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El nombre ya pertenece a otro registro');
      }
      throw new InternalServerErrorException('Error al actualizar el registro');
    }
  }


  async asignarEmpleados(turnoId: number, empleadosIds: number[]) {
    const turno = await this.turnoRepository.findOne({ where: { turno_id: turnoId } });
    if (!turno) {
      throw new NotFoundException('Turno no encontrado');
    }

    // 1. Buscamos a todos los empleados que actualmente tienen este turno
    const empleadosActuales = await this.empleadoRepository.find({
      where: { turno: { turno_id: turnoId } },
      relations: ['turno']
    });

    // 2. Les quitamos el turno a todos (los dejamos en null o desasignados)
    if (empleadosActuales.length > 0) {
      empleadosActuales.forEach(emp => emp.turno = null);
      await this.empleadoRepository.save(empleadosActuales);
    }

    // 3. Si mandaron un array vacío, terminamos aquí
    if (!empleadosIds || empleadosIds.length === 0) {
      return {
        mensaje: 'Turno desasignado de todos los empleados con éxito',
        turno_id: turno.turno_id,
        empleados_actualizados: empleadosActuales.length
      };
    }

    // 4. Si mandaron IDs, buscamos esos empleados y les asignamos el turno
    const nuevosEmpleados = await this.empleadoRepository.find({
      where: { empleado_id: In(empleadosIds) }
    });

    if (nuevosEmpleados.length === 0) {
      throw new NotFoundException('No se encontraron empleados con los IDs proporcionados');
    }

    nuevosEmpleados.forEach(emp => {
      emp.turno = turno;
      emp.fecha_asignacion_turno = new Date();
    });
    await this.empleadoRepository.save(nuevosEmpleados);

    return {
      mensaje: 'Empleados asignados al turno con éxito',
      turno_id: turno.turno_id,
      empleados_actualizados: nuevosEmpleados.length
    };
  }


  async asignarCenco(turnoId: number, cencoId: number) {
    const turno = await this.turnoRepository.findOne({
      where: {
        turno_id: turnoId
      }
    })
    if (!turno) {
      throw new NotFoundException('Turno no encontrado');
    }
    const cenco = await this.cencoRepository.findOne({
      where: {
        cenco_id: cencoId
      },
      relations: ['turnos']
    })
    if (!cenco) {
      throw new NotFoundException("cenco no encontrado")
    }

    const existeTurno = cenco.turnos.find(turno => turno.turno_id === turnoId)
    if (!existeTurno) {
      cenco.turnos.push(turno)
    }
    return await this.cencoRepository.save(cenco)
  }

  async asignarHorario(id_turno: number, id_dia: number[], id_horario: number[], usuario: string) {
    if (id_dia.length !== id_horario.length) {
      throw new BadRequestException('La lista de días y la lista de horarios deben tener exactamente la misma cantidad de elementos.');
    }

    // PASO 2: Buscar que el Turno de verdad exista en la base de datos.
    const turno = await this.turnoRepository.findOne({
      where: { turno_id: id_turno },
      relations: ['empleados']
    });

    if (!turno) {
      throw new NotFoundException('El Turno solicitado no existe.');
    }
    console.log(`[DEBUG] Turno ${id_turno} tiene ${turno.empleados?.length || 0} empleados asignados.`);

    // --- LOGICA DE AUDITORIA ---
    // 1. Obtener detalles antiguos
    const detallesAntiguos = await this.detalleTurnoRepository.find({
      where: { turno: { turno_id: id_turno } },
      relations: ['dia', 'horario']
    });

    // 2. Mapear horarios antiguos por código de día
    const mapaAntiguo = new Map<number, { entrada: string, salida: string, extension: string }>();
    detallesAntiguos.forEach(d => {
      mapaAntiguo.set(d.dia.cod_dia, {
        entrada: d.horario?.hora_entrada || '',
        salida: d.horario?.hora_salida || '',
        extension: 'Diario' // Por defecto según solicitud previa
      });
    });

    // 3. Preparar horarios nuevos para el Mapa
    const horariosNuevos = await this.horarioRepository.findBy({ horario_id: In(id_horario) });
    const mapaNuevo = new Map<number, { entrada: string, salida: string, extension: string }>();
    id_dia.forEach((diaId, index) => {
      const hId = id_horario[index];
      const hObj = horariosNuevos.find(h => h.horario_id === hId);
      if (hObj) {
        mapaNuevo.set(Number(diaId), { // Asegurar que sea número para coincidir con cod_dia
          entrada: hObj.hora_entrada,
          salida: hObj.hora_salida,
          extension: 'Diario'
        });
      }
    });

    // 4. Identificar cambios y generar logs
    const logsAuditoria: AuditoriaTurno[] = [];
    const diasSemana = [1, 2, 3, 4, 5, 6, 7]; // Lunes a Domingo

    diasSemana.forEach(codDia => {
      const ant = mapaAntiguo.get(codDia);
      const nue = mapaNuevo.get(codDia);

      console.log(`[DEBUG] Dia ${codDia}: ant:`, ant, 'nue:', nue);

      // Si hay cambio: solo si existía un horario anterior (para ignorar asignaciones iniciales)
      const huboCambio = ant && (
        !nue ||
        (ant.entrada !== nue.entrada || ant.salida !== nue.salida)
      );

      if (huboCambio) {
        console.log(`[DEBUG] Cambio detectado en dia ${codDia}!`);
        const diaNombre = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' }[codDia];

        const baseLogData = {
          hora_entrada: ant?.entrada || null,
          hora_salida: ant?.salida || null,
          extension_turno: ant ? 'Diario' : '',
          nuevo_hora_entrada: nue?.entrada || null,
          nuevo_hora_salida: nue?.salida || null,
          extension_nuevo_turno: nue ? 'Diario' : '',
          solicitador_cambio: usuario,
          inicio_turno: new Date(), // Fecha del cambio
          fecha_asignacion_turno: new Date(), // Fecha para que el reporte lo encuentre hoy
        };

        if (turno.empleados && turno.empleados.length > 0) {
          turno.empleados.forEach(emp => {
            const fechaAsigOriginal = emp.fecha_asignacion_turno ? new Date(emp.fecha_asignacion_turno).toLocaleDateString('es-CL') : 'N/A';
            logsAuditoria.push(this.auditoriaTurnoRepository.create({
              ...baseLogData,
              run_empleado: emp.num_ficha,
              observaciones: `${turno.nombre} - ${diaNombre} (Asig. Emp: ${fechaAsigOriginal})`
            }));
          });
        } else {
          // Fallback log para el turno si no hay empleados
          logsAuditoria.push(this.auditoriaTurnoRepository.create({
            ...baseLogData,
            run_empleado: null,
            observaciones: `${turno.nombre} - ${diaNombre} (Sin empleados asignados)`
          }));
        }
      }
    });

    if (logsAuditoria.length > 0) {
      await this.auditoriaTurnoRepository.save(logsAuditoria);
      console.log(`[DEBUG] Se guardaron ${logsAuditoria.length} registros de auditoría.`);
    }
    // --- FIN LOGICA DE AUDITORIA ---

    await this.detalleTurnoRepository.delete({ turno: { turno_id: id_turno } });

    if (id_dia.length === 0) {
      return {
        mensaje: 'Se han quitado todos los horarios de este turno.',
        turno_id: id_turno
      };
    }

    const dias = await this.semanaRepository.findBy({ cod_dia: In(id_dia) });
    const horarios = horariosNuevos; // Ya los tenemos

    // PASO 6: Combinar los datos.
    const nuevosDetallesAGuardar = id_dia.map((id_del_dia, indice) => {
      const id_del_horario = id_horario[indice];
      const diaEncontrado = dias.find(d => d.cod_dia === id_del_dia);
      const horarioEncontrado = horarios.find(h => h.horario_id === id_del_horario);

      if (!diaEncontrado || !horarioEncontrado) {
        throw new NotFoundException(`No existe el día con ID ${id_del_dia} o el horario con ID ${id_del_horario} en la base de datos.`);
      }

      return this.detalleTurnoRepository.create({
        turno: turno,
        dia: diaEncontrado,
        horario: horarioEncontrado
      });
    });

    await this.detalleTurnoRepository.save(nuevosDetallesAGuardar);

    return {
      mensaje: 'Los horarios han sido asignados y actualizados correctamente en el turno.',
      turno_id: id_turno
    };
  }

  async obtenerHorarioPorTurno(id_turno: number) {
    // 1. Buscamos el turno para validar que exista y obtener su información básica.
    const turno = await this.turnoRepository.findOne({
      where: { turno_id: id_turno }
    });

    if (!turno) {
      throw new NotFoundException('El Turno solicitado no existe.');
    }

    // 2. Buscamos todas las relaciones en detalle_turno que pertenezcan a este turno.
    // Usamos 'relations' para que nos traiga los objetos completos de Dia y Horario.
    const detalles = await this.detalleTurnoRepository.find({
      where: { turno: { turno_id: id_turno } },
      relations: ["turno", 'dia', 'horario'],
      order: {
        dia: { cod_dia: 'ASC' } // Opcional: Ordenar por día de la semana
      }
    });
    return detalles
  }

}
