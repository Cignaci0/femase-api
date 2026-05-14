import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { FeriadosService } from './feriados.service';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('feriados')
@UseGuards(AuthGuard)
export class FeriadosController {
  constructor(private readonly feriadosService: FeriadosService) { }

  @Post("crear")
  create(
    @Body() createFeriadoDto: CreateFeriadoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.feriadosService.create(createFeriadoDto, idUsuario, ip, userAgent);
  }

  @Post("seed")
  seed() {
    return this.feriadosService.seed();
  }

  @Get()
  findAll() {
    return this.feriadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feriadosService.findOne(+id);
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateFeriadoDto: UpdateFeriadoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.feriadosService.update(+id, updateFeriadoDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feriadosService.remove(+id);
  }
}
