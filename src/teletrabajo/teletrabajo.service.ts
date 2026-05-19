import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeletrabajoDto } from './dto/create-teletrabajo.dto';
import { UpdateTeletrabajoDto } from './dto/update-teletrabajo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Teletrabajo } from './entities/teletrabajo.entity';
import { Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { DetalleTurno } from 'src/detalle-turno/entities/detalle-turno.entity';
import { AsignacionTurnoRotativo } from 'src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';
import { Empresa } from 'src/empresas/empresas.entity';
import { Horario } from 'src/horario/entities/horario.entity';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');
@Injectable()
export class TeletrabajoService {
  constructor(
    @InjectRepository(Teletrabajo)
    private readonly teletrabajoRepository: Repository<Teletrabajo>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(DetalleTurno)
    private readonly detalleTurnoRepository: Repository<DetalleTurno>,
    @InjectRepository(AsignacionTurnoRotativo)
    private readonly asignacionTurnoRotativoRepository: Repository<AsignacionTurnoRotativo>,
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) { }


  async asignarTeletrabajo(idEmpleado: number, fecha_inicio: string, fecha_fin: string, idUsuario?: number, ip?: string, userAgent?: string) {
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: idEmpleado },
      relations: { turno: true }
    });

    if (!empleado) {
      throw new NotFoundException("Empleado no encontrado");
    }
    if (fecha_inicio > fecha_fin) {
      throw new NotFoundException("La fecha de inicio debe ser menor a la fecha de fin");
    }

    if (!empleado.turno && !empleado.permite_rotativo) {
      throw new NotFoundException("El empleado no tiene turno asignado");
    }

    const getFechaLocal = (f: any) => {
      if (typeof f === 'string' && f.includes('-')) {
        const parts = f.split('T')[0].split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts.map(Number);
          return new Date(y, m - 1, d, 0, 0, 0, 0);
        }
      }
      const d = new Date(f);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
    };

    let fechaActual = getFechaLocal(fecha_inicio);
    const fechaTermino = getFechaLocal(fecha_fin);
    let totalExitos = 0;
    let fechaExistente: string | null = null;
    let fechaDescanso: string | null = null;

    // --- CASO: TURNO NORMAL ---
    if (!empleado?.permite_rotativo && empleado?.turno) {
      const id_turno = empleado.turno?.turno_id;
      const datos = await this.detalleTurnoRepository.find({
        where: { turno: { turno_id: id_turno } },
        relations: { dia: true, horario: true, turno: true }
      });

      if (datos.length === 0) {
        throw new NotFoundException("El turno no cuenta con horarios asignados");
      }

      let fechaValidacion = new Date(fechaActual);

      while (fechaValidacion.getTime() <= fechaTermino.getTime()) {
        const fechaString = fechaValidacion.toLocaleDateString('en-CA');
        const diaNum = fechaValidacion.getDay() || 7;
        const detalleDia = datos.find((d) => d.dia.cod_dia === diaNum);

        if (!detalleDia) {
          if (!fechaDescanso) fechaDescanso = fechaString;
          if (fecha_inicio === fecha_fin) {
            throw new NotFoundException(`No tiene horario asignado para el día ${fechaString}`);
          }
        } else {
          const existe = await this.teletrabajoRepository.findOne({
            where: {
              id_empleado: { empleado_id: idEmpleado },
              fecha_actual: new Date(fechaValidacion),
            },
          });

          if (existe) {
            if (!fechaExistente) fechaExistente = fechaString;
            if (fecha_inicio === fecha_fin) {
              throw new NotFoundException(`Ya existe un registro de teletrabajo para la fecha ${fechaString}`);
            }
          } else {
            const nuevoRegistro = this.teletrabajoRepository.create({
              id_empleado: empleado,
              fecha_actual: new Date(fechaValidacion),
              horario_id: { horario_id: detalleDia.horario.horario_id } as any,
            });
            await this.teletrabajoRepository.save(nuevoRegistro);
            totalExitos++;
          }
        }
        fechaValidacion.setDate(fechaValidacion.getDate() + 1);
        fechaValidacion.setHours(0, 0, 0, 0);
      }
    }

    // --- CASO: TURNO ROTATIVO ---
    else if (empleado?.permite_rotativo && !empleado?.turno) {
      const datos = await this.asignacionTurnoRotativoRepository.find({
        where: { empleado: { empleado_id: idEmpleado } }, relations: { horario: true }
      });

      if (datos.length === 0) {
        throw new NotFoundException("El empleado no tiene turno rotativo asignado");
      }
      let fechaValidacion = new Date(fechaActual);

      while (fechaValidacion.getTime() <= fechaTermino.getTime()) {
        const fechaBucle = fechaValidacion.toLocaleDateString('en-CA');
        const registroActual = datos.find(
          (item) => item.fecha_inicio_turno.toISOString().split('T')[0] === fechaBucle,
        );

        // Validaciones estrictas solo si es un solo día seleccionado
        if (fecha_inicio === fecha_fin) {
          if (!registroActual) {
            throw new NotFoundException(`No tiene turno asignado para la fecha ${fechaBucle}`);
          }
          if (registroActual.horario === null) {
            throw new NotFoundException(`El empleado presenta dia de descanso para la fecha ${fechaBucle}`);
          }
          if (registroActual.teletrabajo) {
            throw new NotFoundException(`Ya existe un registro de teletrabajo para la fecha ${fechaBucle}`);
          }
        }

        // Captura de motivos de fallo para el mensaje final si nada resulta exitoso
        if (registroActual) {
          if (registroActual.teletrabajo && !fechaExistente) {
            fechaExistente = fechaBucle;
          }
          if (registroActual.horario === null && !fechaDescanso) {
            fechaDescanso = fechaBucle;
          }
        }

        // Lógica de procesamiento
        if (registroActual && registroActual.horario !== null && !registroActual.teletrabajo) {
          await this.asignacionTurnoRotativoRepository.update(registroActual.id, {
            teletrabajo: true,
          });
          totalExitos++;
        }

        fechaValidacion.setDate(fechaValidacion.getDate() + 1);
        fechaValidacion.setHours(0, 0, 0, 0);
      }
    }

    if (totalExitos === 0) {
      if (fechaExistente) {
        throw new NotFoundException(`La fecha ${fechaExistente} ya presenta teletrabajo`);
      }
      if (fechaDescanso) {
        throw new NotFoundException(`El empleado presenta descanso en la fecha ${fechaDescanso}`);
      }
      throw new NotFoundException("No presenta horario para los dias seleccionados");
    }

    // --- AUDITORÍA ---
    if (totalExitos > 0 && idUsuario && !isNaN(idUsuario)) {
      const autor = await this.teletrabajoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.teletrabajoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.teletrabajoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha asignado teletrabajo al empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) desde el ${fecha_inicio} al ${fecha_fin}. Se asignaron ${totalExitos} días.`,
          tipo_evento: 'Asignación Teletrabajo',
          ip: ip || 'Desconocida',
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.teletrabajoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: `Procesamiento completado. Se asignaron ${totalExitos} días correctamente.`
    };
  }


  async tieneTeletrabajo(runEmpleado: string) {
    const empleados = await this.empleadoRepository.find({
      where: { run: runEmpleado }
    });
    if (empleados.length === 0) {
      throw new NotFoundException("Empleado no encontrado");
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    for (const emp of empleados) {
      const teletrabajo = await this.teletrabajoRepository.findOne({
        where: {
          id_empleado: { empleado_id: emp.empleado_id },
          fecha_actual: hoy
        }
      });
      if (teletrabajo) return teletrabajo;
      const rotativoAsignado = await this.asignacionTurnoRotativoRepository.findOne({
        where: {
          empleado: { empleado_id: emp.empleado_id },
          teletrabajo: true,
          fecha_inicio_turno: hoy
        }
      });
      if (rotativoAsignado) return rotativoAsignado;
    }
    throw new NotFoundException("No tiene teletrabajo asignado para el día de hoy");
  }

  async obtenerTeletrabajos(idEmpresa: number, page: number = 1, limit: number = 10) {
    const empresa = await this.empresaRepository.findOne({ where: { empresa_id: idEmpresa } });
    if (!empresa) {
      throw new NotFoundException("Empresa no encontrada");
    }

    // Buscamos todos los empleados de la empresa
    const empleados = await this.empleadoRepository.find({
      where: { empresa: { empresa_id: idEmpresa } },
      relations: {
        turno: true,
        cenco: true
      },
      order: { apellido_paterno: 'ASC' }
    });

    const resultados: any[] = [];

    for (const emp of empleados) {
      let tieneTeletrabajo = false;

      // 1. Verificamos teletrabajo en turno normal
      if (!emp.permite_rotativo && emp.turno) {
        const count = await this.teletrabajoRepository.count({
          where: { id_empleado: { empleado_id: emp.empleado_id } }
        });
        if (count > 0) tieneTeletrabajo = true;
      }

      // 2. Verificamos teletrabajo en turno rotativo
      if (!tieneTeletrabajo && emp.permite_rotativo) {
        const count = await this.asignacionTurnoRotativoRepository.count({
          where: {
            empleado: { empleado_id: emp.empleado_id },
            teletrabajo: true
          }
        });
        if (count > 0) tieneTeletrabajo = true;
      }

      if (tieneTeletrabajo) {
        resultados.push(emp);
      }
    }

    // Aplicamos paginación manual sobre el array de resultados
    const total = resultados.length;
    const skip = (page - 1) * limit;
    const dataPaginada = resultados.slice(skip, skip + limit);

    return {
      data: dataPaginada,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit)
    };
  }


  async obtenerTeletrabajosPorEmpleado(idEmpleado: number, page: number = 1, limit: number = 10) {
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: idEmpleado },
      relations: {
        turno: true,
        cenco: true
      }
    });

    if (!empleado) {
      throw new NotFoundException("Empleado no encontrado");
    }

    const skip = (page - 1) * limit;
    let data: any[] = [];
    let total = 0;

    // 1. Teletrabajo en turno normal (registros en tabla teletrabajo)
    if (!empleado.permite_rotativo && empleado.turno) {
      const [teletrabajos, count] = await this.teletrabajoRepository.findAndCount({
        where: { id_empleado: { empleado_id: empleado.empleado_id } },
        relations: ['horario_id'],
        order: { fecha_actual: 'DESC' },
        skip,
        take: limit
      });
      data = teletrabajos;
      total = count;
    }

    // 2. Teletrabajo en turno rotativo (campo teletrabajo en asignacion_turno_rotativo)
    if (empleado.permite_rotativo) {
      const [asignaciones, count] = await this.asignacionTurnoRotativoRepository.findAndCount({
        where: {
          empleado: { empleado_id: empleado.empleado_id },
          teletrabajo: true
        },
        relations: ['horario'],
        order: { fecha_inicio_turno: 'DESC' },
        skip,
        take: limit
      });
      data = asignaciones;
      total = count;
    }

    if (total > 0) {
      return {
        empleado,
        data,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      };
    }

    return { message: "El empleado no tiene teletrabajo asignado", data: [], total: 0 };
  }



  async editarTeletrabajo(idEmpleado: number, id: number, horarioId: number, idUsuario?: number, ip?: string, userAgent?: string) {
    // 1. Cargamos al empleado con su relación de turno para saber qué tipo de horario usa
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: idEmpleado },
      relations: { turno: true }
    });

    if (!empleado) {
      throw new NotFoundException("Empleado no encontrado");
    }

    // --- CASO: TURNO NORMAL ---
    if (!empleado.permite_rotativo && empleado.turno) {
      const teletrabajo = await this.teletrabajoRepository.findOne({
        where: {
          id: id,
          id_empleado: { empleado_id: idEmpleado }
        }
      });

      if (!teletrabajo) {
        throw new NotFoundException("Registro de teletrabajo no encontrado");
      }

      const update = await this.teletrabajoRepository.update(id, {
        horario_id: { horario_id: horarioId } as any,
      });

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.teletrabajoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.teletrabajoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent || '');
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          // Buscamos el horario para mostrar las horas en el log
          const infoHorario = await this.teletrabajoRepository.manager.findOne(Horario, {
            where: { horario_id: horarioId }
          });

          const registroEvento = this.teletrabajoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha modificado el teletrabajo (Normal) del empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) para la fecha ${teletrabajo.fecha_actual?.toISOString().split('T')[0] || 'N/A'}, asignando el nuevo horario: ${infoHorario?.hora_entrada || 'N/A'} - ${infoHorario?.hora_salida || 'N/A'}.`,
            tipo_evento: 'Modificación Teletrabajo',
            ip: ip || 'Desconocida',
            fecha: new Date(),
            hora: new Date().toTimeString().split(' ')[0],
            sistema_operativo: parser.getOS().name || 'Desconocido',
            browser: navegador,
            empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
            depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
            cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
            rut: autor?.run_usuario
          });

          await this.teletrabajoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        message: "Teletrabajo (Normal) actualizado correctamente",
        update
      };
    }

    // --- CASO: TURNO ROTATIVO ---
    if (empleado.permite_rotativo) {
      const turnoRotativo = await this.asignacionTurnoRotativoRepository.findOne({
        where: {
          id: id,
          empleado: { empleado_id: idEmpleado }
        }
      });

      if (!turnoRotativo) {
        throw new NotFoundException("Asignación de turno rotativo no encontrada");
      }

      const update = await this.asignacionTurnoRotativoRepository.update(id, {
        horario: { horario_id: horarioId } as any
      });

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.teletrabajoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.teletrabajoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent || '');
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          // Buscamos el horario para mostrar las horas en el log
          const infoHorario = await this.teletrabajoRepository.manager.findOne(Horario, {
            where: { horario_id: horarioId }
          });

          const registroEvento = this.teletrabajoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha modificado el teletrabajo (Rotativo) del empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) para la fecha ${turnoRotativo.fecha_inicio_turno?.toISOString().split('T')[0] || 'N/A'}, asignando el nuevo horario: ${infoHorario?.hora_entrada || 'N/A'} - ${infoHorario?.hora_salida || 'N/A'}.`,
            tipo_evento: 'Modificación Teletrabajo',
            ip: ip || 'Desconocida',
            fecha: new Date(),
            hora: new Date().toTimeString().split(' ')[0],
            sistema_operativo: parser.getOS().name || 'Desconocido',
            browser: navegador,
            empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
            depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
            cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
            rut: autor?.run_usuario
          });

          await this.teletrabajoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        message: "Turno rotativo actualizado correctamente",
        update
      };
    }

    throw new NotFoundException("El empleado no tiene un tipo de turno válido para editar");
  }

  async eliminarTeletrabajo(idEmpleado: number, id: number, idUsuario?: number, ip?: string, userAgent?: string) {
    // 1. Identificamos al empleado y su tipo de turno
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: idEmpleado },
      relations: { turno: true }
    });

    if (!empleado) {
      throw new NotFoundException("Empleado no encontrado");
    }

    // --- CASO: TURNO NORMAL ---
    if (!empleado.permite_rotativo && empleado.turno) {
      const teletrabajo = await this.teletrabajoRepository.findOne({
        where: {
          id: id,
          id_empleado: { empleado_id: idEmpleado }
        }
      });

      if (!teletrabajo) {
        throw new NotFoundException("Registro de teletrabajo no encontrado");
      }

      await this.teletrabajoRepository.delete(id);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.teletrabajoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.teletrabajoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent || '');
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.teletrabajoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha eliminado el teletrabajo (Normal) del empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) correspondiente a la fecha ${teletrabajo.fecha_actual?.toISOString().split('T')[0] || 'N/A'}.`,
            tipo_evento: 'Eliminación Teletrabajo',
            ip: ip || 'Desconocida',
            fecha: new Date(),
            hora: new Date().toTimeString().split(' ')[0],
            sistema_operativo: parser.getOS().name || 'Desconocido',
            browser: navegador,
            empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
            depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
            cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
            rut: autor?.run_usuario
          });

          await this.teletrabajoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return { message: "Registro de teletrabajo eliminado correctamente" };
    }

    // --- CASO: TURNO ROTATIVO ---
    if (empleado.permite_rotativo) {
      const turnoRotativo = await this.asignacionTurnoRotativoRepository.findOne({
        where: {
          id: id,
          empleado: { empleado_id: idEmpleado }
        }
      });

      if (!turnoRotativo) {
        throw new NotFoundException("Asignación de turno rotativo no encontrada");
      }

      await this.asignacionTurnoRotativoRepository.update(id, {
        teletrabajo: false
      });

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.teletrabajoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.teletrabajoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent || '');
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.teletrabajoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha eliminado el teletrabajo (Rotativo) del empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) correspondiente a la fecha ${turnoRotativo.fecha_inicio_turno?.toISOString().split('T')[0] || 'N/A'}.`,
            tipo_evento: 'Eliminación Teletrabajo',
            ip: ip || 'Desconocida',
            fecha: new Date(),
            hora: new Date().toTimeString().split(' ')[0],
            sistema_operativo: parser.getOS().name || 'Desconocido',
            browser: navegador,
            empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
            depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
            cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
            rut: autor?.run_usuario
          });

          await this.teletrabajoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return { message: "Teletrabajo removido del turno rotativo correctamente" };
    }

    throw new NotFoundException("No se pudo determinar el tipo de turno para eliminar");
  }
}
