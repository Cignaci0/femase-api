import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard';
import { SesionActivaService } from 'src/sesion-activa/sesion-activa.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sesionActivaService: SesionActivaService
  ) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>, @Req() req: Request) {
    return this.authService.signIn(signInDto.username, signInDto.password, req);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req) {
    // Extraemos el id del usuario que guardamos en el token (dentro de la propiedad 'sub')
    const usuarioId = req['user'].sub;

    // Eliminamos la sesión de la base de datos
    await this.sesionActivaService.eliminarSesion(usuarioId);

    return { mensaje: 'Sesión cerrada correctamente' };
  }

  @Get('refresh')
  @UseGuards(AuthGuard)
  async refresh(@Req() req) {
    return this.authService.refreshToken(req);
  }
}
