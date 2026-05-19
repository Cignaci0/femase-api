import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DiasCompensacionService } from './dias_compensacion.service';
import { CreateDiasCompensacionDto } from './dto/create-dias_compensacion.dto';
import { UpdateDiasCompensacionDto } from './dto/update-dias_compensacion.dto';

@Controller('dias-compensacion')
export class DiasCompensacionController {
  constructor(private readonly diasCompensacionService: DiasCompensacionService) {}

  @Post()
  create(@Body() createDiasCompensacionDto: CreateDiasCompensacionDto) {
    return this.diasCompensacionService.create(createDiasCompensacionDto);
  }

  @Get()
  findAll() {
    return this.diasCompensacionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.diasCompensacionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiasCompensacionDto: UpdateDiasCompensacionDto) {
    return this.diasCompensacionService.update(+id, updateDiasCompensacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.diasCompensacionService.remove(+id);
  }
}
