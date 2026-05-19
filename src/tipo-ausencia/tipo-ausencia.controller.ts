import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { TipoAusenciaService } from './tipo-ausencia.service';
import { CreateTipoAusenciaDto } from './dto/create-tipo-ausencia.dto';
import { UpdateTipoAusenciaDto } from './dto/update-tipo-ausencia.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('tipo-ausencia')
@UseGuards(AuthGuard)
export class TipoAusenciaController {
  constructor(private readonly tipoAusenciaService: TipoAusenciaService) {}

  @Post("crear")
  create(
    @Body() createTipoAusenciaDto: CreateTipoAusenciaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoAusenciaService.create(createTipoAusenciaDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll() {
    return this.tipoAusenciaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipoAusenciaService.findOne(+id);
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateTipoAusenciaDto: UpdateTipoAusenciaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoAusenciaService.update(+id, updateTipoAusenciaDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tipoAusenciaService.remove(+id);
  }
}
