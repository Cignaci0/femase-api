import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { SesionActivaService } from 'src/sesion-activa/sesion-activa.service';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { RegistroConexionesService } from 'src/registro_conexiones/registro_conexiones.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private sesionActivaService: SesionActivaService,
    private registroConexionesService: RegistroConexionesService
  ) { }

  async signIn(
    username: string,
    pass: string,
    req: Request
  ): Promise<{ token: string, username: string, profile: string, profile_id: number, empresa_id: number, empresa: string, num_ficha: string, rut: string, rut_usuario: string, usuario_id: number, cargo: number }> {

    const user = await this.usersService.searchActiveUser(username);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.empleado && user.empleado.contrato_indefinido === false && user.empleado.fecha_fin_contrato) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const finContrato = new Date(user.empleado.fecha_fin_contrato);
      finContrato.setHours(0, 0, 0, 0);

      if (finContrato < hoy) {
        throw new UnauthorizedException('Su contrato se encuentra vencido. No puede iniciar sesión.');
      }
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = {
      sub: user.usuario_id,
      username: user.username,
      profile: user.perfil?.perfil_id,
      num_ficha: user.empleado?.num_ficha || null,
      nombre_completo: user.empleado ? `${user.empleado.nombres} ${user.empleado.apellido_paterno} ${user.empleado.apellido_materno}` : user.username,
      empresa: user.empresa?.nombre_empresa || null,
      rut: user.empleado?.run || null,
      empresa_id: user.empresa?.empresa_id || null,
      rut_usuario: user.run_usuario,
      usuario_id: user.usuario_id,
      cargo: user.empleado?.cargo?.tipo_cargo || 0
    };

    // Registrar la sesión activa
    const ip = req.headers['x-forwarded-for'] as string || req.ip || 'Desconocida';
    const userAgent = req.headers['user-agent'] || '';
    await this.sesionActivaService.registrarSesion(user, ip, userAgent);

    //Registrar la conexion
    this.registroConexionesService.create({
      fecha: new Date(),
      hora: new Date().toTimeString().split(' ')[0],
      correo: user.empleado?.email_laboral || user.email,
      rut: user.empleado?.run || user.run_usuario,
      ip: ip,
      empresa: user.empleado?.empresa?.empresa_id || user.empresa?.empresa_id
    });
    

    return {
      token: await this.jwtService.signAsync(payload),
      username: user.username,
      profile_id: user.perfil?.perfil_id || 0,
      profile: user.perfil?.nombre_perfil || '',
      empresa_id: user.empresa?.empresa_id || 0,
      empresa: user.empresa?.nombre_empresa || '',
      num_ficha: user.empleado?.num_ficha || '',
      rut: user.empleado?.run || '',
      rut_usuario: user.run_usuario,
      usuario_id: user.usuario_id,
      cargo: user.empleado?.cargo?.tipo_cargo || 0
    };


  }
}
