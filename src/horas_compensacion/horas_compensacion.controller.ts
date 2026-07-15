import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HorasCompensacionService } from './horas_compensacion.service';
import { CreateHorasCompensacionDto } from './dto/create-horas_compensacion.dto';
import { UpdateHorasCompensacionDto } from './dto/update-horas_compensacion.dto';

@Controller('horas-compensacion')
export class HorasCompensacionController {
  constructor(private readonly horasCompensacionService: HorasCompensacionService) {}

  @Post('transferir')
  transferirACompensacion(@Body() body: { usuarioId: number, periodo: string, horasATransferir: string }) {
    return this.horasCompensacionService.transferirACompensacion(body.usuarioId, body.periodo, body.horasATransferir);
  }

  @Post()
  create(@Body() createHorasCompensacionDto: CreateHorasCompensacionDto) {
    return this.horasCompensacionService.create(createHorasCompensacionDto);
  }

  @Get('saldo/:usuarioId')
  obtenerSaldo(@Param('usuarioId') usuarioId: string) {
    return this.horasCompensacionService.obtenerSaldoDisponible(+usuarioId);
  }

  @Get('empleado/:usuarioId')
  findAllPorEmpleado(@Param('usuarioId') usuarioId: string) {
    return this.horasCompensacionService.findAllPorEmpleado(+usuarioId);
  }

  @Get()
  findAll() {
    return this.horasCompensacionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.horasCompensacionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHorasCompensacionDto: UpdateHorasCompensacionDto) {
    return this.horasCompensacionService.update(+id, updateHorasCompensacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horasCompensacionService.remove(+id);
  }
}
