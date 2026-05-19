import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { PerfilesService } from './perfiles.service';
import { Perfil } from './perfil.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@Controller('perfiles')
@UseGuards(AuthGuard)
export class PerfilesController {
  constructor(
    private perfilService: PerfilesService
  ) { }

  @Get('')
  obtenerPerfiles() {
    return this.perfilService.obtenerTodosLosPerfiles();
  }

  @Post('crear')
  crearNuevoPerfil(
    @Body() crearPerfilDTO: Perfil, 
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.perfilService.crearPerfil(crearPerfilDTO, idUsuario, ip, userAgent);
  }

  @Patch('actualizar/:id')
  actualizar(
    @Param('id') id: string, 
    @Body() updateDto: UpdatePerfilDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.perfilService.actualizarPerfil(+id, updateDto, idUsuario, ip, userAgent);
  }

  @Put('asignar-menus/:id')
  async asignarMenus(
    @Param('id', ParseIntPipe) id: number,
    @Body('moduloIds') moduloIds: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return await this.perfilService.asignarModulos(id, moduloIds, idUsuario, ip, userAgent);
  }
}
