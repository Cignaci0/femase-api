import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { HuellasService } from './huellas.service';
import { CreateHuellaDto } from './dto/create-huella.dto';
import { UpdateHuellaDto } from './dto/update-huella.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('huellas')
@Controller('huellas')
export class HuellasController {
  constructor(private readonly huellasService: HuellasService) { }

  @Post()
  create(@Body() createHuellaDto: CreateHuellaDto) {
    return this.huellasService.create(createHuellaDto);
  }

  @Get('dispositivo/:dispositivo_id')
  findByDispositivo(@Param('dispositivo_id', ParseIntPipe) dispositivoId: number) {
    return this.huellasService.findByDispositivo(dispositivoId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateHuellaDto: UpdateHuellaDto) {
    return this.huellasService.update(id, updateHuellaDto);
  }



  @Get('pagination')
  async findAllPagination(
    @Query('page') page: string = '1', 
    @Query('limit') limit: string = '10', 
    @Query('query') query?: string, 
    @Query('empresaId') empresaId?: string
  ) {
    return await this.huellasService.pagination(
      parseInt(page, 10), 
      query || '', 
      parseInt(limit, 10), 
      empresaId ? parseInt(empresaId, 10) : undefined
    );
  }
}
