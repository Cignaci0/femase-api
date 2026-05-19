import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { AfpService } from './afp.service';
import { CreateAfpDto } from './dto/create-afp.dto';
import { UpdateAfpDto } from './dto/update-afp.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('afp')
@UseGuards(AuthGuard)
export class AfpController {
  constructor(private readonly afpService: AfpService) { }

  @Post("crear")
  async create(
    @Body() createAfpDto: CreateAfpDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    const afpCreada = await this.afpService.create(createAfpDto, idUsuario, ip, userAgent);
    return { mensaje: "AFP creada con éxito", data: afpCreada };
  }

  @Get()
  findAll() {
    return this.afpService.buscarTodasLasAfp();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.afpService.findOne(+id);
  }

  @Patch('actualizar/:id')
  async update(
    @Param('id') id: string, 
    @Body() updateAfpDto: UpdateAfpDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    const idUsuario = req.user.sub;
    const afpActualizada = await this.afpService.update(+id, updateAfpDto, idUsuario, ip, userAgent);
    return { mensaje: "AFP actualizada con éxito", data: afpActualizada };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.afpService.remove(+id);
  }
}
