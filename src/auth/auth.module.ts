import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { SesionActivaModule } from 'src/sesion-activa/sesion-activa.module';
import { RegistroConexionesModule } from 'src/registro_conexiones/registro_conexiones.module';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    SesionActivaModule,
    RegistroConexionesModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '15min' }
    })
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule { }
