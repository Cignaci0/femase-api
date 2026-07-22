import { Controller, Get, Post, Body, Patch, Param, Query, Req, Ip, Headers } from '@nestjs/common';
import { SolicitudHorasCompensacionService } from './solicitud_horas_compensacion.service';

@Controller('solicitud-horas-compensacion')
export class SolicitudHorasCompensacionController {
  constructor(private readonly solicitudHorasCompensacionService: SolicitudHorasCompensacionService) {}

  @Post()
  create(
    @Body() body: { usuarioId: number; fecha_solicitada: string; horas_solicitadas: string; hora_inicio?: string; hora_fin?: string; momento_jornada?: 'INICIO' | 'FIN'; observacion?: string },
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req?.user?.sub || body.usuarioId;
    return this.solicitudHorasCompensacionService.create(body, idUsuario, ip, userAgent);
  }

  @Get('pendientes')
  buscarPendientes() {
    return this.solicitudHorasCompensacionService.buscarPendientes();
  }

  @Get('buscar')
  buscarFiltradas(
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.solicitudHorasCompensacionService.buscarFiltradas(
      usuarioId ? +usuarioId : undefined,
      fechaInicio,
      fechaFin
    );
  }

  @Patch(':id/aprobar')
  aprobar(
    @Param('id') id: string, 
    @Body() body: { autorizador: string },
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.solicitudHorasCompensacionService.aprobar(+id, body.autorizador, req?.user?.sub, ip, userAgent);
  }

  @Patch(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.solicitudHorasCompensacionService.rechazar(+id, req?.user?.sub, ip, userAgent);
  }
}
