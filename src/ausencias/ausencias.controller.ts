import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { CreateAusenciaDto } from './dto/create-ausencia.dto';
import { UpdateAusenciaDto } from './dto/update-ausencia.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('ausencias')
@UseGuards(AuthGuard)
export class AusenciasController {
  constructor(private readonly ausenciasService: AusenciasService) {}

  @Post()
  create(
    @Body() createAusenciaDto: CreateAusenciaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.ausenciasService.create(createAusenciaDto, idUsuario, ip, userAgent);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateAusenciaDto: UpdateAusenciaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.ausenciasService.update(+id, updateAusenciaDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ausenciasService.remove(+id);
  }

  @Get()
  findAll(@Query() query: {numFicha: string, fechaInicio?: Date, fechaFin: Date}){
    return this.ausenciasService.findAll(query.numFicha, query.fechaInicio, query.fechaFin);
  }
}
