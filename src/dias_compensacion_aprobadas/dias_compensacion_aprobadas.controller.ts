import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DiasCompensacionAprobadasService } from './dias_compensacion_aprobadas.service';
import { CreateDiasCompensacionAprobadaDto } from './dto/create-dias_compensacion_aprobada.dto';
import { UpdateDiasCompensacionAprobadaDto } from './dto/update-dias_compensacion_aprobada.dto';

@Controller('dias-compensacion-aprobadas')
export class DiasCompensacionAprobadasController {
  constructor(private readonly diasCompensacionAprobadasService: DiasCompensacionAprobadasService) {}

  @Post()
  create(@Body() createDiasCompensacionAprobadaDto: CreateDiasCompensacionAprobadaDto) {
    return this.diasCompensacionAprobadasService.create(createDiasCompensacionAprobadaDto);
  }

  @Get()
  findAll() {
    return this.diasCompensacionAprobadasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diasCompensacionAprobadasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiasCompensacionAprobadaDto: UpdateDiasCompensacionAprobadaDto) {
    return this.diasCompensacionAprobadasService.update(+id, updateDiasCompensacionAprobadaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diasCompensacionAprobadasService.remove(+id);
  }
}
