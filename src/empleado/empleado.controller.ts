import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe, Query, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { EmpleadoService } from './empleado.service';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { Empleado } from './entities/empleado.entity';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('empleado')
@UseGuards(AuthGuard)
export class EmpleadoController {
  constructor(private readonly empleadoService: EmpleadoService) { }


  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empleadoService.update(+id, updateEmpleadoDto, idUsuario, ip, userAgent);
  }

  @Post()
  create(
    @Body() createEmpleadoDto: Empleado,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empleadoService.create(createEmpleadoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('empresa_id') empresa_id?: string,
    @Query('estado_id') estado_id?: string,
    @Query('search') search?: string,
  ) {
    return this.empleadoService.findAll(
      +page || 1,
      +limit || 10,
      (empresa_id && !isNaN(+empresa_id)) ? +empresa_id : undefined,
      (estado_id && !isNaN(+estado_id)) ? +estado_id : undefined,
      search
    );
  }

  @Get('run/:run')
  findByRun(@Param('run') run: string) {
    return this.empleadoService.findByRun(run);
  }

  @Get('nombre/:nombre')
  findByNombre(@Param('nombre') nombre: string) {
    return this.empleadoService.findByNombre(nombre);
  }

  @Get('empresa/:empresa_id')
  findByEmpresa(@Param('empresa_id') empresa_id: string) {
    if (isNaN(+empresa_id)) return [];
    return this.empleadoService.findByEmpresa(+empresa_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empleadoService.remove(+id);
  }

  @Patch('cambiar-pin/:idUser/:pinActual/:pinFirma')
  cambiarPinFirma(
    @Param('idUser') idUser: string, 
    @Param('pinActual') pinActual: string, 
    @Param('pinFirma') pinFirma: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.empleadoService.cambiarPinFirma(+idUser, +pinActual, +pinFirma, ip, userAgent);
  }

  @Patch('cambiar-noti/:idusuario')
  cambiarNoti(@Param('idusuario') idusuario: string, @Body('noti_30_entrada') noti_30_entrada: boolean, @Body('noti_30_salida') noti_30_salida: boolean) {
    return this.empleadoService.cambiarNoti(+idusuario, noti_30_entrada, noti_30_salida);
  }

  @Get('obtener-noti/:idusuario')
  obtenerNoti(@Param('idusuario') idusuario: string) {
    return this.empleadoService.obtenerNoti(+idusuario);
  }
}
