import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { MarcasService } from './marcas.service';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { CreateMarcaRechazoDto } from './dto/create-marca-rechazo.dto';
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
  create(
    @Body() createMarcaDto: CreateMarcaDto,
    @Req() req?: any,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string
  ) {
    const idUsuario = req?.user?.sub;
    return this.marcasService.create(createMarcaDto, idUsuario, ip, userAgent);
  }

  @Post('rechazo')
  createRechazo(@Body() createMarcaRechazoDto: CreateMarcaRechazoDto) {
    return this.marcasService.createMarcaRechazo(createMarcaRechazoDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Query("numFicha") numFicha: string, @Query("fechaInicio") fechaInicio: string, @Query("fechaFin") fechaFin: string) {
    if (numFicha && fechaInicio && fechaFin && numFicha !== '99999999-9A') {
      await this.detalleAsistenciaService.calcularAsistencia(numFicha, fechaInicio, fechaFin);
    }
    return this.marcasService.findAll(numFicha, fechaInicio, fechaFin);
  }

  @Get('rechazos')
  @UseGuards(AuthGuard)
  async findRechazos(
    @Query('page') page: string = '1', 
    @Query('limit') limit: string = '1000',
    @Query('empresaId') empresaId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    return await this.marcasService.findMarcasRechazo(
      parseInt(page, 10), 
      parseInt(limit, 10),
      empresaId ? parseInt(empresaId, 10) : undefined,
      fechaInicio,
      fechaFin
    );
  }

  @Get('rechazo')
  @UseGuards(AuthGuard)
  async findRechazo(
    @Query('page') page: string = '1', 
    @Query('limit') limit: string = '10',
    @Query('empresaId') empresaId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    return await this.marcasService.findMarcasRechazo(
      parseInt(page, 10), 
      parseInt(limit, 10),
      empresaId ? parseInt(empresaId, 10) : undefined,
      fechaInicio,
      fechaFin
    );
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
