import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { DispositivoService } from './dispositivo.service';
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('dispositivo')
@UseGuards(AuthGuard)
export class DispositivoController {
  constructor(private readonly dispositivoService: DispositivoService) { }

  @Post('crear')
  async create(
    @Body() createDispositivoDto: CreateDispositivoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return await this.dispositivoService.create(createDispositivoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll() {
    return this.dispositivoService.findAll();
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateDispositivoDto: UpdateDispositivoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.dispositivoService.update(+id, updateDispositivoDto, idUsuario, ip, userAgent);
  }

  @Get('buscarPorempleado/:rut')
  buscarPorEmpleado(@Param('rut') rut: string) {
    return this.dispositivoService.buscarDispositivosPorEmpleado(rut);
  }
}
