import { Injectable } from '@nestjs/common';
import { CreateTurnoFlexibleDto } from './dto/create-turno-flexible.dto';
import { UpdateTurnoFlexibleDto } from './dto/update-turno-flexible.dto';

@Injectable()
export class TurnoFlexibleService {
  create(createTurnoFlexibleDto: CreateTurnoFlexibleDto) {
    return 'This action adds a new turnoFlexible';
  }

  findAll() {
    return `This action returns all turnoFlexible`;
  }

  findOne(id: number) {
    return `This action returns a #${id} turnoFlexible`;
  }

  update(id: number, updateTurnoFlexibleDto: UpdateTurnoFlexibleDto) {
    return `This action updates a #${id} turnoFlexible`;
  }

  remove(id: number) {
    return `This action removes a #${id} turnoFlexible`;
  }
}
