import { Injectable } from '@nestjs/common';
import { CreateAutorizaHorasExtraDto } from './dto/create-autoriza_horas_extra.dto';
import { UpdateAutorizaHorasExtraDto } from './dto/update-autoriza_horas_extra.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AutorizaHorasExtra } from './entities/autoriza_horas_extra.entity';
import { Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Marca } from 'src/marcas/entities/marca.entity';
import { Turno } from 'src/turno/entities/turno.entity';
import { AsignacionTurnoRotativo } from 'src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';

@Injectable()
export class AutorizaHorasExtrasService {
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

  async create(numFicha: string) {
    const empleado = await this.empleadoRepository.findOne({
      where: { num_ficha: numFicha },
      relations: ['cargo', 'turno', 'turno.detalle_turno', 'turno.detalle_turno.dia', 'turno.detalle_turno.horario']
    })

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    const dia_actual = new Date()
    const diaSemana = dia_actual.getDay()
    const diaEnNumero = diaSemana === 0 ? 7 : diaSemana;

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
    
    // Consultar marcas de hoy para el empleado
    const tieneMarcas = await this.marcaRepository.find({
      where: [{
        num_ficha: numFicha,
      },
      {
        fecha_marca: dia_actual
      }]
    })

    if (empleado.turno === null && empleado.permite_rotativo === false) {
      throw new Error('Empleado no posee turno asignado')
    }

    // FILTRAR MARCAS DEL DIA Y ORDENARLAS CRONOLOGICAMENTE
    const fechaHoy = dia_actual.toISOString().split('T')[0];
    const marcasHoy = tieneMarcas
      .filter(m => m.fecha_marca.toISOString().split('T')[0] === fechaHoy)
      .sort((a, b) => a.hora_marca.localeCompare(b.hora_marca));

    const marcasEntrada = marcasHoy.filter(m => m.evento == 1);
    const marcasSalida = marcasHoy.filter(m => m.evento == 2);

    if (marcasEntrada.length > 0 && marcasSalida.length > 0) {
      // Tomamos la primera entrada y la última salida absoluta
      const marcaEntrada = marcasEntrada[0].hora_marca;
      const marcaSalida = marcasSalida[marcasSalida.length - 1].hora_marca;
      const fecha_marca = tieneMarcas[0].fecha_marca;

      const realEntrada = parseTime(marcaEntrada);
      const realSalida = parseTime(marcaSalida);
      let horas_trabajadas = realSalida >= realEntrada ? (realSalida - realEntrada) : (24 - realEntrada + realSalida);

      // Calcular la suma de todos los intervalos inactivos (Gaps) 
      // entre una Salida y la siguiente Entrada (Ej: Salida 11, Entrada 12 -> 1 hr)
      let isOut = false;
      let outTime = 0;
      let totalGaps = 0;

      for (const m of marcasHoy) {
        const time = parseTime(m.hora_marca);
        if (m.evento == 2) { // Salida
          if (!isOut) {
            isOut = true;
            outTime = time;
          }
        } else if (m.evento == 1) { // Entrada
          if (isOut) {
            const gap = time >= outTime ? (time - outTime) : (24 - outTime + time);
            totalGaps += gap;
            isOut = false;
          }
        }
      }

      // Restar los huecos inactivos a la jornada total
      horas_trabajadas -= totalGaps;

      // CALCULAR HORAS TEORICAS
      const turnoNormal = empleado.turno?.detalle_turno?.find(t => t.dia?.cod_dia === diaEnNumero)
      if (turnoNormal) {
        const entrada = parseTime(turnoNormal.horario.hora_entrada);
        const salida = parseTime(turnoNormal.horario.hora_salida);
        const horaTeorica = salida >= entrada ? (salida - entrada) : (24 - entrada + salida);

        if (horas_trabajadas > horaTeorica) {
          await this.autorizaHorasExtrasRepository.save({
            cargo: empleado.cargo,
            fecha_marca: fecha_marca,
            hora_entrada: marcaEntrada,
            hora_salida: marcaSalida,
            hora_entrada_teorica: turnoNormal.horario.hora_entrada,
            hora_salida_teorica: turnoNormal.horario.hora_salida,
            duracion_turno: formatHoursToTimeString(horaTeorica),
            horas_presenciales: formatHoursToTimeString(horas_trabajadas),
            observacion: 'Posee horas extras por confirmar',
            horas_extras: formatHoursToTimeString(horas_trabajadas - horaTeorica),
            estado: 'P'
          })
        }
      } else if (empleado.turno === null && empleado.permite_rotativo === true) {
        const turnoRotativo = await this.asignacionTurnoRotativoRepository.findOne({
          where: {
            empleado: { empleado_id: empleado.empleado_id },
            fecha_inicio_turno: fecha_marca,
          },
          relations: ['horario', 'empleado', 'empleado.cargo']
        })
        if (turnoRotativo) {
          const entrada = parseTime(turnoRotativo.horario.hora_entrada);
          const salida = parseTime(turnoRotativo.horario.hora_salida);
          const horaTeorica = salida >= entrada ? (salida - entrada) : (24 - entrada + salida);

          if (horas_trabajadas > horaTeorica) {
            await this.autorizaHorasExtrasRepository.save({
              cargo: empleado.cargo,
              fecha_marca: fecha_marca,
              hora_entrada: marcaEntrada,
              hora_salida: marcaSalida,
              hora_entrada_teorica: turnoRotativo.horario.hora_entrada,
              hora_salida_teorica: turnoRotativo.horario.hora_salida,
              duracion_turno: formatHoursToTimeString(horaTeorica),
              horas_presenciales: formatHoursToTimeString(horas_trabajadas),
              observacion: 'Posee horas extras por confirmar',
              horas_extras: formatHoursToTimeString(horas_trabajadas - horaTeorica),
              estado: 'P'
            })
          }
        }
      }
    }
  }

  findAll() {
    return this.autorizaHorasExtrasRepository.find({
      relations: ['cargo'],
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

  update(id: number, updateAutorizaHorasExtraDto: UpdateAutorizaHorasExtraDto) {
    return `This action updates a #${id} autorizaHorasExtra`;
  }

  remove(id: number) {
    return `This action removes a #${id} autorizaHorasExtra`;
  }
}
