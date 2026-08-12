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
  ) { }

  async create(createHuellaDto: CreateHuellaDto): Promise<Huella> {
    const nuevaHuella = this.huellaRepository.create(createHuellaDto);
    return await this.huellaRepository.save(nuevaHuella);
  }

  async findAll(num_ficha?: string, dispositivo_id?: number) {
    const where: any = {};

    if (num_ficha) {
      where.num_ficha = num_ficha;
    }

    if (dispositivo_id) {
      where.dispositivo_id = dispositivo_id;
    }

    const huellas = await this.huellaRepository.find({
      where,
    });

    const grupos: { [num_ficha: string]: { huellas: { indice: number; huella_xml: string; dispositivo_id: number }[]; dispositivo_id: number } } = {};

    for (const h of huellas) {
      const ficha = h.num_ficha || '';
      if (!grupos[ficha]) {
        grupos[ficha] = {
          dispositivo_id: h.dispositivo_id,
          huellas: [],
        };
      }
      grupos[ficha].huellas.push({
        indice: h.indice,
        huella_xml: h.huella_xml,
        dispositivo_id: h.dispositivo_id,
      });
    }

    return Object.entries(grupos).map(([ficha, data]) => ({
      num_ficha: ficha,
      cantidad_huellas: data.huellas.length,
      dispositivo_id: data.dispositivo_id,
      huellas: data.huellas,
    }));
  }

  async findAllPagination(
    page: number = 1,
    limit: number = 10,
    num_ficha?: string,
    dispositivo_id?: number,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (num_ficha) {
      where.num_ficha = num_ficha;
    }

    if (dispositivo_id) {
      where.dispositivo_id = dispositivo_id;
    }

    const [huellas, total] = await this.huellaRepository.findAndCount({
      where,
      order: {
        num_ficha: 'ASC',
        indice: 'ASC',
      },
      take: limit,
      skip: skip,
    });

    const grupos: {
      [num_ficha: string]: {
        huellas: {
          indice: number;
          huella_xml: string;
          dispositivo_id: number;
        }[];
        dispositivo_id: number;
      };
    } = {};

    for (const h of huellas) {
      const ficha = h.num_ficha || '';

      if (!grupos[ficha]) {
        grupos[ficha] = {
          dispositivo_id: h.dispositivo_id,
          huellas: [],
        };
      }

      grupos[ficha].huellas.push({
        indice: h.indice,
        huella_xml: h.huella_xml,
        dispositivo_id: h.dispositivo_id,
      });
    }

    const data = Object.entries(grupos).map(([ficha, data]) => ({
      num_ficha: ficha,
      cantidad_huellas: data.huellas.length,
      dispositivo_id: data.dispositivo_id,
      huellas: data.huellas,
    }));

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findByDispositivo(dispositivo_id: number) {
    return this.findAll(undefined, dispositivo_id);
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
