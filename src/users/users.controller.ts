import { Body, Controller, Get, Header, Ip, Param, ParseIntPipe, Patch, Post, Put, UseGuards, Headers, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UpdateUsuarioDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private userService: UsersService) { }
  @Get('')
  buscarTodosLosEmpleados() {
    return this.userService.buscarTodosLosUsuarios();
  }

  @Get('buscarPorId/:usuarioId')
  buscarPorId(@Param() params) {
    return this.userService.buscarUsuarioPorId(params.usuarioId);
  }

  @Post('crear')
  crearCuenta(@Req() req: any, @Body() createUserDTO: User, @Ip() ip: string, @Headers('user-agent') userAgent: string) {
    const idUsuario = req.user.sub;
    return this.userService.crearUsuario(idUsuario, createUserDTO, ip, userAgent);
  }

  @Get('recuperar-clave/:run')
  async recuperar(@Param('run') run: string) {
    return await this.userService.recuperarClave(run);
  }

  @Post('resetear-clave')
  async resetear(@Body() body: any) {
    const { run, codigo, nuevaClave } = body;
    return await this.userService.actualizarClave(run, codigo, nuevaClave);
  }

  @Get('crear-usuario-dt/:correoDT')
  async crearFiscalizador(@Param('correoDT') correoDT: string) {
    return await this.userService.crearUsuarioDT(correoDT);
  }

  @Patch('actualizar/:id')
  actualizar(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: UpdateUsuarioDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.userService.actualizarUsuario(idUsuario, +id, updateDto, ip, userAgent);
  }

  @Put('asignar-cencos/:id')
  async asignarMenus(
    @Param('id', ParseIntPipe) id: number,
    @Body('cencoIds') cencoIds: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return await this.userService.asignarCenco(id, cencoIds, idUsuario, ip, userAgent);
  }

  @Get('buscar-cencos/:usuarioId')
  async buscarCencosPorUsuario(@Param('usuarioId') id: string) {
    return this.userService.enviarCencosPorUsuario(+id);
  }

  @Put('cambiar-password/:idUser')
  async cambiarPassword(
    @Param('idUser') idUser: string,
    @Body() body: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const { contrasena_actual, contrasena_nueva } = body;
    return await this.userService.cambiarpasswors(contrasena_actual, contrasena_nueva, +idUser, ip, userAgent);
  }

  @Get('obtener-admin/:idEmpresa')
  async obtenerAdminPorEmpresa(@Param('idEmpresa') idEmpresa: string) {
    return await this.userService.obtenerAdminPorEmpresa(+idEmpresa);
  }

  @Get('obtener-usuarios/:idEmpresa')
  async obtenerUsuariosPorEmpresa(@Param('idEmpresa') idEmpresa: string) {
    return await this.userService.obtenerUserporEmpresa(+idEmpresa);
  }
}