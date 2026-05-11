import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { Empresa } from './empresas.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


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
  } c

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
        destination: 'C:\\Users\\ADMINISTRATIVO\\Documents\\Proyectos\\API\\api-femase-fmc\\imgEmpresas',
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
  obtenerLogoEmpresa(@Param('id') id: string) {
    return this.empresaService.obtenerLogoEmpresa(+id);
  }


}