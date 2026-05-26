import { Injectable } from '@nestjs/common';
import { CreateDiasCompensacionAprobadaDto } from './dto/create-dias_compensacion_aprobada.dto';
import { UpdateDiasCompensacionAprobadaDto } from './dto/update-dias_compensacion_aprobada.dto';

@Injectable()
export class DiasCompensacionAprobadasService {
  create(createDiasCompensacionAprobadaDto: CreateDiasCompensacionAprobadaDto) {
    return 'This action adds a new diasCompensacionAprobada';
  }

  findAll() {
    return `This action returns all diasCompensacionAprobadas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} diasCompensacionAprobada`;
  }

  update(id: number, updateDiasCompensacionAprobadaDto: UpdateDiasCompensacionAprobadaDto) {
    return `This action updates a #${id} diasCompensacionAprobada`;
  }

  remove(id: number) {
    return `This action removes a #${id} diasCompensacionAprobada`;
  }
}
