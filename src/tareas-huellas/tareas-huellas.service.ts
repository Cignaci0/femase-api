import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TareaHuella } from './entities/tarea-huella.entity';
import { CreateTareaHuellaDto } from './dto/create-tarea-huella.dto';

@Injectable()
export class TareasHuellasService {
  constructor(
    @InjectRepository(TareaHuella)
    private readonly tareaHuellaRepository: Repository<TareaHuella>,
  ) {}

  async create(createDto: CreateTareaHuellaDto) {
    const { huella, huellas, dispositivo_id, num_ficha, estado } = createDto;
    const estadoInicial = estado || 'NP';

    const huellasAProcesar: string[] = [];

    if (huellas && Array.isArray(huellas) && huellas.length > 0) {
      huellasAProcesar.push(...huellas);
    } else if (huella) {
      huellasAProcesar.push(huella);
    } else {
      throw new BadRequestException('Debe proporcionar al menos una huella en "huella" o "huellas"');
    }

    const nuevasTareas = huellasAProcesar.map((itemHuella) =>
      this.tareaHuellaRepository.create({
        huella: itemHuella,
        dispositivo_id,
        num_ficha,
        estado: estadoInicial,
      }),
    );

    const guardadas = await this.tareaHuellaRepository.save(nuevasTareas);

    return {
      message: `${guardadas.length} tarea(s) de huella registrada(s) exitosamente`,
      data: guardadas,
    };
  }

  async findAll(dispositivo_id?: number, num_ficha?: string, estado?: string): Promise<TareaHuella[]> {
    const where: any = {};

    if (dispositivo_id) {
      where.dispositivo_id = dispositivo_id;
    }

    if (num_ficha) {
      where.num_ficha = num_ficha;
    }

    if (estado) {
      where.estado = estado;
    }

    return await this.tareaHuellaRepository.find({
      where,
      relations: ['dispositivo', 'empleado'],
      order: { tarea_id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<TareaHuella> {
    const tarea = await this.tareaHuellaRepository.findOne({
      where: { tarea_id: id },
      relations: ['dispositivo', 'empleado'],
    });

    if (!tarea) {
      throw new NotFoundException(`Tarea de huella con ID ${id} no encontrada`);
    }

    return tarea;
  }

  async updateEstado(id: number, estado: string) {
    const tarea = await this.findOne(id);
    tarea.estado = estado;
    const actualizada = await this.tareaHuellaRepository.save(tarea);
    return {
      message: `Estado de la tarea #${id} actualizado a '${estado}'`,
      data: actualizada,
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const tarea = await this.findOne(id);
    await this.tareaHuellaRepository.remove(tarea);
    return { message: `Tarea #${id} eliminada exitosamente` };
  }
}
