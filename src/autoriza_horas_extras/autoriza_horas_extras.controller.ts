import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AutorizaHorasExtrasService } from './autoriza_horas_extras.service';
import { DetalleAsistenciaService } from 'src/detalle-asistencia/detalle-asistencia.service';
import { CreateAutorizaHorasExtraDto } from './dto/create-autoriza_horas_extra.dto';
import { UpdateAutorizaHorasExtraDto } from './dto/update-autoriza_horas_extra.dto';

@Controller('autoriza-horas-extras')
export class AutorizaHorasExtrasController {
  constructor(
    private readonly autorizaHorasExtrasService: AutorizaHorasExtrasService,
    private readonly detalleAsistenciaService: DetalleAsistenciaService
  ) {}

  @Post()
  create(@Body() createAutorizaHorasExtraDto: CreateAutorizaHorasExtraDto) {
    return this.autorizaHorasExtrasService.create(createAutorizaHorasExtraDto.numFicha);
  }

  @Get()
  async findAll(@Query("numFicha") numFicha?: string, @Query("fechaInicio") fechaInicio?: string, @Query("fechaFin") fechaFin?: string) {
    if (numFicha && fechaInicio && fechaFin) {
      await this.detalleAsistenciaService.calcularAsistencia(numFicha, fechaInicio, fechaFin);
      return this.autorizaHorasExtrasService.findAll(numFicha, new Date(fechaInicio), new Date(fechaFin));
    }
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.autorizaHorasExtrasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAutorizaHorasExtraDto: UpdateAutorizaHorasExtraDto) {
    return this.autorizaHorasExtrasService.update(+id, updateAutorizaHorasExtraDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.autorizaHorasExtrasService.remove(+id);
  }
}
