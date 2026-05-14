import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { DocumentoService } from './documento.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Controller('documento')
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) { }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createDocumentoDto: CreateDocumentoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.documentoService.create(createDocumentoDto, idUsuario, ip, userAgent);
  }

  @Get()
  findAll(@Query('empresa_id') empresa_id: string) {
    if (isNaN(+empresa_id)) return [];
    return this.documentoService.findAll(+empresa_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentoService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateDocumentoDto: UpdateDocumentoDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.documentoService.update(+id, updateDocumentoDto, idUsuario, ip, userAgent);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user?.sub;
    return this.documentoService.remove(+id, idUsuario, ip, userAgent);
  }
}
