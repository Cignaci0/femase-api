import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateHuellaDto } from './dto/create-huella.dto';
import { UpdateHuellaDto } from './dto/update-huella.dto';
import { Huella } from './entities/huella.entity';

@Injectable()
export class HuellasService {
  constructor(
    @InjectRepository(Huella)
    private readonly huellaRepository: Repository<Huella>,
  ) {}

  async create(createHuellaDto: CreateHuellaDto): Promise<Huella> {
    const nuevaHuella = this.huellaRepository.create(createHuellaDto);
    return await this.huellaRepository.save(nuevaHuella);
  }

  async findAll(num_ficha?: string, dispositivo_id?: number): Promise<Huella[]> {
    const where: any = {};

    if (num_ficha) {
      where.num_ficha = num_ficha;
    }

    if (dispositivo_id) {
      where.dispositivo_id = dispositivo_id;
    }

    return await this.huellaRepository.find({
      where,
      relations: ['empleado', 'dispositivo'],
    });
  }

  async findOne(id: number): Promise<Huella> {
    const huella = await this.huellaRepository.findOne({
      where: { huella_id: id },
      relations: ['empleado', 'dispositivo'],
    });

    if (!huella) {
      throw new NotFoundException(`Huella con ID ${id} no encontrada`);
    }

    return huella;
  }

  async update(id: number, updateHuellaDto: UpdateHuellaDto): Promise<Huella> {
    const huella = await this.findOne(id);
    this.huellaRepository.merge(huella, updateHuellaDto);
    return await this.huellaRepository.save(huella);
  }

  async remove(id: number): Promise<{ message: string }> {
    const huella = await this.findOne(id);
    await this.huellaRepository.remove(huella);
    return { message: `Huella #${id} eliminada exitosamente` };
  }
}
