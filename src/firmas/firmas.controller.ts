import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { FirmasService } from './firmas.service';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { UpdateFirmaDto } from './dto/update-firma.dto';

@Controller('firmas')
export class FirmasController {
  constructor(private readonly firmasService: FirmasService) { }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createFirmaDto: CreateFirmaDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.firmasService.create(createFirmaDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll(@Query('empresa_id') empresa_id: string, @Query('usuario_id') usuario_id: string) {
    if (isNaN(+empresa_id) || isNaN(+usuario_id)) return [];
    return this.firmasService.findAll(+empresa_id, +usuario_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.firmasService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  aprovarRechazarFirma(
    @Param('id') id: string,
    @Body() updateFirmaDto: UpdateFirmaDto,
    @Body('usuario_id') usuario_id: number,
    @Body('pin') pin: number,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.firmasService.aprovarRechazarFirma(+id, updateFirmaDto, usuario_id, pin, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.firmasService.remove(+id);
  }
}
