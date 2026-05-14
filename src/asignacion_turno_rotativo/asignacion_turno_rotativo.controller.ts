import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { AsignacionTurnoRotativoService } from './asignacion_turno_rotativo.service';
import { CreateAsignacionTurnoRotativoDto } from './dto/create-asignacion_turno_rotativo.dto';
import { UpdateAsignacionTurnoRotativoDto } from './dto/update-asignacion_turno_rotativo.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('asignacion-turno-rotativo')
@UseGuards(AuthGuard)
export class AsignacionTurnoRotativoController {
  constructor(private readonly asignacionTurnoRotativoService: AsignacionTurnoRotativoService) {}

  @Post()
  create(
    @Body() createAsignacionTurnoRotativoDto: CreateAsignacionTurnoRotativoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.asignacionTurnoRotativoService.create(createAsignacionTurnoRotativoDto, idUsuario, ip, userAgent);
  }

  @Get(":idEmpleado")
  findAll(@Param("idEmpleado") idEmpleado: string,
  @Query("page") page: string = "1"
  ) {
    return this.asignacionTurnoRotativoService.findAll(+idEmpleado, +page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asignacionTurnoRotativoService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateAsignacionTurnoRotativoDto: UpdateAsignacionTurnoRotativoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.asignacionTurnoRotativoService.update(+id, updateAsignacionTurnoRotativoDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.asignacionTurnoRotativoService.remove(+id, idUsuario, ip, userAgent);
  }
}
