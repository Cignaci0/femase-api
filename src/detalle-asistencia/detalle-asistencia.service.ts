import { Injectable, HttpException } from '@nestjs/common';
import { CreateDetalleAsistenciaDto } from './dto/create-detalle-asistencia.dto';
import { UpdateDetalleAsistenciaDto } from './dto/update-detalle-asistencia.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DetalleAsistencia } from './entities/detalle-asistencia.entity';
import { Repository } from 'typeorm';
import { MarcasService } from '../marcas/marcas.service';
import { Empleado } from '../empleado/entities/empleado.entity';
import { Feriado } from '../feriados/entities/feriado.entity';
import { Ausencia } from 'src/ausencias/entities/ausencia.entity';

@Injectable()
export class DetalleAsistenciaService {
  constructor(
    @InjectRepository(DetalleAsistencia)
    private readonly detalleAsistenciaRepository: Repository<DetalleAsistencia>,
    private readonly marcasService: MarcasService,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(Feriado)
    private readonly feriadosRepository: Repository<Feriado>,
    @InjectRepository(Ausencia)
    private readonly ausenciasRepository: Repository<Ausencia>,
  ) { }

  create(createDetalleAsistenciaDto: CreateDetalleAsistenciaDto) {
    return 'This action adds a new detalleAsistencia';
  }

  async calcularAsistencia(numFicha: string, fechaInicio: string, fechaFin: string) {
    const empleado = await this.empleadoRepository.findOne({
      where: { num_ficha: numFicha },
      relations: ['cargo', 'cenco', 'empresa', 'turno']
    });

    if (!empleado) throw new HttpException('Empleado no encontrado', 404);

    const marcasResult = await this.marcasService.findAll(numFicha, fechaInicio, fechaFin);
    const feriados = await this.feriadosRepository.find();
    const ausenciasAll = await this.ausenciasRepository.find({
      where: { autorizada: true },
      relations: ['num_ficha', 'tipo_ausencia']
    });
    const ausencias = ausenciasAll.filter(a => a.num_ficha?.num_ficha === numFicha);
    console.log(`[DEBUG] Ausencias fetched for ${numFicha}:`, ausencias);
    console.log(`[DEBUG] Ausencias fetched for ${numFicha}:`, ausencias);

    const registrosMap = new Map<string, any>();

    for (const m of marcasResult) {
      const f = String(m.fecha_marca);
      if (!registrosMap.has(f)) {
        const horario = m.empleado?.turno?.detalle_turno?.horario;
        console.log(`[DEBUG] Mapping day ${f}: horario:`, horario);
        registrosMap.set(f, {
          fecha: f,
          marcasDia: [],
          entrada: null,
          salida: null,
          entradaTeorica: horario?.hora_entrada || '-',
          salidaTeorica: horario?.hora_salida || '-',
          colacionTeorica: horario?.colacion || '-',
          inicioColacionTeorica: horario?.hora_inicio_colacion || '-',
          finColacionTeorica: horario?.hora_fin_colacion || '-',
          horasTeoricas: '00:00',
          horasPresenciales: '-',
          atraso: '-',
          horasJustificadas: '-',
          horasExtra: '-',
          horasNoTrabajadas: '-',
          totalDia: '-',
          observacion: m.info_adicional || '',
        });
      }

      const entry = registrosMap.get(f)!;
      if (m.hora_marca) {
        entry.marcasDia.push(m);
      }

      if (m.info_adicional && entry.observacion !== m.info_adicional) {
        if (!entry.observacion || entry.observacion.includes('Falta Marca') || entry.observacion.includes('Faltan ambas')) {
          entry.observacion = m.info_adicional;
        }
      }
    }

    const formatMs = (ms: number): string => {
      if (ms <= 0) return '00:00';
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const parseMs = (timeStr: any): number => {
      if (!timeStr || timeStr === '-' || timeStr === '00:00' || timeStr === '00:00:00') return 0;
      if (typeof timeStr === 'number') return timeStr * 60000;
      if (typeof timeStr !== 'string') {
        if (timeStr instanceof Date) {
          return (timeStr.getUTCHours() * 3600000) + (timeStr.getUTCMinutes() * 60000) + (timeStr.getUTCSeconds() * 1000);
        }
        return 0;
      }
      const p = timeStr.split(':');
      if (p.length < 2) return 0;
      return (parseInt(p[0]) * 3600000) + (parseInt(p[1]) * 60000) + (p.length >= 3 ? parseInt(p[2]) * 1000 : 0);
    };

    const diffMsStr = (t1: string, t2: string): number => {
      if (t1 === '-' || t2 === '-') return 0;
      const d1 = new Date(`1970-01-01T${t1}`);
      let d2 = new Date(`1970-01-01T${t2}`);
      if (d2 < d1) d2 = new Date(`1970-01-02T${t2}`);
      return d2.getTime() - d1.getTime();
    };

    const resultadosGuardados: any[] = [];

    for (const reg of Array.from(registrosMap.values())) {
      if (reg.marcasDia && reg.marcasDia.length > 0) {
        reg.marcasDia.sort((a: any, b: any) => String(a.hora_marca).localeCompare(String(b.hora_marca)));

        if (reg.marcasDia.length === 1) {
          const m = reg.marcasDia[0];
          if (m.evento === 2) {
            reg.salida = String(m.hora_marca);
          } else {
            reg.entrada = String(m.hora_marca);
          }
        } else {
          reg.entrada = String(reg.marcasDia[0].hora_marca);
          reg.salida = String(reg.marcasDia[reg.marcasDia.length - 1].hora_marca);
        }
      }

      const entTeo = reg.entradaTeorica !== '-' ? reg.entradaTeorica.substring(0, 5) : '-';
      const salTeo = reg.salidaTeorica !== '-' ? reg.salidaTeorica.substring(0, 5) : '-';

      let hrsTeoricasMs = 0;
      if (entTeo !== '-' && salTeo !== '-') {
        hrsTeoricasMs = diffMsStr(entTeo, salTeo);
        reg.horasTeoricas = formatMs(hrsTeoricasMs);
      } else {
        reg.horasTeoricas = '-';
      }

      const entReal = reg.entrada ? reg.entrada.substring(0, 5) : '-';
      const salReal = reg.salida ? reg.salida.substring(0, 5) : '-';

      let hrsPresencialesMs = 0;
      if (entReal !== '-' && salReal !== '-') {
        hrsPresencialesMs = diffMsStr(entReal, salReal);
        reg.horasPresenciales = formatMs(hrsPresencialesMs);
      }

      const colacionMs = parseMs(reg.colacionTeorica);

      let totalDiaMs = 0;
      if (hrsPresencialesMs > colacionMs) {
        totalDiaMs = hrsPresencialesMs - colacionMs;
        reg.totalDia = formatMs(totalDiaMs);
      } else if (hrsPresencialesMs > 0) {
        totalDiaMs = hrsPresencialesMs;
        reg.totalDia = formatMs(totalDiaMs);
      }

      let atrasoMs = 0;
      if (entReal !== '-' && entTeo !== '-') {
        const diff = new Date(`1970-01-01T${entReal}`).getTime() - new Date(`1970-01-01T${entTeo}`).getTime();
        if (diff > 0) {
          atrasoMs = diff;
          reg.atraso = formatMs(atrasoMs);
        } else {
          reg.atraso = '00:00';
        }
      }

      let hrsTeoricasTrabajoMs = hrsTeoricasMs;
      if (hrsTeoricasMs > colacionMs) {
        hrsTeoricasTrabajoMs = hrsTeoricasMs - colacionMs;
      }

      let noTrabajadasMs = 0;
      if (hrsTeoricasTrabajoMs > 0 && totalDiaMs === 0) {
        noTrabajadasMs = hrsTeoricasTrabajoMs;
        reg.horasNoTrabajadas = formatMs(noTrabajadasMs);
      } else if (hrsTeoricasTrabajoMs > 0 && totalDiaMs > 0) {
        if (hrsTeoricasTrabajoMs > totalDiaMs) {
          noTrabajadasMs = hrsTeoricasTrabajoMs - totalDiaMs;
          reg.horasNoTrabajadas = formatMs(noTrabajadasMs);
        } else {
          reg.horasNoTrabajadas = '00:00';
        }
      }

      let horasExtraMs = 0;
      if (totalDiaMs > hrsTeoricasTrabajoMs) {
        horasExtraMs = totalDiaMs - hrsTeoricasTrabajoMs;
        reg.horasExtra = formatMs(horasExtraMs);
      } else {
        reg.horasExtra = '00:00';
      }

      const parts = reg.fecha.split(' ')[1].split('-');
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

      let justifMs = 0;
      const ausenciaList = ausencias.filter(aus => {
        let start = '';
        if (aus.fecha_inicio instanceof Date) start = aus.fecha_inicio.toISOString().substring(0, 10);
        else start = String(aus.fecha_inicio).substring(0, 10);

        let end = '';
        if (aus.fecha_fin instanceof Date) end = aus.fecha_fin.toISOString().substring(0, 10);
        else end = String(aus.fecha_fin).substring(0, 10);

        return formattedDate >= start && formattedDate <= end;
      });

      for (const aus of ausenciaList) {
        if (aus.dia_completo) {
          justifMs = noTrabajadasMs;
          break;
        } else if (aus.hora_inicio && aus.hora_fin) {
          justifMs += diffMsStr(String(aus.hora_inicio), String(aus.hora_fin));
        }
      }

      console.log(`[DEBUG] formattedDate: ${formattedDate}, noTrabajadasMs: ${noTrabajadasMs}, justifMs calculated: ${justifMs}, ausenciaList length: ${ausenciaList.length}`);

      if (justifMs > 0) {
        if (justifMs > noTrabajadasMs) justifMs = noTrabajadasMs;
        reg.horasJustificadas = formatMs(justifMs);
        noTrabajadasMs -= justifMs;
        reg.horasNoTrabajadas = formatMs(noTrabajadasMs);
      }
      const isFeriado = feriados.some(fer => {
        let fStr = '';
        if (fer.fecha instanceof Date) fStr = fer.fecha.toISOString().substring(0, 10);
        else if (typeof fer.fecha === 'string') fStr = fer.fecha.substring(0, 10);
        return fStr === formattedDate;
      });

      if (isFeriado) {
        if (entReal === '-' && salReal === '-') {
          reg.observacion = 'Feriado';
        }
      } else if (ausenciaList.length > 0) {
        if (entReal === '-' && salReal === '-') {
          const aus = ausenciaList[0];
          reg.observacion = aus?.tipo_ausencia?.nombre || 'Ausencia Autorizada';
        }
      }

      reg.entrada = entReal;
      reg.salida = salReal;
      reg.entradaTeorica = entTeo;
      reg.salidaTeorica = salTeo;

      const dateObj = new Date(formattedDate + 'T12:00:00.000');

      let savedId: number | null = null;

      if ((reg.marcasDia && reg.marcasDia.length > 0) || ausenciaList.length > 0) {
        let dbRecord = await this.detalleAsistenciaRepository.findOne({
          where: {
            empleado: { num_ficha: numFicha },
            fecha_marca: new Date(formattedDate)
          }
        });

        if (!dbRecord) {
          dbRecord = this.detalleAsistenciaRepository.create({
            empleado: empleado,
            num_ficha: numFicha,
            fecha_marca: new Date(formattedDate)
          });
        }

        dbRecord.hora_entrada = reg.entrada !== '-' ? reg.entrada : null;
        dbRecord.hora_salida = reg.salida !== '-' ? reg.salida : null;
        dbRecord.entrada_teorica = reg.entradaTeorica !== '-' ? reg.entradaTeorica : null;
        dbRecord.salida_teorica = reg.salidaTeorica !== '-' ? reg.salidaTeorica : null;
        dbRecord.horas_teoricas = reg.horasTeoricas !== '-' ? reg.horasTeoricas : null;
        dbRecord.horas_presenciales = reg.horasPresenciales !== '-' ? reg.horasPresenciales : null;
        dbRecord.horas_atraso = reg.atraso !== '-' ? reg.atraso : null;
        dbRecord.horas_justificadas = reg.horasJustificadas !== '-' ? reg.horasJustificadas : null;
        dbRecord.horas_extras = reg.horasExtra !== '-' ? reg.horasExtra : null;
        dbRecord.horas_no_trabajadas = reg.horasNoTrabajadas !== '-' ? reg.horasNoTrabajadas : null;
        dbRecord.total_dia = reg.totalDia !== '-' ? reg.totalDia : null;
        dbRecord.observacion = reg.observacion;

        const saved = await this.detalleAsistenciaRepository.save(dbRecord);
        savedId = saved.id;
      }

      reg.id = savedId;
      resultadosGuardados.push(reg);
    }

    return { registros: resultadosGuardados, empleado };
  }

  findAll() {
    return 'This action returns all detalleAsistencia';
  }

  findOne(id: number) {
    return `This action returns a #${id} detalleAsistencia`;
  }

  update(id: number, updateDetalleAsistenciaDto: UpdateDetalleAsistenciaDto) {
    return `This action updates a #${id} detalleAsistencia`;
  }

  remove(id: number) {
    return `This action removes a #${id} detalleAsistencia`;
  }
}