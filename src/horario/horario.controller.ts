import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { HorarioService } from './horario.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { Horario } from './entities/horario.entity';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('horario')
@UseGuards(AuthGuard)
export class HorarioController {
  constructor(private readonly horarioService: HorarioService) { }

  @Post("crear")
  create(
    @Body() createHorarioDto: Horario,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.horarioService.create(createHorarioDto, idUsuario, ip, userAgent);
  }

  @Get(":empresa_id")
  findAll(@Param("empresa_id") empresa_id: string) {
    if (isNaN(+empresa_id)) return [];
    return this.horarioService.findAll(+empresa_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateHorarioDto: UpdateHorarioDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.horarioService.update(+id, updateHorarioDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horarioService.remove(+id);
  }
}
