import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { DepartamentosService } from './departamentos.service';
import { Departamento } from './departamento.entity';
import { UpdateDepartamentoDto } from './dto/update-departamento.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('departamentos')
@UseGuards(AuthGuard)
export class DepartamentosController {
  constructor(
    private departamentoService: DepartamentosService
  ) { }

  @Get('')
  obtenerTodosLosDeptos(@Req() req) {
    const userId = req.user.sub;
    return this.departamentoService.buscarTodosLosDepartamentos();
  }

  @Get('porEmpresa/:empresaId')
  obtenerDeptoPorEmpresa(@Param('empresaId') empresaId: string) {
    if (isNaN(+empresaId)) return [];
    return this.departamentoService.buscarDeptoPorEmpresa(+empresaId);
  }

  @Post('crear')
  crear(
    @Body() crearDepto: Departamento, 
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    const usuario = req.user.username;
    return this.departamentoService.crearDepartamento(crearDepto, usuario, idUsuario, ip, userAgent);
  }

  @Patch('actualizar/:deptoId')
  actualizar(
    @Param('deptoId') id: string, 
    @Body() updateDto: UpdateDepartamentoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.departamentoService.actualizarDepto(+id, updateDto, idUsuario, ip, userAgent);
  }
}