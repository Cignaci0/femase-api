import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { TeletrabajoService } from './teletrabajo.service';

@Controller('teletrabajo')
export class TeletrabajoController {
  constructor(private readonly teletrabajoService: TeletrabajoService) { }

  @Post('asignar/:idEmpleado')
  @UseGuards(AuthGuard)
  asignarTeletrabajo(
    @Param('idEmpleado') idEmpleado: number,
    @Body() body: { fecha_inicio: string, fecha_fin: string },
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.teletrabajoService.asignarTeletrabajo(idEmpleado, body.fecha_inicio, body.fecha_fin, idUsuario, ip, userAgent);
  }

  @Get('tiene/:runEmpleado')
  tieneTeletrabajo(@Param('runEmpleado') runEmpleado: string) {
    return this.teletrabajoService.tieneTeletrabajo(runEmpleado);
  }

  @Get('obtenerTeletrabajos/:idEmpresa')
  obtenerTeletrabajos(
    @Param('idEmpresa') idEmpresa: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.teletrabajoService.obtenerTeletrabajos(idEmpresa, +page, +limit);
  }

  @Put('editarTeletrabajo/:idEmpleado/:id/:horarioId')
  @UseGuards(AuthGuard)
  editarTeletrabajo(
    @Param('idEmpleado') idEmpleado: number,
    @Param('id') id: number,
    @Param('horarioId') horarioId: number,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.teletrabajoService.editarTeletrabajo(idEmpleado, id, horarioId, idUsuario, ip, userAgent);
  }

  @Delete('eliminarTeletrabajo/:idEmpleado/:id')
  @UseGuards(AuthGuard)
  eliminarTeletrabajo(
    @Param('idEmpleado') idEmpleado: number,
    @Param('id') id: number,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.teletrabajoService.eliminarTeletrabajo(idEmpleado, id, idUsuario, ip, userAgent);
  }

  @Get("obtenerTeleEmpleado/:idEmpleado")
  obtenerTeletrabajosPorEmpleado(
    @Param('idEmpleado') idEmpleado: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.teletrabajoService.obtenerTeletrabajosPorEmpleado(idEmpleado, +page, +limit);
  }
}
