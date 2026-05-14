import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { TipoMarcasService } from './tipo-marcas.service';
import { CreateTipoMarcaDto } from './dto/create-tipo-marca.dto';
import { UpdateTipoMarcaDto } from './dto/update-tipo-marca.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('tipo-marcas')
@UseGuards(AuthGuard)
export class TipoMarcasController {
  constructor(private readonly tipoMarcasService: TipoMarcasService) {}

  @Post()
  create(
    @Body() createTipoMarcaDto: CreateTipoMarcaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoMarcasService.create(createTipoMarcaDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll() {
    return this.tipoMarcasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipoMarcasService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateTipoMarcaDto: UpdateTipoMarcaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoMarcasService.update(+id, updateTipoMarcaDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tipoMarcasService.remove(+id);
  }
}
