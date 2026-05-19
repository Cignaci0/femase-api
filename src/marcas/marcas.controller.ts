import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { MarcasService } from './marcas.service';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { DetalleAsistenciaService } from 'src/detalle-asistencia/detalle-asistencia.service';

@Controller('marcas')
export class MarcasController {
  constructor(
    private readonly marcasService: MarcasService,
    private readonly detalleAsistenciaService: DetalleAsistenciaService
  ) { }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createMarcaDto: CreateMarcaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.marcasService.create(createMarcaDto, idUsuario, ip, userAgent);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Query("numFicha") numFicha: string, @Query("fechaInicio") fechaInicio: string, @Query("fechaFin") fechaFin: string) {
    if (numFicha && fechaInicio && fechaFin) {
      await this.detalleAsistenciaService.calcularAsistencia(numFicha, fechaInicio, fechaFin);
    }
    return this.marcasService.findAll(numFicha, fechaInicio, fechaFin);
  }

  @Get('confirmar')
  async confirmarModificacion(
    @Query('token') token: string,
    @Query('accion') accion: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.marcasService.confirmarCambio(token, accion, ip, userAgent);
  }

  @Get(':hashcode')
  @UseGuards(AuthGuard)
  getMarcasByHash(
    @Param('hashcode') hashcode: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.marcasService.getMarcasByHash(hashcode, idUsuario, ip, userAgent);
  }
  @Get('id/:id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.marcasService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateMarcaDto: UpdateMarcaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.marcasService.update(+id, updateMarcaDto, req.user.username, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.marcasService.remove(+id, idUsuario, ip, userAgent);
  }
}
