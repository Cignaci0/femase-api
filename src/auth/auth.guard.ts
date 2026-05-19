import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { SesionActivaService } from 'src/sesion-activa/sesion-activa.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private sesionActivaService: SesionActivaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'secret' // ensuring the secret is explicitly checked
      });
      request['user'] = payload;
    } catch (error) {
      console.log('Error verifying token:', error.message);
      if (error.name === 'TokenExpiredError') {
        const decoded = this.jwtService.decode(token) as any;
        if (decoded && decoded.sub) {
          await this.sesionActivaService.eliminarSesion(decoded.sub).catch(e => console.error("Error eliminando sesión expirada:", e));
        }
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}