import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { ProveedorCorreoService } from './proveedor-correo.service';
import { CreateProveedorCorreoDto } from './dto/create-proveedor-correo.dto';
import { UpdateProveedorCorreoDto } from './dto/update-proveedor-correo.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('proveedor-correo')
@UseGuards(AuthGuard)
export class ProveedorCorreoController {
  constructor(private readonly proveedorCorreoService: ProveedorCorreoService) {}

  @Post("crear")
  create(
    @Body() createProveedorCorreoDto: CreateProveedorCorreoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    return this.proveedorCorreoService.create(createProveedorCorreoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll() {
    return this.proveedorCorreoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proveedorCorreoService.findOne(+id);
  }

  @Patch('actualizar/:id')
  async update(
    @Param('id') id: string, 
    @Body() updateProveedorCorreoDto: UpdateProveedorCorreoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    const proveedorCorreoActualizado = await this.proveedorCorreoService.update(+id, updateProveedorCorreoDto, idUsuario, ip, userAgent);
    return { mensaje: "Proveedor de correo actualizado con éxito", data: proveedorCorreoActualizado };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proveedorCorreoService.remove(+id);
  }
}
