import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TurnoFlexibleService } from './turno-flexible.service';
import { CreateTurnoFlexibleDto } from './dto/create-turno-flexible.dto';
import { UpdateTurnoFlexibleDto } from './dto/update-turno-flexible.dto';

@Controller('turno-flexible')
export class TurnoFlexibleController {
  constructor(private readonly turnoFlexibleService: TurnoFlexibleService) {}

  @Post()
  create(@Body() createTurnoFlexibleDto: CreateTurnoFlexibleDto) {
    return this.turnoFlexibleService.create(createTurnoFlexibleDto);
  }

  @Get()
  findAll() {
    return this.turnoFlexibleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.turnoFlexibleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTurnoFlexibleDto: UpdateTurnoFlexibleDto) {
    return this.turnoFlexibleService.update(+id, updateTurnoFlexibleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.turnoFlexibleService.remove(+id);
  }
}
