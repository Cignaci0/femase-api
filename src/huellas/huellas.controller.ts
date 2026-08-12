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

  @Get()
  @ApiQuery({ name: 'num_ficha', required: false, type: String, description: 'Filtrar por número de ficha de empleado' })
  @ApiQuery({ name: 'dispositivo_id', required: false, type: Number, description: 'Filtrar por ID de dispositivo' })
  findAll(
    @Query('num_ficha') numFicha?: string,
    @Query('dispositivo_id') dispositivoId?: string,
  ) {
    const dispositivo_id = dispositivoId ? Number(dispositivoId) : undefined;
    return this.huellasService.findAll(numFicha, dispositivo_id);
  }

  @Get('dispositivo/:dispositivo_id')
  findByDispositivo(@Param('dispositivo_id', ParseIntPipe) dispositivoId: number) {
    return this.huellasService.findByDispositivo(dispositivoId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateHuellaDto: UpdateHuellaDto) {
    return this.huellasService.update(id, updateHuellaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.huellasService.remove(id);
  }

  @Get('pagination')
  async findAllPagination(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('num_ficha') num_ficha?: string, @Query('dispositivo_id') dispositivo_id?: string) {
    const dispositivo_id_num = dispositivo_id ? Number(dispositivo_id) : undefined;
    return await this.huellasService.findAllPagination(parseInt(page, 10), parseInt(limit, 10), num_ficha, dispositivo_id_num);
  }
}
