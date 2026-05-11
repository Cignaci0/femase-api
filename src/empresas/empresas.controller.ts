import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmpresasService } from './empresas.service';
import { Empresa } from './empresas.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';



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
  create(@Body() crearEmpresa: Empresa) {
    return this.empresaService.create(crearEmpresa);
  }

  @Patch('actualizar/:id')
  actualizar(@Param('id') id: string, @Body() updateDto: UpdateEmpresaDto) {
    return this.empresaService.actualizarEmpresa(+id, updateDto);
  }

  @Patch('actualizarHorario/:id/:horario')
  actualizarHorarioEmpresa(@Param('id') id: string, @Param('horario') horario: string) {
    return this.empresaService.actualizarHorario(+id, +horario);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './imgEmpresas',
        filename: (req, file, cb) => {
          const empresaId = req.params.id;
          const randomName = Date.now();
          cb(null, `empresa_${empresaId}_${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Formato de archivo no permitido'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.empresaService.actualizarLogo(id, file.filename);
  }

  @Get(':id/logo')
  async obtenerLogoEmpresa(@Param('id') id: string, @Res() res: Response) {
    const filename = await this.empresaService.obtenerLogoEmpresa(+id);
    const filePath = join(__dirname, '../../imgEmpresas', filename);
    return res.sendFile(filePath);
  }
}