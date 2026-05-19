import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UseGuards, Ip, Headers } from '@nestjs/common';
import { CencosService } from './cencos.service';
import { Cenco } from './cenco.entity';
import { UpdateCencoDTO } from './dto/update-cenco.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCencoDto } from './dto/create-cenco.dto';

@ApiTags('Centros de Costo (Cenco)')
@Controller('cencos')
@UseGuards(AuthGuard)
export class CencosController {
  constructor(
    private cencoService: CencosService
  ) { }

  @Get('')
  obtenerTodosLosCencos() {
    return this.cencoService.findAll();
  }

  @Post('')
  @ApiOperation({ summary: 'Crear un nuevo Cenco (opcionalmente con dispositivos)' })
  @ApiResponse({ status: 201, description: 'El centro ha sido creado con éxito.' })
  async create(
    @Body() createCencoDto: CreateCencoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return await this.cencoService.create(createCencoDto, idUsuario, ip, userAgent);
  }

  @Patch('actualizar/:id')
  actualizar(
    @Param('id') id: string, 
    @Body() updateDto: UpdateCencoDTO,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.cencoService.actualizarCenco(+id, updateDto, idUsuario, ip, userAgent);
  }

  @Patch(':id/turnos')
  async updateTurnos(
    @Param('id', ParseIntPipe) id: number,
    @Body('turno_ids') turnoIds: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return await this.cencoService.asignarTurnos(id, turnoIds, idUsuario, ip, userAgent);
  }

  @Put('asignar-turnos/:id')
  @ApiOperation({ summary: 'Sincronizar todos los turnos de un centro (reemplazo total)' })
  async syncTurnos(
    @Param('id', ParseIntPipe) id: number,
    @Body('turnoIds') turnoIds: number[],
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    // Si el usuario desmarcó todos, turnoIds vendrá como [] y .set([]) limpiará la tabla.
    return await this.cencoService.asignarTurnos(id, turnoIds, idUsuario, ip, userAgent);
  }

  @Get('buscar-cencos-usuario')
  async buscarCencoUsuario(@Req() req) {
    const usuarioId = req.user.sub;
    return this.cencoService.buscarCencosPorUsuario(usuarioId);
  }

  @Get('por-departamento/:departamentoId')
  async buscarCencosPorDepartamento(@Param('departamentoId') departamentoId: string) {
    if (isNaN(+departamentoId)) return [];
    return this.cencoService.findByDepartamentoId(+departamentoId);
  }
}
