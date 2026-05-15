import { Injectable } from '@nestjs/common';
import { CreateRegistroEventoDto } from './dto/create-registro_evento.dto';
import { UpdateRegistroEventoDto } from './dto/update-registro_evento.dto';
import { RegistroEvento } from './entities/registro_evento.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RegistroEventoService {
  @InjectRepository(RegistroEvento)
  private registroEventosRepository: Repository<RegistroEvento>;

  create(createRegistroEventoDto: CreateRegistroEventoDto) {
    return ""
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.registroEventosRepository.findAndCount({
      order: { id: 'DESC' },
      take: limit,
      skip: skip,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} registroEvento`;
  }

  update(id: number, updateRegistroEventoDto: UpdateRegistroEventoDto) {
    return `This action updates a #${id} registroEvento`;
  }

  remove(id: number) {
    return `This action removes a #${id} registroEvento`;
  }
}
