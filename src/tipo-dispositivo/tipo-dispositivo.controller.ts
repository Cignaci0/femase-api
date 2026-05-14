import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { TipoDispositivoService } from './tipo-dispositivo.service';
import { UpdateTipoDispositivoDto } from './dto/update-tipo-dispositivo.dto';
import { TipoDispositivo } from './entities/tipo-dispositivo.entity';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('tipo-dispositivo')
@UseGuards(AuthGuard)
export class TipoDispositivoController {
  constructor(private readonly tipoDispositivoService: TipoDispositivoService) {}

  @Post('crear')
  create(
    @Body() createTipoDispositivoDto: TipoDispositivo, 
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoDispositivoService.create(createTipoDispositivoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll() {
    return this.tipoDispositivoService.findAll();
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateTipoDispositivoDto: UpdateTipoDispositivoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.tipoDispositivoService.update(+id, updateTipoDispositivoDto, idUsuario, ip, userAgent);
  }
}
