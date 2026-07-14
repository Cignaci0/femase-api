import { Injectable, Logger } from '@nestjs/common';
import { CreateAutorizaHorasExtraDto } from './dto/create-autoriza_horas_extra.dto';
import { UpdateAutorizaHorasExtraDto } from './dto/update-autoriza_horas_extra.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AutorizaHorasExtra } from './entities/autoriza_horas_extra.entity';
import { Between, Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Marca } from 'src/marcas/entities/marca.entity';
import { Turno } from 'src/turno/entities/turno.entity';
import { AsignacionTurnoRotativo } from 'src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AutorizaHorasExtrasService {
  private readonly logger = new Logger(AutorizaHorasExtrasService.name);

  constructor(
    @InjectRepository(AutorizaHorasExtra)
    private readonly autorizaHorasExtrasRepository: Repository<AutorizaHorasExtra>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Marca)
    private readonly marcaRepository: Repository<Marca>,
    @InjectRepository(AsignacionTurnoRotativo)
    private readonly asignacionTurnoRotativoRepository: Repository<AsignacionTurnoRotativo>,
  ) { }

  async create(numFicha: string, fechaEvaluar?: Date) {
    const empleado = await this.empleadoRepository.findOne({
      where: { num_ficha: numFicha },
      relations: ['cargo', 'turno', 'turno.detalle_turno', 'turno.detalle_turno.dia', 'turno.detalle_turno.horario']
    })

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    if (empleado.turno === null && empleado.permite_rotativo === false) {
      throw new Error('Empleado no posee turno asignado')
    }

    // 1. DETERMINAR LA FECHA A EVALUAR
    // Si se pasa una fecha (ej: ayer desde el cron), se usa esa. Si no, se usa hoy.
    const dia_actual = fechaEvaluar ? new Date(fechaEvaluar) : new Date();
    const diaSemana = dia_actual.getDay()
    const diaEnNumero = diaSemana === 0 ? 7 : diaSemana;
    
    // Obtener la fecha en formato YYYY-MM-DD local
    const tzOffset = dia_actual.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dia_actual.getTime() - tzOffset)).toISOString().slice(0, 10);
    const fechaHoyString = localISOTime; 

    const parseTime = (timeStr?: string) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours + (minutes || 0) / 60;
    };

    const formatHoursToTimeString = (decimalHours: number): string => {
      const absoluteHours = Math.floor(decimalHours);
      const minutes = Math.floor((decimalHours - absoluteHours) * 60);
      const seconds = Math.round(((decimalHours - absoluteHours) * 60 - minutes) * 60);

      const pad = (num: number) => num.toString().padStart(2, '0');

      return `${pad(absoluteHours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    // Función auxiliar para obtener el string YYYY-MM-DD local de cualquier Date o string
    const getLocalString = (date: any) => {
      if (typeof date === 'string') return date.substring(0, 10);
      if (date instanceof Date) {
        const offset = date.getTimezoneOffset() * 60000;
        return (new Date(date.getTime() - offset)).toISOString().slice(0, 10);
      }
      return '';
    };

    // Crear rango de todo el día para consultas en BD
    const fechaInicioDia = new Date(fechaHoyString + 'T00:00:00');
    const fechaFinDia = new Date(fechaHoyString + 'T23:59:59.999');

    // 2. LIMPIAR REGISTROS PENDIENTES DEL DÍA
    const existeRegistro = await this.autorizaHorasExtrasRepository.findOne({
      where: {
        fecha_marca: Between(fechaInicioDia, fechaFinDia),
        empleado: { empleado_id: empleado.empleado_id }
      }
    })

    if (existeRegistro) {
      if (existeRegistro.estado === "P") {
        await this.autorizaHorasExtrasRepository.delete(existeRegistro.id);
      } else {
        return; // Si ya está Aprobado ('A') o Rechazado, no recalculamos para no alterar la decisión del supervisor ni duplicar
      }
    }

    // 3. OBTENER HORARIO TEÓRICO (Para saber si es turno nocturno)
    let horaEntradaTeorica: string | null = null;
    let horaSalidaTeorica: string | null = null;

    const turnoNormal = empleado.turno?.detalle_turno?.find(t => t.dia?.cod_dia === diaEnNumero)
    
    if (turnoNormal) {
      horaEntradaTeorica = turnoNormal.horario.hora_entrada;
      horaSalidaTeorica = turnoNormal.horario.hora_salida;
    } else if (empleado.turno === null && empleado.permite_rotativo === true) {
      const turnoRotativo = await this.asignacionTurnoRotativoRepository.findOne({
        where: {
          empleado: { empleado_id: empleado.empleado_id },
          fecha_inicio_turno: Between(fechaInicioDia, fechaFinDia),
        },
        relations: ['horario', 'empleado', 'empleado.cargo']
      })
      if (turnoRotativo) {
        horaEntradaTeorica = turnoRotativo.horario.hora_entrada;
        horaSalidaTeorica = turnoRotativo.horario.hora_salida;
      }
    }

    if (!horaEntradaTeorica || !horaSalidaTeorica) {
      return; // No hay turno teórico para evaluar
    }

    const realEntradaTeorica = parseTime(horaEntradaTeorica);
    const realSalidaTeorica = parseTime(horaSalidaTeorica);
    
    // Si sale a una hora menor a la que entró (ej 06:00 < 22:00), es nocturno
    const esTurnoNocturno = realSalidaTeorica < realEntradaTeorica;
    const horaTeorica = esTurnoNocturno ? (24 - realEntradaTeorica + realSalidaTeorica) : (realSalidaTeorica - realEntradaTeorica);

    // 4. DEFINIR VENTANA DE BÚSQUEDA DE MARCAS
    const fechaInicioBusqueda = new Date(fechaInicioDia);
    const fechaFinBusqueda = new Date(fechaFinDia);
    
    if (esTurnoNocturno) {
      // Ampliamos la búsqueda hasta las 14:00 del día siguiente para capturar la salida
      fechaFinBusqueda.setDate(fechaFinBusqueda.getDate() + 1);
      fechaFinBusqueda.setHours(14, 0, 0, 0);
    }

    const tieneMarcas = await this.marcaRepository.find({
      where: {
        num_ficha: numFicha,
        fecha_marca: Between(fechaInicioBusqueda, fechaFinBusqueda)
      }
    })

    if (tieneMarcas.length === 0) return;

    // Ordenar cronológicamente comparando fecha y hora reales
    const marcasOrdenadas = tieneMarcas.sort((a, b) => {
      const dateA = new Date(`${getLocalString(a.fecha_marca)}T${a.hora_marca}`);
      const dateB = new Date(`${getLocalString(b.fecha_marca)}T${b.hora_marca}`);
      return dateA.getTime() - dateB.getTime();
    });

    const marcasEntrada = marcasOrdenadas.filter(m => m.evento == 1);
    const marcasSalida = marcasOrdenadas.filter(m => m.evento == 2);

    if (marcasEntrada.length > 0 && marcasSalida.length > 0) {
      // 5. IDENTIFICAR ENTRADA Y SALIDA VÁLIDAS
      // Entrada: primera entrada que pertenezca al día evaluado
      const marcasEntradaHoy = marcasEntrada.filter(m => getLocalString(m.fecha_marca) === fechaHoyString);
      if (marcasEntradaHoy.length === 0) return; // No marcó entrada en su día de turno

      const primeraEntrada = marcasEntradaHoy[0];
      const dtPrimeraEntrada = new Date(`${getLocalString(primeraEntrada.fecha_marca)}T${primeraEntrada.hora_marca}`);

      let ultimaSalida: Marca | null = null;
      let dtUltimaSalida: Date | null = null;

      if (esTurnoNocturno) {
        // Última salida que haya ocurrido DESPUÉS de la primera entrada
        const salidasValidas = marcasSalida.filter(m => {
          const dt = new Date(`${getLocalString(m.fecha_marca)}T${m.hora_marca}`);
          return dt.getTime() > dtPrimeraEntrada.getTime();
        });
        if (salidasValidas.length > 0) {
          ultimaSalida = salidasValidas[salidasValidas.length - 1];
          dtUltimaSalida = new Date(`${getLocalString(ultimaSalida.fecha_marca)}T${ultimaSalida.hora_marca}`);
        }
      } else {
        // Última salida que ocurra en el mismo día evaluado
        const salidasValidas = marcasSalida.filter(m => getLocalString(m.fecha_marca) === fechaHoyString);
        if (salidasValidas.length > 0) {
          ultimaSalida = salidasValidas[salidasValidas.length - 1];
          dtUltimaSalida = new Date(`${getLocalString(ultimaSalida.fecha_marca)}T${ultimaSalida.hora_marca}`);
        }
      }

      if (!ultimaSalida || !dtUltimaSalida) return; // No hay salida válida

      const marcaEntrada = primeraEntrada.hora_marca;
      const marcaSalida = ultimaSalida.hora_marca;
      const fecha_marca_registro = primeraEntrada.fecha_marca; // Usamos la fecha de la entrada

      // 6. CALCULAR HORAS TRABAJADAS Y DESCONTAR GAPS
      let horas_trabajadas = (dtUltimaSalida.getTime() - dtPrimeraEntrada.getTime()) / (1000 * 60 * 60);

      // Filtrar las marcas intermedias (sólo las que ocurrieron entre la primera entrada y la última salida)
      const marcasIntermedias = marcasOrdenadas.filter(m => {
        const dt = new Date(`${getLocalString(m.fecha_marca)}T${m.hora_marca}`);
        return dt.getTime() >= dtPrimeraEntrada.getTime() && dt.getTime() <= dtUltimaSalida.getTime();
      });

      let isOut = false;
      let dtOut: Date | null = null;
      let totalGapsDec = 0;

      for (const m of marcasIntermedias) {
        const dt = new Date(`${getLocalString(m.fecha_marca)}T${m.hora_marca}`);
        if (m.evento == 2) { // Salida
          if (!isOut) {
            isOut = true;
            dtOut = dt;
          }
        } else if (m.evento == 1) { // Entrada
          if (isOut && dtOut) {
            const gap = (dt.getTime() - dtOut.getTime()) / (1000 * 60 * 60);
            totalGapsDec += gap;
            isOut = false;
          }
        }
      }

      horas_trabajadas -= totalGapsDec;

      // 7. REGISTRAR HORAS EXTRAS SI CORRESPONDE
      if (horas_trabajadas > horaTeorica) {
        await this.autorizaHorasExtrasRepository.save({
          cargo: empleado.cargo,
          fecha_marca: fecha_marca_registro,
          hora_entrada: marcaEntrada,
          hora_salida: marcaSalida,
          hora_entrada_teorica: horaEntradaTeorica,
          hora_salida_teorica: horaSalidaTeorica,
          duracion_turno: formatHoursToTimeString(horaTeorica),
          horas_presenciales: formatHoursToTimeString(horas_trabajadas),
          observacion: 'Posee horas extras por confirmar',
          horas_extras: formatHoursToTimeString(horas_trabajadas - horaTeorica),
          estado: 'P',
          empleado: { empleado_id: empleado.empleado_id }
        })
      }
    }
  }

  findAll(numFicha: string, fecha_inicio: Date, fecha_fin: Date) {
    return this.autorizaHorasExtrasRepository.find({
      relations: ['cargo'],
      where: {
        empleado: { num_ficha: numFicha },
        fecha_marca: Between(fecha_inicio, fecha_fin)
      },
      select: {
        cargo: {
          cargo_id: true,
          nombre: true,
        }
      }
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} autorizaHorasExtra`;
  }

  async update(id: number, updateAutorizaHorasExtraDto: UpdateAutorizaHorasExtraDto) {
    const { multiplicador, horas_extras: horasEnviadas, ...restDto } = updateAutorizaHorasExtraDto;

    // Si se está aprobando y viene un multiplicador desde el frontend
    if (restDto.estado === 'A' && multiplicador) {
      let baseHoras = horasEnviadas;

      // Si el supervisor no envió horas recortadas, buscamos las originales ("crudas") en la base de datos
      if (!baseHoras) {
        const registro = await this.autorizaHorasExtrasRepository.findOne({ where: { id } });
        if (registro && registro.horas_extras) {
          baseHoras = registro.horas_extras;
        }
      }
      
      if (baseHoras) {
        // Convertimos el "HH:MM:SS" base a formato decimal
        const parts = baseHoras.split(':').map(Number);
        const hours = parts[0] || 0;
        const minutes = parts[1] || 0;
        const seconds = parts[2] || 0;
        const decimalHours = hours + (minutes / 60) + (seconds / 3600);

        // Aplicamos el multiplicador (ej: 1.5 o 2) a las horas base elegidas
        const multipliedHours = decimalHours * multiplicador;

        // Volvemos a formatear a "HH:MM:SS"
        const absoluteHours = Math.floor(multipliedHours);
        const finalMinutes = Math.floor((multipliedHours - absoluteHours) * 60);
        const finalSeconds = Math.round(((multipliedHours - absoluteHours) * 60 - finalMinutes) * 60);
        const pad = (num: number) => num.toString().padStart(2, '0');
        
        // Adjuntamos las horas ya multiplicadas al objeto que se va a guardar
        (restDto as any).horas_extras = `${pad(absoluteHours)}:${pad(finalMinutes)}:${pad(finalSeconds)}`;
      }
    } else if (horasEnviadas) {
      // Si no están aprobando con multiplicador pero de todas formas mandan horas_extras, se las guardamos
      (restDto as any).horas_extras = horasEnviadas;
    }

    if (restDto.estado === 'A') {
      (restDto as any).observacion = 'Horas extras autorizadas';
    } else if (restDto.estado === 'R') {
      (restDto as any).observacion = 'Horas extras denegadas';
    }

    return this.autorizaHorasExtrasRepository.update(id, restDto as any);
  }

  remove(id: number) {
    return `This action removes a #${id} autorizaHorasExtra`;
  }

  // Cron que se ejecuta cada hora para procesar el día anterior
  @Cron('* * * * *')
  async handleCron() {
    this.logger.log('Iniciando procesamiento automático de horas extras...');

    // Evaluamos ayer (para turnos nocturnos) y hoy (para turnos diurnos que ya terminaron)
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    
    const hoy = new Date();

    try {
      // Obtenemos todos los empleados que tengan un número de ficha asignado
      const empleados = await this.empleadoRepository.find({
        select: { num_ficha: true }
      }); 

      this.logger.log(`Procesando horas extras para ${empleados.length} empleados.`);

      for (const emp of empleados) {
        if (!emp.num_ficha) continue;
        try {
          // Ejecuta el cálculo diario para ayer y hoy
          await this.create(emp.num_ficha, ayer);
          await this.create(emp.num_ficha, hoy);
        } catch (error) {
          this.logger.error(`Error al procesar horas extras para el empleado ${emp.num_ficha}: ${error.message}`);
        }
      }

      this.logger.log('Procesamiento de horas extras finalizado con éxito.');
    } catch (err) {
      this.logger.error(`Error general en el cron de horas extras: ${err.message}`);
    }
  }
}
