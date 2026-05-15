import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RegistroEventoService } from './registro_evento.service';
import { CreateRegistroEventoDto } from './dto/create-registro_evento.dto';
import { UpdateRegistroEventoDto } from './dto/update-registro_evento.dto';

@Controller('registro-evento')
export class RegistroEventoController {
  constructor(private readonly registroEventoService: RegistroEventoService) {}

  @Post()
  create(@Body() createRegistroEventoDto: CreateRegistroEventoDto) {
    return this.registroEventoService.create(createRegistroEventoDto);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.registroEventoService.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registroEventoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegistroEventoDto: UpdateRegistroEventoDto) {
    return this.registroEventoService.update(+id, updateRegistroEventoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registroEventoService.remove(+id);
  }
}
