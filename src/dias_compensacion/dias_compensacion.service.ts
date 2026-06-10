import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateDiasCompensacionDto } from './dto/create-dias_compensacion.dto';
import { UpdateDiasCompensacionDto } from './dto/update-dias_compensacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiasCompensacion } from './entities/dias_compensacion.entity';
import { Between, Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { User } from 'src/users/user.entity';
import { AutorizaHorasExtra } from 'src/autoriza_horas_extras/entities/autoriza_horas_extra.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alerta } from 'src/alertas/entities/alerta.entity';
import { DiasCompensacionAprobada } from 'src/dias_compensacion_aprobadas/entities/dias_compensacion_aprobada.entity';
import { Ausencia } from 'src/ausencias/entities/ausencia.entity';

const parseTimeToDecimalHours = (timeStr?: string | null): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours + minutes / 60 + seconds / 3600;
};

const formatDecimalHoursToTimeStr = (decimalHours: number): string => {
  const totalSeconds = Math.round(decimalHours * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

@Injectable()
export class DiasCompensacionService implements OnModuleInit {
  private readonly logger = new Logger(DiasCompensacionService.name);

  async onModuleInit() {
    try {
      await this.diasCompensacionRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion ADD COLUMN IF NOT EXISTS horas_descontadas VARCHAR DEFAULT '00:00:00'`
      );
      await this.diasCompensacionRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion ADD COLUMN IF NOT EXISTS horas_solicitadas VARCHAR DEFAULT '00:00:00'`
      );
      await this.diasCompensacionRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion ADD COLUMN IF NOT EXISTS fecha_inicio_descanso DATE`
      );
      await this.diasCompensacionRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion ADD COLUMN IF NOT EXISTS fecha_fin_descanso DATE`
      );
      await this.diasCompensacionAprobadasRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion_aprobadas ADD COLUMN IF NOT EXISTS fecha_inicio_descanso DATE`
      );
      await this.diasCompensacionAprobadasRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion_aprobadas ADD COLUMN IF NOT EXISTS fecha_fin_descanso DATE`
      );
    } catch (e) {
      console.error('Error al inicializar las columnas de compensación:', e);
    }
  }

  constructor(
    @InjectRepository(DiasCompensacion)
    private readonly diasCompensacionRepository: Repository<DiasCompensacion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AutorizaHorasExtra)
    private readonly autorizaHorasExtraRepository: Repository<AutorizaHorasExtra>,
    @InjectRepository(Alerta)
    private readonly alertaRepository: Repository<Alerta>,
    @InjectRepository(DiasCompensacionAprobada)
    private readonly diasCompensacionAprobadasRepository: Repository<DiasCompensacionAprobada>,
    @InjectRepository(Ausencia)
    private readonly ausenciaRepository: Repository<Ausencia>,
    private readonly mailerService: MailerService
  ) { }

  async create(id_usuario: number) {
    const usuario = await this.userRepository.findOne({
      where: {
        usuario_id: id_usuario
      },
      relations: ["empleado"]
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const empleado = usuario.empleado;
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Calcular primer y último día del mes actual
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const registros = await this.autorizaHorasExtraRepository.find({
      where:{
        empleado:{empleado_id:empleado.empleado_id},
        estado:"A",
        fecha_marca: Between(firstDay as any, lastDay as any)
      }
    })

    const totalDecimalHours = registros.reduce((total, registro) => {
      return total + parseTimeToDecimalHours(registro.horas_extras);
    }, 0);

    if (totalDecimalHours >= 6) {
      // Buscar si ya existe un registro para este empleado en el mes actual
      const recordExistente = await this.diasCompensacionRepository.findOne({
        where: {
          empleado: { empleado_id: empleado.empleado_id },
          fecha: Between(firstDay as any, lastDay as any)
        }
      });

      let savedRecord;
      if (recordExistente) {
        // Calcular horas netas restantes descontando lo que ya se cobró/descontó
        const descontadas = parseTimeToDecimalHours(recordExistente.horas_descontadas);
        const netRemaining = Math.max(0, totalDecimalHours - descontadas);
        recordExistente.horas_extras = formatDecimalHoursToTimeStr(netRemaining);
        savedRecord = await this.diasCompensacionRepository.save(recordExistente);
      } else {
        // Si no existe, creamos uno nuevo
        const nuevoRecord = this.diasCompensacionRepository.create({
          horas_extras: formatDecimalHoursToTimeStr(totalDecimalHours),
          horas_descontadas: '00:00:00',
          empleado: empleado,
          fecha: new Date()
        });
        savedRecord = await this.diasCompensacionRepository.save(nuevoRecord);
      }

      // Enviar correo si las horas son múltiplos de 6 (6, 12, 18, 24, etc.)
      const roundedHours = Math.round(totalDecimalHours * 100) / 100;
      if (roundedHours > 0 && roundedHours % 6 === 0) {
        try {
          // Verificar si ya se envió una alerta en los últimos 7 días (Usamos tipo 10 para compensación)
          const hace7Dias = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          const finDia = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          
          const alertaExistente = await this.alertaRepository.findOne({
            where: {
              empleado: { empleado_id: empleado.empleado_id },
              tipo: 10,
              fecha: Between(hace7Dias, finDia)
            }
          });

          if (!alertaExistente) {
            const correo = empleado.email_laboral || empleado.email;
            if (correo) {
              const fechaActualStr = now.toLocaleDateString('es-CL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
              const netHours = parseTimeToDecimalHours(savedRecord.horas_extras);
              const diasAcumulados = netHours / 6;

              await this.mailerService.sendMail({
                to: correo,
                subject: 'Días de Compensación Acumulados',
                html: `
                  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <p>Estimado(a) <strong>${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}</strong>,</p>
                    <p>Los días compensados acumulados a la fecha (<strong>${fechaActualStr}</strong>) son: <strong>${diasAcumulados} día(s)</strong>.</p>
                  </div>
                `
              });

              // Guardar alerta para no repetir el correo hoy
              await this.alertaRepository.save({
                tipo: 10,
                empleado: empleado,
                fecha: new Date()
              });
            }
          }
        } catch (error) {
          console.error('Error al enviar correo de días de compensación:', error);
        }
      }

      return savedRecord;
    }

    return {
      message: 'Las horas extras del mes no superan el límite de 6 horas o no hay registros para procesar.',
      total_horas_extras: formatDecimalHoursToTimeStr(totalDecimalHours)
    };
  }

  async findAll(id_usuario: number) {
    const usuario = await this.userRepository.findOne({
      where: {
        usuario_id: id_usuario
      },
      relations: ["empleado"]
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const empleado = usuario.empleado;
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return this.diasCompensacionRepository.find({
      where: {
        empleado: { empleado_id: empleado.empleado_id }
      }
    });
  }

  async buscarPendientesPorEmpleado(empleado_id: number) {     
    const records = await this.diasCompensacionRepository.find({
      where: {
        empleado: { empleado_id: empleado_id },
        estado: "P"
      },
      relations: ['empleado']
    });
    if (records.length === 0) {
      return { message: "No se encontraron registros de compensación pendientes" };
    }
    return records;
  }

  findOne(id: number) {
    return `This action returns a #${id} diasCompensacion`;
  }

  async update(id: number, updateDiasCompensacionDto: UpdateDiasCompensacionDto) {
    const record = await this.diasCompensacionRepository.findOne({
      where: { id },
      relations: ['empleado'] // Necesario para registrar en la tabla de aprobadas
    });
    if (!record) {
      throw new Error('Registro de compensación no encontrado');
    }

    // 1. Si la petición es solo para pasar a Pendiente (solicitud creada por el empleado)
    if (updateDiasCompensacionDto.estado === 'P') {
      if (updateDiasCompensacionDto.fecha_inicio_descanso && updateDiasCompensacionDto.fecha_fin_descanso) {
        // Guardamos el string YYYY-MM-DD directamente — evita desfase de zona horaria (UTC vs local)
        const inicioStr = String(updateDiasCompensacionDto.fecha_inicio_descanso).substring(0, 10);
        const finStr = String(updateDiasCompensacionDto.fecha_fin_descanso).substring(0, 10);
        
        const solapamiento = await this.diasCompensacionAprobadasRepository.findOne({
          where: {
            empleado: { empleado_id: record.empleado.empleado_id },
            fecha_inicio_descanso: LessThanOrEqual(finStr),
            fecha_fin_descanso: MoreThanOrEqual(inicioStr)
          }
        });
        
        if (solapamiento) {
          throw new BadRequestException('Las fechas solicitadas se solapan con un descanso ya aprobado.');
        }
        record.fecha_inicio_descanso = inicioStr;
        record.fecha_fin_descanso = finStr;
      }

      const aSolicitar = updateDiasCompensacionDto.horas_descontar || 0;
      record.horas_solicitadas = formatDecimalHoursToTimeStr(aSolicitar);
      record.estado = 'P';
      return await this.diasCompensacionRepository.save(record);
    }

    // 2. Si la petición es rechazar/cancelar (pasar a null explícitamente sin descontar)
    if (updateDiasCompensacionDto.estado === null) {
      record.estado = null;
      record.horas_solicitadas = '00:00:00';
      record.fecha_inicio_descanso = null;
      record.fecha_fin_descanso = null;
      return await this.diasCompensacionRepository.save(record);
    }

    // 3. Flujo de descuento de horas (cuando se Aprueba "A" o flujo normal sin estado)
    const horasExtrasActuales = parseTimeToDecimalHours(record.horas_extras);
    const descontadasActuales = parseTimeToDecimalHours(record.horas_descontadas);
    
    // Si es Aprobación ("A"), tomamos el valor de las horas solicitadas guardadas previamente,
    // a menos que envíen explícitamente otro valor en horas_descontar.
    let aDescontar = 0;
    if (updateDiasCompensacionDto.estado === 'A') {
      aDescontar = updateDiasCompensacionDto.horas_descontar || parseTimeToDecimalHours(record.horas_solicitadas);
    } else {
      aDescontar = updateDiasCompensacionDto.horas_descontar || 0;
    }

    // El descuento efectivo no puede superar las horas extras disponibles en este registro
    const descuentoEfectivo = Math.min(horasExtrasActuales, aDescontar);

    if (updateDiasCompensacionDto.estado === 'A') {
      // Registrar la aprobación en la tabla histórica de aprobadas
      if (descuentoEfectivo > 0) {
        const aprobada = this.diasCompensacionAprobadasRepository.create({
          horas_extras: formatDecimalHoursToTimeStr(descuentoEfectivo),
          empleado: record.empleado,
          fecha: new Date(),
          estado: 'A',
          fecha_inicio_descanso: record.fecha_inicio_descanso,
          fecha_fin_descanso: record.fecha_fin_descanso
        });
        await this.diasCompensacionAprobadasRepository.save(aprobada);

        // --- CREAR LA AUSENCIA AUTOMÁTICAMENTE ---
        const nuevaAusencia = this.ausenciaRepository.create({
          num_ficha: record.empleado,
          fecha_inicio: new Date(record.fecha_inicio_descanso as string),
          fecha_fin: new Date(record.fecha_fin_descanso as string),
          hora_inicio: '08:00',
          hora_fin: '18:00',
          dia_completo: true,
          tipo_ausencia: { id: 5 } as any, // ID de Compensación HHEE/Feriado
          autorizador: 'Sistema Compensación HHEE',
          autorizada: true,
          fecha_creacion: new Date()
        });
        await this.ausenciaRepository.save(nuevaAusencia);
        // -----------------------------------------
      }
      
      // El estado de la solicitud y las horas solicitadas vuelven a su estado base
      record.estado = null;
      record.horas_solicitadas = '00:00:00';
      record.fecha_inicio_descanso = null;
      record.fecha_fin_descanso = null;
    }

    // Aplicar los descuentos de horas
    const nuevasDescontadas = descontadasActuales + descuentoEfectivo;
    const nuevasExtras = horasExtrasActuales - descuentoEfectivo;

    record.horas_descontadas = formatDecimalHoursToTimeStr(nuevasDescontadas);
    record.horas_extras = formatDecimalHoursToTimeStr(nuevasExtras);

    return await this.diasCompensacionRepository.save(record);
  }

  remove(id: number) {
    return `This action removes a #${id} diasCompensacion`;
  }

  // Cron que se ejecuta cada 24 horas (a la medianoche) para calcular días de compensación
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Iniciando cálculo automático de días de compensación...');

    try {
      // Obtenemos todos los usuarios que tengan un empleado asociado
      const usuarios = await this.userRepository.find({
        relations: ['empleado']
      });

      this.logger.log(`Procesando días de compensación para ${usuarios.length} usuarios.`);

      for (const usuario of usuarios) {
        if (!usuario.empleado) continue; // Solo procesar si tiene un empleado válido

        try {
          // Ejecuta el cálculo diario de compensación para este usuario
          await this.create(usuario.usuario_id);
        } catch (error) {
          this.logger.error(`Error al procesar compensación para el usuario ${usuario.usuario_id}: ${error.message}`);
        }
      }

      this.logger.log('Cálculo de días de compensación finalizado con éxito.');
    } catch (err) {
      this.logger.error(`Error general en el cron de compensación: ${err.message}`);
    }
  }
}
