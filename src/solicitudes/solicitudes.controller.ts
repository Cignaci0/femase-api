import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudeDto } from './dto/create-solicitude.dto';
import { UpdateSolicitudeDto } from './dto/update-solicitude.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createSolicitudeDto: CreateSolicitudeDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.solicitudesService.create(createSolicitudeDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll(@Query('id_empresa') id_empresa?: number) {
    return this.solicitudesService.findAll(id_empresa);
  }

  @Get('empleado/:idUsuario')
  findByEmpleado(@Param('idUsuario') idUsuario: string) {
    return this.solicitudesService.findByEmpleado(+idUsuario);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.solicitudesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateSolicitudeDto: UpdateSolicitudeDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.solicitudesService.update(+id, updateSolicitudeDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.solicitudesService.remove(+id);
  }
}
