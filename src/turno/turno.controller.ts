import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put, Ip, Headers } from '@nestjs/common';
import { TurnoService } from './turno.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { Turno } from './entities/turno.entity';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('turno')
@UseGuards(AuthGuard)
export class TurnoController {
  constructor(private readonly turnoService: TurnoService) { }

  @Post()
  create(
    @Body() createTurnoDto: Turno, 
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.turnoService.create(createTurnoDto, idUsuario, ip, userAgent);
  }

  @Get(':empresa_id')
  findAll(@Param("empresa_id") empresa_id: string) {
    if (isNaN(+empresa_id)) return [];
    return this.turnoService.findAll(+empresa_id);
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateTurnoDto: UpdateTurnoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.turnoService.update(+id, updateTurnoDto, idUsuario, ip, userAgent);
  }

  @Patch('asignar-empleados/:id')
  asignarEmpleados(
    @Param('id') id: string, 
    @Body("empleadosIds") empleadosIds: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.turnoService.asignarEmpleados(+id, empleadosIds, idUsuario, ip, userAgent);
  }

  @Patch('asignar-turnos/:idturno/:idcenco')
  asignarCencos(
    @Param('idturno') idturno: string, 
    @Param('idcenco') idcenco: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.turnoService.asignarCenco(+idturno, +idcenco, idUsuario, ip, userAgent);
  }

  @Patch('asignar-horario/:id')
  @UseGuards(AuthGuard)
  asignarHorario(
    @Param('id') id_turno: string,
    @Body('id_dia') id_dia: number[],
    @Body('id_horario') id_horario: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const usuario = req.user.username;
    const idUsuario = req.user.sub;
    return this.turnoService.asignarHorario(+id_turno, id_dia, id_horario, usuario, idUsuario, ip, userAgent);
  }

  @Get("obtener-horario/:id")
  obtenerHorario(@Param("id") id_turno: string) {
    return this.turnoService.obtenerHorarioPorTurno(+id_turno);
  }

}
