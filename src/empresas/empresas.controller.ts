import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors, Res, Ip, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { EmpresasService } from './empresas.service';
import { Empresa } from './empresas.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Multer } from 'multer';

@Controller('empresas')
@UseGuards(AuthGuard)
export class EmpresasController {
  constructor(
    private empresaService: EmpresasService
  ) { }

  @Get('')
  obtenerTodasLasEmpresas(@Req() req) {
    const usuarioId = req.user.sub;
    const usuario = req.user.username;
    return this.empresaService.obtenerTodasLasEmpresas(usuarioId, usuario);
  }

  @Post('crear')
  create(
    @Body() crearEmpresa: Empresa,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empresaService.create(crearEmpresa, idUsuario, ip, userAgent);
  }

  @Patch('actualizar/:id')
  actualizar(
    @Param('id') id: string, 
    @Body() updateDto: UpdateEmpresaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empresaService.actualizarEmpresa(+id, updateDto, idUsuario, ip, userAgent);
  }

  @Patch('actualizarHorario/:id/:horario')
  actualizarHorarioEmpresa(
    @Param('id') id: string, 
    @Param('horario') horario: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empresaService.actualizarHorario(+id, +horario, idUsuario, ip, userAgent);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './imgEmpresas',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empresaService.actualizarLogo(id, file.filename, idUsuario, ip, userAgent);
  }

  @Get(':id/logo')
  async obtenerLogoEmpresa(@Param('id') id: string, @Res() res: Response) {
    const filename = await this.empresaService.obtenerLogoEmpresa(+id);
    const filePath = join(__dirname, '../../imgEmpresas', filename);
    return res.sendFile(filePath);
  }

  @Get("cierreMes/:id")
  async obtenerCierreMes(@Param("id") id: string) {
    return this.empresaService.obtenerCierreMes(+id);
  }

  @Patch('cierreMes/:id/:cierreMes')
  actualizarCierreMesEmpresa(
    @Param('id') id: string,
    @Param('cierreMes') cierreMes: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.empresaService.actualizarCierreMes(+id, +cierreMes, idUsuario, ip, userAgent);
  }
}