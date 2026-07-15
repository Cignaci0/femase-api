import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateHorasCompensacionDto } from './dto/create-horas_compensacion.dto';
import { UpdateHorasCompensacionDto } from './dto/update-horas_compensacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Repository, In } from 'typeorm';
import { HorasCompensacion } from './entities/horas_compensacion.entity';

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
  constructor(
    @InjectRepository(Empleado)
    private empleadoRepo: Repository<Empleado>,
    @InjectRepository(HorasCompensacion)
    private horasCompensacionRepo: Repository<HorasCompensacion>,
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
    const user = await this.horasCompensacionRepo.manager.findOne(User, { where: { usuario_id: usuarioId }, relations: ['empleado'] });
    let empleadoId = user?.empleado?.empleado_id;
    if (!empleadoId && user?.run_usuario) {
      const emp = await this.horasCompensacionRepo.manager.findOne(Empleado, { where: { run: user.run_usuario } });
      if (emp) empleadoId = emp.empleado_id;
    }

    if (!empleadoId) {
      throw new BadRequestException(`El usuario ${usuarioId} no tiene un empleado asociado o no se pudo encontrar.`);
    }

    const periodosValidos: string[] = [];
    const date = new Date();
    // Generamos los últimos 6 periodos (meses) incluyendo el actual
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
    const periodosValidos: string[] = [];
    const date = new Date();
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
