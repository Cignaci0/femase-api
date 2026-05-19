import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { CargosService } from './cargos.service';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { Cargo } from './entities/cargo.entity';

@Controller('cargos')
@UseGuards(AuthGuard)
export class CargosController {
  constructor(private readonly cargosService: CargosService) { }

  @Post('crear')
  create(
    @Body() createCargoDto: Cargo, 
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.cargosService.create(createCargoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll(@Req() req) {
    const userId = req.user.sub;
    return this.cargosService.findAll(userId);
  }

  @Patch('actualizar/:id')
  update(
    @Param('id') id: string, 
    @Body() updateCargoDto: UpdateCargoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.cargosService.update(+id, updateCargoDto, idUsuario, ip, userAgent);
  }

  @Get('por-empresa/:empresaId')
  cargosPorEmpresa(@Param('empresaId') empresaId: string) {
    if (isNaN(+empresaId)) return [];
    return this.cargosService.cargosPorEmpresa(+empresaId);
  }
}
