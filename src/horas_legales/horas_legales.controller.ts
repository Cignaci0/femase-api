import { Controller, Get, Post, Body, Patch, Param, Delete, Ip, Headers, Req } from '@nestjs/common';
import { HorasLegalesService } from './horas_legales.service';
import { CreateHorasLegaleDto } from './dto/create-horas_legale.dto';
import { UpdateHorasLegaleDto } from './dto/update-horas_legale.dto';

@Controller('horas-legales')
export class HorasLegalesController {
  constructor(private readonly horasLegalesService: HorasLegalesService) {}

  @Post()
  create(@Body() createHorasLegaleDto: CreateHorasLegaleDto) {
    return this.horasLegalesService.create(createHorasLegaleDto);
  }

  @Get()
  findAll() {
    return this.horasLegalesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.horasLegalesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateHorasLegaleDto: UpdateHorasLegaleDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.horasLegalesService.update(+id, updateHorasLegaleDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horasLegalesService.remove(+id);
  }
}
