import { Injectable, OnModuleInit } from '@nestjs/common';
import { CreateDiasCompensacionDto } from './dto/create-dias_compensacion.dto';
import { UpdateDiasCompensacionDto } from './dto/update-dias_compensacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiasCompensacion } from './entities/dias_compensacion.entity';
import { Between, Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { User } from 'src/users/user.entity';
import { AutorizaHorasExtra } from 'src/autoriza_horas_extras/entities/autoriza_horas_extra.entity';
import { MailerService } from '@nestjs-modules/mailer';


const parseTimeToDecimalHours = (timeStr?: string): number => {
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

  async onModuleInit() {
    try {
      await this.diasCompensacionRepository.query(
        `ALTER TABLE db_fmc.dias_compensacion ADD COLUMN IF NOT EXISTS horas_descontadas VARCHAR DEFAULT '00:00:00'`
      );
    } catch (e) {
      console.error('Error al inicializar la columna horas_descontadas:', e);
    }
  }

  constructor(
    @InjectRepository(DiasCompensacion)
    private readonly diasCompensacionRepository: Repository<DiasCompensacion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AutorizaHorasExtra)
    private readonly autorizaHorasExtraRepository: Repository<AutorizaHorasExtra>,
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
      throw new Error('Usuario no encontrado');
    }
    const empleado = usuario.empleado;
    if (!empleado) {
      throw new Error('Empleado no encontrado');
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
      throw new Error('Usuario no encontrado');
    }
    const empleado = usuario.empleado;
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }
    return this.diasCompensacionRepository.find({
      where: {
        empleado: { empleado_id: empleado.empleado_id }
      }
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} diasCompensacion`;
  }

  async update(id: number, updateDiasCompensacionDto: UpdateDiasCompensacionDto) {
    const record = await this.diasCompensacionRepository.findOne({
      where: { id }
    });
    if (!record) {
      throw new Error('Registro de compensación no encontrado');
    }

    const horasExtrasActuales = parseTimeToDecimalHours(record.horas_extras);
    const descontadasActuales = parseTimeToDecimalHours(record.horas_descontadas);
    const aDescontar = updateDiasCompensacionDto.horas_descontar || 0;

    // El descuento efectivo no puede superar las horas extras disponibles en este registro
    const descuentoEfectivo = Math.min(horasExtrasActuales, aDescontar);

    const nuevasDescontadas = descontadasActuales + descuentoEfectivo;
    const nuevasExtras = horasExtrasActuales - descuentoEfectivo;

    record.horas_descontadas = formatDecimalHoursToTimeStr(nuevasDescontadas);
    record.horas_extras = formatDecimalHoursToTimeStr(nuevasExtras);

    return await this.diasCompensacionRepository.save(record);
  }

  remove(id: number) {
    return `This action removes a #${id} diasCompensacion`;
  }
}
