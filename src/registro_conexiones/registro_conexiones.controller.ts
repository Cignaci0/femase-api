import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RegistroConexionesService } from './registro_conexiones.service';
import { CreateRegistroConexioneDto } from './dto/create-registro_conexione.dto';
import { UpdateRegistroConexioneDto } from './dto/update-registro_conexione.dto';

@Controller('registro-conexiones')
export class RegistroConexionesController {
  constructor(private readonly registroConexionesService: RegistroConexionesService) {}

  @Post()
  create(@Body() createRegistroConexioneDto: CreateRegistroConexioneDto) {
    return this.registroConexionesService.create(createRegistroConexioneDto);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('idEmpresa') idEmpresa?: string,
  ) {
    return this.registroConexionesService.findAll(
      Number(page),
      Number(limit),
      idEmpresa ? Number(idEmpresa) : undefined
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registroConexionesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegistroConexioneDto: UpdateRegistroConexioneDto) {
    return this.registroConexionesService.update(+id, updateRegistroConexioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registroConexionesService.remove(+id);
  }
}
