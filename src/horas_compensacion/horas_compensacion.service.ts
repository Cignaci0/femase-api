import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateHorasCompensacionDto } from './dto/create-horas_compensacion.dto';
import { UpdateHorasCompensacionDto } from './dto/update-horas_compensacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Repository, In } from 'typeorm';
import { HorasCompensacion } from './entities/horas_compensacion.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { Cron } from '@nestjs/schedule';

const timeToDecimal = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) + ((parts[1] || 0) / 60) + ((parts[2] || 0) / 3600);
};

const decimalToTime = (decimalHours: number): string => {
  if (decimalHours < 0) decimalHours = 0;
  const totalSeconds = Math.round(decimalHours * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

@Injectable()
export class HorasCompensacionService {
  private readonly logger = new Logger(HorasCompensacionService.name);

  constructor(
    @InjectRepository(Empleado)
    private empleadoRepo: Repository<Empleado>,
    @InjectRepository(HorasCompensacion)
    private horasCompensacionRepo: Repository<HorasCompensacion>,
    private readonly mailerService: MailerService,
  ) { }

  create(createHorasCompensacionDto: CreateHorasCompensacionDto) {
    return 'This action adds a new horasCompensacion';
  }

  async transferirACompensacion(usuarioId: number, periodo: string, horasATransferir: string) {
    const user = await this.horasCompensacionRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado'] });
    let empleadoId = user?.empleado?.empleado_id;
    if (!empleadoId && user?.run_usuario) {
      const emp = await this.horasCompensacionRepo.manager.findOne(Empleado, { where: { run: user.run_usuario } });
      if (emp) empleadoId = emp.empleado_id;
    }
    if (!empleadoId) {
      throw new BadRequestException(`El usuario ${usuarioId} no tiene un empleado asociado o no se encontró.`);
    }

    // 1. Buscamos el registro del banco de horas de ese empleado para ese mes
    const banco = await this.horasCompensacionRepo.findOne({
      where: { empleado: { empleado_id: empleadoId }, periodo }
    });

    if (!banco) {
      throw new BadRequestException(`No se encontraron horas registradas para este empleado en el periodo ${periodo}.`);
    }

    // 2. Convertimos a decimales para poder restar y sumar
    const pagasDec = timeToDecimal(banco.horas_pagas);
    const transferDec = timeToDecimal(horasATransferir);

    if (transferDec <= 0) {
      throw new BadRequestException("Debe transferir una cantidad mayor a 0");
    }

    // 3. Verificamos que tenga suficientes "horas_pagas" para convertir a compensación
    if (pagasDec < transferDec) {
      throw new BadRequestException(`Saldo insuficiente. Tiene ${banco.horas_pagas} horas pagas disponibles en ${periodo}.`);
    }

    // 4. Si todo está bien, restamos de pagas y sumamos a compensación
    const compensacionActualDec = timeToDecimal(banco.horas_compensacion);

    banco.horas_pagas = decimalToTime(pagasDec - transferDec);
    banco.horas_compensacion = decimalToTime(compensacionActualDec + transferDec);

    return await this.horasCompensacionRepo.save(banco);
  }

  async obtenerSaldoDisponible(usuarioId: number): Promise<any> {
    const user = await this.horasCompensacionRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado', 'empleado.empresa'] });
    let empleadoId = user?.empleado?.empleado_id;
    let cierreMes = user?.empleado?.empresa?.cierre_mes || 31;

    if (!empleadoId && user?.run_usuario) {
      const emp = await this.horasCompensacionRepo.manager.findOne(Empleado, { where: { run: user.run_usuario }, relations: ['empresa'] });
      if (emp) {
        empleadoId = emp.empleado_id;
        cierreMes = emp.empresa?.cierre_mes || 31;
      }
    }

    if (!empleadoId) {
      throw new BadRequestException(`El usuario ${usuarioId} no tiene un empleado asociado o no se pudo encontrar.`);
    }

    const periodosValidos: string[] = [];
    const date = new Date();
    
    // Si la fecha actual supera el cierre de mes, nos adelantamos un mes en el análisis
    if (date.getDate() > cierreMes) {
      date.setMonth(date.getMonth() + 1);
    }

    // Generamos los últimos 6 periodos (meses) incluyendo el actual desplazado
    for (let i = 0; i < 6; i++) {
      const anio = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      periodosValidos.push(`${anio}-${mes}`);
      date.setMonth(date.getMonth() - 1);
    }

    // Buscamos los registros de esos 6 meses, ordenados del más viejo al más nuevo
    const registros = await this.horasCompensacionRepo.find({
      where: {
        empleado: { empleado_id: empleadoId },
        periodo: In(periodosValidos)
      },
      order: { periodo: 'ASC' }
    });

    let totalDecimal = 0;
    const detalles = registros.map(reg => {
      const disponibles = Math.max(0, timeToDecimal(reg.horas_compensacion) - timeToDecimal(reg.horas_compensacion_consumidas));
      totalDecimal += disponibles;
      return {
        periodo: reg.periodo,
        disponibles: decimalToTime(disponibles)
      };
    }).filter(d => timeToDecimal(d.disponibles) > 0); // Solo mostramos los meses que aún tienen horas

    return {
      empleado_id: empleadoId,
      total_disponible: decimalToTime(totalDecimal),
      desglose: detalles
    };
  }

  async findAllPorEmpleado(usuarioId: number) {
    const user = await this.horasCompensacionRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado'] });
    let empleadoId = user?.empleado?.empleado_id;
    if (!empleadoId && user?.run_usuario) {
      const emp = await this.horasCompensacionRepo.manager.findOne(Empleado, { where: { run: user.run_usuario } });
      if (emp) empleadoId = emp.empleado_id;
    }

    if (!empleadoId) {
      throw new BadRequestException(`El usuario ${usuarioId} no tiene un empleado asociado o no se pudo encontrar.`);
    }

    return await this.horasCompensacionRepo.find({
      where: { empleado: { empleado_id: empleadoId } },
      order: { periodo: 'DESC' }
    });
  }

  async consumirSaldo(empleadoId: number, horasAConsumir: string) {
    const empleado = await this.horasCompensacionRepo.manager.findOne(Empleado, { where: { empleado_id: empleadoId }, relations: ['empresa'] });
    const cierreMes = empleado?.empresa?.cierre_mes || 31;

    const periodosValidos: string[] = [];
    const date = new Date();

    if (date.getDate() > cierreMes) {
      date.setMonth(date.getMonth() + 1);
    }

    for (let i = 0; i < 6; i++) {
      const anio = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      periodosValidos.push(`${anio}-${mes}`);
      date.setMonth(date.getMonth() - 1);
    }

    const registros = await this.horasCompensacionRepo.find({
      where: {
        empleado: { empleado_id: empleadoId },
        periodo: In(periodosValidos)
      },
      order: { periodo: 'ASC' } // FIFO: gastamos primero lo más viejo
    });

    let faltanteDec = timeToDecimal(horasAConsumir);

    for (const reg of registros) {
      if (faltanteDec <= 0) break;

      const compensacionDec = timeToDecimal(reg.horas_compensacion);
      const consumidasDec = timeToDecimal(reg.horas_compensacion_consumidas);
      const disponibleDec = Math.max(0, compensacionDec - consumidasDec);

      if (disponibleDec > 0) {
        const aConsumirAqui = Math.min(disponibleDec, faltanteDec);
        reg.horas_compensacion_consumidas = decimalToTime(consumidasDec + aConsumirAqui);
        await this.horasCompensacionRepo.save(reg);
        faltanteDec -= aConsumirAqui;
      }
    }

    if (faltanteDec > 0.01) {
      throw new BadRequestException(`Inconsistencia: El empleado no tiene suficientes horas. Faltan ${faltanteDec.toFixed(2)} horas.`);
    }
  }

  // Cron que se ejecuta todos los días a las 2:00 AM para verificar vencimientos
  @Cron('0 2 * * *')
  async verificarVencimientos() {
    this.logger.log('Iniciando cron para verificar vencimientos de horas de compensación...');
    const hoy = new Date();
    
    const registros = await this.horasCompensacionRepo.find({
      relations: ['empleado', 'empleado.empresa'],
    });

    this.logger.log(`Se encontraron ${registros.length} registros totales para evaluar.`);

    for (const reg of registros) {
      if (!reg.empleado) continue;

      const disponibleDec = Math.max(0, timeToDecimal(reg.horas_compensacion) - timeToDecimal(reg.horas_compensacion_consumidas));

      if (disponibleDec <= 0) continue;

      const cierreMes = reg.empleado.empresa?.cierre_mes || 31;
      const expirationDate = this.getExpirationDate(reg.periodo, cierreMes);

      const diffInTime = expirationDate.getTime() - hoy.getTime();
      const diffInDays = diffInTime / (1000 * 3600 * 24);

      if (diffInDays <= 30 && diffInDays > 0 && !reg.notificado_vencimiento) {
        try {
          const emailEmpleado = reg.empleado.email_laboral || reg.empleado.email;
          const emailNoti = reg.empleado.email_noti;
          const nombreCompleto = `${reg.empleado.nombres} ${reg.empleado.apellido_paterno}`;
          const horasDisponiblesStr = decimalToTime(disponibleDec);

          // 1. Correo al empleado
          if (emailEmpleado) {
            this.logger.log(`Enviando advertencia de vencimiento a ${emailEmpleado} (Empleado) por el periodo ${reg.periodo}.`);
            await this.mailerService.sendMail({
              to: emailEmpleado,
              subject: 'Aviso de Vencimiento de Horas de Compensación',
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <p>Hola <strong>${nombreCompleto}</strong>,</p>
                  <p>Le informamos que posee <strong>${horasDisponiblesStr}</strong> horas de compensación correspondientes al periodo <strong>${reg.periodo}</strong> que no se han utilizado.</p>
                  <p>Si estas no se utilizan dentro de los siguientes 30 días, pasarán automáticamente a pago.</p>
                </div>
              `
            });
          } else {
            this.logger.warn(`El empleado ${reg.empleado.empleado_id} no tiene un correo personal/laboral configurado para la notificación.`);
          }

          // 2. Correo a Gerencia / RRHH
          if (emailNoti) {
            this.logger.log(`Enviando advertencia de vencimiento a ${emailNoti} (Gerencia/RRHH) por el periodo ${reg.periodo}.`);
            await this.mailerService.sendMail({
              to: emailNoti,
              subject: 'Notificación de Vencimiento Próximo de Horas - ' + nombreCompleto,
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <p>Se notifica que el colaborador <strong>${nombreCompleto}</strong> posee <strong>${horasDisponiblesStr}</strong> horas de compensación del periodo <strong>${reg.periodo}</strong> sin utilizar.</p>
                  <p>Si el colaborador no utiliza estas horas dentro de los próximos 30 días, estas pasarán automáticamente a pago en su liquidación.</p>
                </div>
              `
            });
          }

          reg.notificado_vencimiento = true;
          await this.horasCompensacionRepo.save(reg);
          this.logger.log(`Registro de periodo ${reg.periodo} del empleado ${reg.empleado.empleado_id} marcado como notificado.`);
        } catch (error) {
          this.logger.error(`Error al enviar correo de notificación al empleado ${reg.empleado.empleado_id}: ${error.message}`);
        }
      }

      if (hoy >= expirationDate && !reg.procesado_pago_vencido) {
        try {
          this.logger.log(`Las horas de compensación del periodo ${reg.periodo} para el empleado ${reg.empleado.empleado_id} han vencido. Procesando traspaso a pago al periodo actual...`);
          
          // 1. Calcular el periodo actual basándose en cierreMes
          const dateActual = new Date(hoy);
          if (dateActual.getDate() > cierreMes) {
            dateActual.setMonth(dateActual.getMonth() + 1);
          }
          const periodoActualStr = `${dateActual.getFullYear()}-${String(dateActual.getMonth() + 1).padStart(2, '0')}`;

          // 2. Buscar o crear el registro de horas de compensación para el periodo actual
          let regActual = await this.horasCompensacionRepo.findOne({
            where: {
              empleado: { empleado_id: reg.empleado.empleado_id },
              periodo: periodoActualStr
            }
          });

          if (!regActual) {
            regActual = this.horasCompensacionRepo.create({
              empleado: reg.empleado,
              periodo: periodoActualStr,
              horas_extras: '00:00:00',
              horas_pagas: decimalToTime(disponibleDec),
              horas_compensacion: '00:00:00',
              horas_compensacion_consumidas: '00:00:00'
            });
          } else {
            const pagasActualDec = timeToDecimal(regActual.horas_pagas);
            regActual.horas_pagas = decimalToTime(pagasActualDec + disponibleDec);
          }

          // 3. Modificar el registro antiguo para restar las horas traspasadas de su balance de compensación
          const compensacionAntiguaDec = timeToDecimal(reg.horas_compensacion);
          reg.horas_compensacion = decimalToTime(compensacionAntiguaDec - disponibleDec);
          reg.procesado_pago_vencido = true;

          // Guardamos ambos registros
          await this.horasCompensacionRepo.save(reg);
          await this.horasCompensacionRepo.save(regActual);

          this.logger.log(`Traspaso completado con éxito. Se movieron ${decimalToTime(disponibleDec)} horas al periodo actual (${periodoActualStr}) para su pago.`);
        } catch (error) {
          this.logger.error(`Error al procesar el vencimiento y traspaso a pago del registro ${reg.id}: ${error.message}`);
        }
      }
    }

    this.logger.log('Finalizado cron de verificación de vencimientos.');
  }

  private getExpirationDate(periodo: string, cierreMes: number): Date {
    const [yearStr, monthStr] = periodo.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); 

    const targetDate = new Date(year, month - 1 + 5, 1);
    const expYear = targetDate.getFullYear();
    const expMonth = targetDate.getMonth(); 

    const daysInMonth = new Date(expYear, expMonth + 1, 0).getDate();
    const closingDay = Math.min(cierreMes, daysInMonth);

    const expirationDate = new Date(expYear, expMonth, closingDay + 1);
    expirationDate.setHours(0, 0, 0, 0);
    return expirationDate;
  }

  findAll() {
    return `This action returns all horasCompensacion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} horasCompensacion`;
  }

  update(id: number, updateHorasCompensacionDto: UpdateHorasCompensacionDto) {
    return `This action updates a #${id} horasCompensacion`;
  }

  remove(id: number) {
    return `This action removes a #${id} horasCompensacion`;
  }
}
