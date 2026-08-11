import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TareasHuellasService } from './tareas-huellas.service';
import { CreateTareaHuellaDto } from './dto/create-tarea-huella.dto';
import { UpdateTareaHuellaDto } from './dto/update-tarea-huella.dto';

@ApiTags('tareas-huellas')
@Controller('tareas-huellas')
export class TareasHuellasController {
  constructor(private readonly tareasHuellasService: TareasHuellasService) {}

  @Post()
  create(@Body() createDto: CreateTareaHuellaDto) {
    return this.tareasHuellasService.create(createDto);
  }

  @Get()
  @ApiQuery({ name: 'dispositivo_id', required: false, type: Number, description: 'Filtrar por ID de dispositivo' })
  @ApiQuery({ name: 'num_ficha', required: false, type: String, description: 'Filtrar por número de ficha del empleado' })
  @ApiQuery({ name: 'estado', required: false, type: String, description: 'Filtrar por estado (NP = No procesada, C = Completada)' })
  findAll(
    @Query('dispositivo_id') dispositivoId?: string,
    @Query('num_ficha') numFicha?: string,
    @Query('estado') estado?: string,
  ) {
    const dispositivo_id = dispositivoId ? Number(dispositivoId) : undefined;
    return this.tareasHuellasService.findAll(dispositivo_id, numFicha, estado);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tareasHuellasService.findOne(id);
  }

  @Put(':id')
  updateEstadoPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTareaHuellaDto,
  ) {
    return this.tareasHuellasService.updateEstado(id, updateDto.estado);
  }

  @Patch(':id')
  updateEstadoPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTareaHuellaDto,
  ) {
    return this.tareasHuellasService.updateEstado(id, updateDto.estado);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tareasHuellasService.remove(id);
  }
}
