import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { VacacionesService } from './vacaciones.service';
import { CreateVacacioneDto } from './dto/create-vacacione.dto';
import { UpdateVacacioneDto } from './dto/update-vacacione.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('vacaciones')
@UseGuards(AuthGuard)
export class VacacionesController {
  constructor(private readonly vacacionesService: VacacionesService) { }

  @Patch('aprobar-rechazar')
  aprobarRechazarSolicitud(
    @Query('idSolicitud') idSolicitud: number,
    @Query('estado') estado: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.vacacionesService.aprobarRechazarSolicitud(idSolicitud, estado, req.user.username, idUsuario, ip, userAgent);
  }

  @Get('dias-disponibles')
  getDiasDisponibles(@Req() req: any) {
    const numFicha = req.user.num_ficha;
    return this.vacacionesService.getDiasDisponibles(numFicha);
  }

  @Get()
  findAll(@Query('numFicha') numFicha: string, @Query('fechaInicio') fechaInicio?: Date, @Query('fechaFin') fechaFin?: Date) {
    return this.vacacionesService.findAll(numFicha, fechaInicio, fechaFin);
  }

  @Post('solicitud')
  createSolicitudVacaciones(
    @Body() createVacacioneDto: CreateVacacioneDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.vacacionesService.createSolicitudVacaciones(createVacacioneDto, req.user.num_ficha, req.user.username, idUsuario, ip, userAgent);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVacacioneDto: UpdateVacacioneDto) {
    return this.vacacionesService.update(+id, updateVacacioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vacacionesService.remove(+id);
  }
}