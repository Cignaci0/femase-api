import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TareaHuella } from './entities/tarea-huella.entity';
import { CreateTareaHuellaDto } from './dto/create-tarea-huella.dto';

@Injectable()
export class TareasHuellasService {
  constructor(
    @InjectRepository(TareaHuella)
    private readonly tareaHuellaRepository: Repository<TareaHuella>,
  ) { }

  async create(createDto: CreateTareaHuellaDto) {
    const { huellas, dispositivo_id, num_ficha, estado } = createDto;
    const estadoInicial = estado || 'NP';

    // Si no vienen huellas, crear una sola tarea sin huella
    const huellasAProcesar = huellas && huellas.length > 0 ? huellas : [{ huella: null, indice: null }];

    const nuevasTareas = huellasAProcesar.map((item) =>
      this.tareaHuellaRepository.create({
        huella: item.huella ?? null,
        indice: item.indice ?? null,
        dispositivo_id,
        num_ficha,
        estado: estadoInicial,
      }),
    );

    const guardadas = await this.tareaHuellaRepository.save(nuevasTareas);

    return {
      message: `${guardadas.length} tarea(s) de huella registrada(s) exitosamente`,
      data: {
        dispositivo_id,
        num_ficha,
        estado: estadoInicial,
        huellas: guardadas.map((t) => ({
          tarea_id: t.tarea_id,
          huella: t.huella,
          indice: t.indice,
        })),
      },
    };
  }

  async findAll(dispositivo_id?: number, num_ficha?: string, estado?: string) {
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

    const tareas = await this.tareaHuellaRepository.find({
      where,
      order: { tarea_id: 'ASC' },
    });

    // Agrupar por num_ficha + dispositivo_id
    const grupos = new Map<string, any>();

    for (const t of tareas) {
      const key = `${t.num_ficha}__${t.dispositivo_id}`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          dispositivo_id: t.dispositivo_id,
          num_ficha: t.num_ficha,
          estado: t.estado,
          huellas: [],
        });
      }

      grupos.get(key).huellas.push({
        tarea_id: t.tarea_id,
        huella: t.huella,
        indice: t.indice,
      });
    }

    return Array.from(grupos.values());
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
