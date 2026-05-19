import { Injectable } from '@nestjs/common';
import { CreateDiasCompensacionDto } from './dto/create-dias_compensacion.dto';
import { UpdateDiasCompensacionDto } from './dto/update-dias_compensacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiasCompensacion } from './entities/dias_compensacion.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DiasCompensacionService {

  constructor(
    @InjectRepository(DiasCompensacion)
    private readonly diasCompensacionRepository: Repository<DiasCompensacion>,
  ) { }

  create(createDiasCompensacionDto: CreateDiasCompensacionDto) {
    //hola
  }

  findAll() {
    return `This action returns all diasCompensacion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} diasCompensacion`;
  }

  update(id: number, updateDiasCompensacionDto: UpdateDiasCompensacionDto) {
    return `This action updates a #${id} diasCompensacion`;
  }

  remove(id: number) {
    return `This action removes a #${id} diasCompensacion`;
  }
}
