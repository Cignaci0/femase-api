import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SolicitudHorasCompensacion } from './entities/solicitud_horas_compensacion.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { AsignacionTurnoRotativo } from 'src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';
import { HorasCompensacionService } from 'src/horas_compensacion/horas_compensacion.service';
import { Ausencia } from 'src/ausencias/entities/ausencia.entity';
import { TipoAusencia } from 'src/tipo-ausencia/entities/tipo-ausencia.entity';
import { User } from 'src/users/user.entity';

const timeToDecimal = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) + ((parts[1] || 0) / 60) + ((parts[2] || 0) / 3600);
};

@Injectable()
export class SolicitudHorasCompensacionService {
  constructor(
    @InjectRepository(SolicitudHorasCompensacion)
    private solicitudRepo: Repository<SolicitudHorasCompensacion>,
    @InjectRepository(Empleado)
    private empleadoRepo: Repository<Empleado>,
    @InjectRepository(AsignacionTurnoRotativo)
    private asignacionTurnoRotativoRepo: Repository<AsignacionTurnoRotativo>,
    private horasCompensacionService: HorasCompensacionService,
  ) {}
  async create(body: { usuarioId: number; fecha_solicitada: string; horas_solicitadas: string; hora_inicio?: string; hora_fin?: string; momento_jornada?: 'INICIO' | 'FIN' | 'DIA_COMPLETO'; observacion?: string }) {
    let { usuarioId, fecha_solicitada, horas_solicitadas, hora_inicio, hora_fin, momento_jornada, observacion } = body;

    // Forzar momento_jornada si horas_solicitadas viene como DIA_COMPLETO
    if (horas_solicitadas === 'DIA_COMPLETO') {
      momento_jornada = 'DIA_COMPLETO';
      observacion = (observacion || 'Solicitud de tiempo libre compensado') + ' [DIA_COMPLETO]';
    }

    const user = await this.solicitudRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado'] });
    let empleadoId = user?.empleado?.empleado_id;
    if (!empleadoId && user?.run_usuario) {
      const emp = await this.solicitudRepo.manager.findOne(Empleado, { where: { run: user.run_usuario } });
      if (emp) empleadoId = emp.empleado_id;
    }
    if (!empleadoId) throw new BadRequestException(`El usuario ${usuarioId} no tiene un empleado asociado.`);

    const empleado = await this.empleadoRepo.findOne({
      where: { empleado_id: empleadoId },
      relations: ['turno', 'turno.detalle_turno', 'turno.detalle_turno.dia', 'turno.detalle_turno.horario']
    });

    if (!empleado) {
      throw new BadRequestException('Empleado no encontrado');
    }

    let horasSolicitadasDec = 0;
    if (momento_jornada !== 'DIA_COMPLETO') {
      horasSolicitadasDec = timeToDecimal(horas_solicitadas);
      if (horasSolicitadasDec <= 0) {
        throw new BadRequestException('Debe solicitar una cantidad de horas mayor a 0');
      }
    }

    // 2. Validar que no pida más horas de las que tiene su turno ese día
    const fechaDate = new Date(`${fecha_solicitada}T00:00:00`);
    const diaEnNumero = fechaDate.getDay() === 0 ? 7 : fechaDate.getDay();

    let horaEntradaTeorica: string | null = null;
    let horaSalidaTeorica: string | null = null;

    let turnoColacion: string | null = null;
    
    const turnoNormal = empleado.turno?.detalle_turno?.find(t => t.dia?.cod_dia === diaEnNumero);
    
    if (turnoNormal) {
      horaEntradaTeorica = turnoNormal.horario.hora_entrada;
      horaSalidaTeorica = turnoNormal.horario.hora_salida;
      turnoColacion = turnoNormal.horario.colacion;
    } else if (empleado.turno === null && empleado.permite_rotativo === true) {
      // Buscar turno rotativo
      const fechaInicioDia = new Date(`${fecha_solicitada}T00:00:00`);
      const fechaFinDia = new Date(`${fecha_solicitada}T23:59:59.999`);
      
      const turnoRotativo = await this.asignacionTurnoRotativoRepo.findOne({
        where: {
          empleado: { empleado_id: empleadoId },
          fecha_inicio_turno: Between(fechaInicioDia, fechaFinDia),
        },
        relations: ['horario']
      });
      if (turnoRotativo) {
        horaEntradaTeorica = turnoRotativo.horario.hora_entrada;
        horaSalidaTeorica = turnoRotativo.horario.hora_salida;
        turnoColacion = turnoRotativo.horario.colacion;
      }
    }

    if (!horaEntradaTeorica || !horaSalidaTeorica) {
      throw new BadRequestException(`No tienes un turno asignado para el ${fecha_solicitada}. No puedes solicitar compensación en un día libre.`);
    }

    if (momento_jornada) {
      if (momento_jornada === 'INICIO') {
        hora_inicio = horaEntradaTeorica;
        const entradaParts = horaEntradaTeorica.split(':').map(Number);
        const finTotalMins = (entradaParts[0] * 60) + entradaParts[1] + (horasSolicitadasDec * 60);
        const fH = Math.floor(finTotalMins / 60) % 24;
        const fM = Math.floor(finTotalMins % 60);
        hora_fin = `${String(fH).padStart(2, '0')}:${String(fM).padStart(2, '0')}:00`;
      } else {
        hora_fin = horaSalidaTeorica;
        const salidaParts = horaSalidaTeorica.split(':').map(Number);
        let salidaTotalMins = (salidaParts[0] * 60) + salidaParts[1];
        const inicioTotalMins = salidaTotalMins - (horasSolicitadasDec * 60);
        const iH = Math.floor((inicioTotalMins + 1440) % 1440 / 60);
        const iM = Math.floor((inicioTotalMins + 1440) % 60);
        hora_inicio = `${String(iH).padStart(2, '0')}:${String(iM).padStart(2, '0')}:00`;
      }
    }

    const entradaDec = timeToDecimal(horaEntradaTeorica);
    const salidaDec = timeToDecimal(horaSalidaTeorica);
    
    let duracionTurno = salidaDec - entradaDec;
    if (duracionTurno < 0) { // Turno nocturno
      duracionTurno = (24 - entradaDec) + salidaDec;
    }
    
    const colacionDec = turnoColacion ? timeToDecimal(turnoColacion) : 0;
    const horasNetasTurno = Math.max(0, duracionTurno - colacionDec);

    if (momento_jornada === 'DIA_COMPLETO') {
      horasSolicitadasDec = horasNetasTurno;
      if (horasSolicitadasDec <= 0) throw new BadRequestException('El turno de este día no tiene horas laborables válidas.');
      
      const h = Math.floor(horasSolicitadasDec);
      const m = Math.floor((horasSolicitadasDec - h) * 60);
      horas_solicitadas = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      
      hora_inicio = horaEntradaTeorica;
      hora_fin = horaSalidaTeorica;
    } else {
      if (horasSolicitadasDec > horasNetasTurno) {
        throw new BadRequestException(`No puedes pedir ${horas_solicitadas} horas. Tu turno de trabajo neto para ese día dura solo ${horasNetasTurno.toFixed(2)} horas.`);
      }
    }

    // 1. Validar que tenga saldo suficiente
    const saldoData = await this.horasCompensacionService.obtenerSaldoDisponible(usuarioId);
    const saldoDec = timeToDecimal(saldoData.total_disponible);

    if (saldoDec < horasSolicitadasDec) {
      throw new BadRequestException(`Saldo insuficiente. Tienes ${saldoData.total_disponible} horas disponibles y requieres ${horas_solicitadas} para esta solicitud.`);
    }

    // --- NUEVA LÓGICA: SOLAPAMIENTO ---
    const solicitudesMismoDia = await this.solicitudRepo.find({
      where: {
        empleado: { empleado_id: empleadoId },
        fecha_solicitada: fecha_solicitada as any,
        estado: In(['P', 'A']) // Pendientes o Aprobadas
      }
    });

    if (hora_inicio && hora_fin) {
      const inicioNuevoDec = timeToDecimal(hora_inicio);
      const finNuevoDec = timeToDecimal(hora_fin);

      if (inicioNuevoDec >= finNuevoDec) {
        throw new BadRequestException('La hora de inicio debe ser menor a la hora de fin.');
      }

      for (const req of solicitudesMismoDia) {
        if (req.hora_inicio && req.hora_fin) {
          const inicioExistente = timeToDecimal(req.hora_inicio);
          const finExistente = timeToDecimal(req.hora_fin);

          // Verifica si los bloques de tiempo chocan
          if (inicioNuevoDec < finExistente && inicioExistente < finNuevoDec) {
            throw new BadRequestException(`El horario solicitado (${hora_inicio} a ${hora_fin}) choca con otra solicitud que ya tienes de ${req.hora_inicio} a ${req.hora_fin}.`);
          }
        }
      }
    }
    
    // Validamos la suma total para que no pida más horas que el turno en múltiples peticiones
    let sumaHorasDia = 0;
    solicitudesMismoDia.forEach(req => {
      sumaHorasDia += timeToDecimal(req.horas_solicitadas);
    });

    if (sumaHorasDia + horasSolicitadasDec > duracionTurno) {
      throw new BadRequestException(`Ya tienes solicitudes por ${sumaHorasDia} horas ese día. Si pides ${horas_solicitadas} más, excedes tu turno de ${duracionTurno.toFixed(2)} horas.`);
    }
    // --- FIN SOLAPAMIENTO ---

    // 3. Crear la solicitud en estado Pendiente
    const nuevaSolicitud = this.solicitudRepo.create({
      empleado,
      fecha_solicitada: fecha_solicitada as any, // YYYY-MM-DD
      horas_solicitadas,
      hora_inicio,
      hora_fin,
      estado: 'P',
      observacion: observacion || 'Solicitud de tiempo libre compensado'
    });

    return await this.solicitudRepo.save(nuevaSolicitud);
  }

  async buscarPendientes() {
    const solicitudes = await this.solicitudRepo.find({
      where: { estado: 'P' },
      relations: ['empleado']
    });
    return solicitudes.map(s => ({
      ...s,
      fecha: s.fecha_creacion,
      fecha_inicio_descanso: s.fecha_solicitada,
      fecha_fin_descanso: s.fecha_solicitada
    }));
  }

  async buscarFiltradas(usuarioId?: number, fechaInicio?: string, fechaFin?: string) {
    const where: any = {};
    if (usuarioId) {
      const user = await this.solicitudRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado'] });
      let empleadoId = user?.empleado?.empleado_id;
      if (!empleadoId && user?.run_usuario) {
        const emp = await this.solicitudRepo.manager.findOne(Empleado, { where: { run: user.run_usuario } });
        if (emp) empleadoId = emp.empleado_id;
      }
      if (empleadoId) {
        where.empleado = { empleado_id: empleadoId };
      }
    }
    if (fechaInicio && fechaFin) {
      where.fecha_solicitada = Between(fechaInicio, fechaFin);
    }
    
    const solicitudes = await this.solicitudRepo.find({
      where,
      relations: ['empleado'],
      order: { fecha_solicitada: 'DESC' }
    });

    return solicitudes.map(s => ({
      ...s,
      fecha: s.fecha_creacion,
      fecha_inicio_descanso: s.fecha_solicitada,
      fecha_fin_descanso: s.fecha_solicitada
    }));
  }

  async aprobar(id: number, autorizador: string) {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id },
      relations: ['empleado']
    });

    if (!solicitud) {
      throw new BadRequestException('Solicitud no encontrada');
    }
    if (solicitud.estado !== 'P') {
      throw new BadRequestException('La solicitud no está en estado Pendiente');
    }

    // 1. Descontar las horas de su saldo usando FIFO
    await this.horasCompensacionService.consumirSaldo(solicitud.empleado.empleado_id, solicitud.horas_solicitadas);

    // 2. Cambiar estado a Aprobado
    solicitud.estado = 'A';
    await this.solicitudRepo.save(solicitud);

    // 3. Buscar el TipoAusencia (ID 5: Permiso Compensación)
    let tipoAusencia = await this.solicitudRepo.manager.findOne(TipoAusencia, { where: { id: 5 }});
    if (!tipoAusencia) {
       // Fallbacks por si cambia el ID
       tipoAusencia = await this.solicitudRepo.manager.findOne(TipoAusencia, { where: { nombre: 'permiso compensación' }});
       if (!tipoAusencia) {
         tipoAusencia = await this.solicitudRepo.manager.findOne(TipoAusencia, { where: { nombre: 'permiso compensacion' }}); 
       }
    }

    if (!tipoAusencia) {
      throw new BadRequestException('No se encontró un tipo de ausencia válido en el sistema');
    }

    // 4. Crear la Ausencia automática
    const nuevaAusencia = this.solicitudRepo.manager.create(Ausencia, {
      num_ficha: solicitud.empleado, // La relación mapea al objeto Empleado
      fecha_inicio: solicitud.fecha_solicitada,
      fecha_fin: solicitud.fecha_solicitada,
      hora_inicio: solicitud.hora_inicio || '00:00:00',
      hora_fin: solicitud.hora_fin || solicitud.horas_solicitadas, 
      dia_completo: solicitud.observacion?.includes('[DIA_COMPLETO]') ? true : false, 
      tipo_ausencia: tipoAusencia,
      autorizador: autorizador || 'Sistema (Banco Horas)',
      autorizada: true,
      fecha_creacion: new Date()
    });

    await this.solicitudRepo.manager.save(nuevaAusencia);

    return { mensaje: 'Solicitud aprobada y ausencia creada con éxito' };
  }

  async rechazar(id: number) {
    const solicitud = await this.solicitudRepo.findOne({ where: { id } });
    if (!solicitud) throw new BadRequestException('Solicitud no encontrada');
    if (solicitud.estado !== 'P') throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes');

    solicitud.estado = 'R';
    await this.solicitudRepo.save(solicitud);
    return { mensaje: 'Solicitud rechazada' };
  }
}
