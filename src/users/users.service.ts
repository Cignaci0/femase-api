import { BadRequestException, Body, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException, Param, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { In, LessThan, Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { UpdateUsuarioDto } from './dto/update-user.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { Cenco } from 'src/cencos/cenco.entity';
import { Cron } from '@nestjs/schedule';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Empresa } from 'src/empresas/empresas.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly mailerService: MailerService
  ) { }

  async searchActiveUser(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        username,
        estado: {
          estado_id: 1
        }
      },
      relations: [
        'perfil',
        'estado',
        'empresa',
        'empleado',
        'empleado.cargo'
      ],
    });
  }

  // IDEA NUEVA DEJAR LOS EMPLEADOS CON SU RESPECTIVA EMPRESA EN LA MISMA TABLA Y SI EL PERFIL DE USUARIO QUE INGRESA ES SUPERADMIN ENVIAR TODAS LAS EMPRESAS
  async buscarTodosLosUsuarios(): Promise<SearchUserDto> {
    const busqueda = this.usersRepository.find({
      order: { usuario_id: 'asc' },
      relations: [
        'perfil',
        'estado',
        'empresa',
        'cencos',
        'empleado'
      ]
    });

    if ((await busqueda).length > 0) {
      return {
        usuarios: await busqueda
      };
    } else {
      return {
        usuarios: []
      }
    }
  }

  async buscarUsuarioPorId(usuarioId: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        usuario_id: usuarioId
      },
      relations: [
        'estado',
        'perfil',
        'empresa'
      ]
    });
  }

  async recuperarClave(username: string) {
    const usuario = await this.usersRepository.findOne({
      where: { username: username, estado: { estado_id: 1 } },
    });

    if (!usuario) throw new HttpException('Usuario no encontrado', 404);

    const codigoAleatorio = Math.floor(100000 + Math.random() * 900000).toString();
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 15);

    usuario.reset_token = codigoAleatorio; // Idealmente usa bcrypt aquí
    usuario.reset_token_expires = fechaExpiracion;
    await this.usersRepository.save(usuario);

    try {
      await this.mailerService.sendMail({
        to: usuario.email,
        subject: 'Recuperación de Clave',
        template: './recuperacion', // Si usas templates
        context: { nombre: usuario.nombres, codigo: codigoAleatorio },
        html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hola, ${usuario.nombres}</h2>
        <p>Has solicitado restablecer tu contraseña. Tu código de verificación es:</p>
        <h1 style="color: #007bff; letter-spacing: 5px;">${codigoAleatorio}</h1>
        <p>Este código expirará en 15 minutos.</p>
        <p>Si no solicitaste esto, puedes ignorar este correo.</p>
        </div>`,
      });
      return { message: 'Código enviado al correo registrado' };
    } catch (error) {
      throw new HttpException('Error al enviar el correo', 500);
    }
  }

  async actualizarClave(username: string, codigo: string, nuevaClave: string) {
    const usuario = await this.usersRepository.findOne({
      where: { username: username, estado: { estado_id: 1 } }
    });

    if (!usuario) throw new HttpException('Usuario no encontrado', 404);

    if (!usuario.reset_token || usuario.reset_token !== codigo) {
      throw new HttpException('El código es incorrecto', 400);
    }

    const ahora = new Date();

    if (!usuario.reset_token_expires || ahora > usuario.reset_token_expires) {
      throw new HttpException('El código ha expirado o es inválido', 400);
    }

    const salt = await bcrypt.genSalt();
    usuario.password = await bcrypt.hash(nuevaClave, salt);

    usuario.reset_token = null;
    usuario.reset_token_expires = null;

    await this.usersRepository.save(usuario);
    const nombres = usuario.nombres + ' ' + usuario.apellido_paterno + ' ' + usuario.apellido_materno;

    this.mailerService.sendMail({
      to: usuario.email,
      subject: 'Contraseña actualizada',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hola, ${nombres}</h2>
        <p>Tu contraseña ha sido actualizada correctamente.</p>
        </div>`,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async crearUsuario(idUsuario: number, usuario: User, ip: string, userAgent: string) {
    try {
      const salt = await bcrypt.genSalt();
      const nuevo = this.usersRepository.create(usuario);
      const claveHash = nuevo.password;
      nuevo.password = await bcrypt.hash(claveHash, salt);
      const existe = await this.usersRepository.findOne({
        where: {
          username: nuevo.username
        }
      })
      if (existe) {
        throw new HttpException(`El username ${nuevo.username} ya existe`, 400);
      }
      const guardada = this.usersRepository.save(nuevo);

      //DATOS PARA EL REGISTRO DE EVENTOS
      const usuarioCreador = await this.usersRepository.findOne({
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      let empleado: Empleado | null = null;
      if (usuarioCreador?.empleado?.empleado_id) {
        empleado = await this.usersRepository.manager.findOne(Empleado, {
          where: { empleado_id: usuarioCreador.empleado.empleado_id },
          relations: ['empresa', 'cenco', 'cenco.departamento']
        });
      }

      // Buscamos el nombre de la empresa del nuevo usuario para el log
      const empresaId = (nuevo.empresa as any)?.empresa_id || (nuevo as any).empresa_id;
      const empresaDestino = await this.usersRepository.manager.findOne(Empresa, {
        where: { empresa_id: empresaId }
      });

      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
      const sistemaOperativo = os.name || 'Desconocido';

      //Crear Registro de evento
      const registroEvento = this.usersRepository.manager.create(RegistroEvento, {
        usuario: usuarioCreador?.username,
        evento: `El usuario ${usuarioCreador?.username} perteneciente a la empresa ${usuarioCreador?.empresa?.nombre_empresa} ha creado al usuario ${nuevo.username} de la empresa ${empresaDestino?.nombre_empresa || 'Desconocida'}`,
        tipo_evento: 'Creación',
        ip: ip,
        fecha: new Date(),
        hora: new Date().toTimeString().split(' ')[0],
        sistema_operativo: sistemaOperativo,
        browser: navegador,
        empresa: empleado?.empresa?.nombre_empresa || usuarioCreador?.empresa?.nombre_empresa,
        depto: empleado?.cenco?.departamento?.nombre_departamento || "Sin Depto",
        cenco: empleado?.cenco?.nombre_cenco || "Sin Cenco",
        rut: usuarioCreador?.run_usuario
      })
      await this.usersRepository.manager.save(registroEvento)
      return {
        idUsuario: (await guardada).usuario_id,
        message: 'Usuario creado exitosamente'
      }
    } catch (error) {
      console.error("Error al crear usuario:", error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.code === '23505') {
        throw new ConflictException('El usuario ya existe o el identificador está duplicado');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }
    }
  }

  async crearUsuarioDT(correoDT: string) {
    try {
      const emailDT = correoDT + '@gmail.com';
      const nuevoPassword = "Femase" + Math.random().toString(36).substring(2, 9);
      const salt = await bcrypt.genSalt();
      const claveHash = await bcrypt.hash(nuevoPassword, salt);

      let usuario = await this.usersRepository.findOne({
        where: { username: correoDT }
      });

      if (!usuario) {
        console.log("Creando nuevo usuario fiscalizador");
        usuario = this.usersRepository.create({
          username: correoDT,
          nombres: correoDT + " - Fiscalizacion",
          apellido_materno: '',
          apellido_paterno: '',
          email: emailDT,
          empresa: { empresa_id: 6 },
          estado: { estado_id: 1 },
          perfil: { perfil_id: 3 },
          run_usuario: correoDT
        });

        const fechaExpiracion = new Date();
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 5);
        usuario.reset_token_expires = fechaExpiracion;
      }

      usuario.password = claveHash;
      await this.usersRepository.save(usuario);

      try {
        console.log("Enviando correo a:", emailDT);
        await this.mailerService.sendMail({
          to: emailDT,
          subject: 'Generación de cuenta fiscalizadora',
          template: './recuperacion',
          context: {
            nombre: correoDT,
            password: nuevoPassword
          },
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Hola, ${correoDT}</h2>
              <p>Has solicitado crear una cuenta fiscalizadora. Su contraseña es:</p>
              <h1 style="color: #007bff; letter-spacing: 5px;">${nuevoPassword}</h1>
              <p>Si no solicitaste esto, puedes ignorar este correo.</p>
            </div>`,
        });
        return { message: 'Usuario procesado correctamente y clave enviada al correo' };
      } catch (error) {
        console.error("Error mailer:", error);
        throw new HttpException('Error al enviar el correo', 500);
      }
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }
      throw new InternalServerErrorException('Error crítico al crear el usuario en la base de datos');
    }
  }

  async actualizarUsuario(idUsuario: number, id: number, updateDto: UpdateUsuarioDto, ip: string, userAgent: string): Promise<any> {
    const usuario = await this.usersRepository.findOne({
      where: { usuario_id: id },
      relations: ['empresa']
    });

    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${id} no existe`);
    }

    this.usersRepository.merge(usuario, updateDto);

    try {
      const actualizada = await this.usersRepository.save(usuario);

      //DATOS PARA EL REGISTRO DE EVENTOS
      const usuarioCreador = await this.usersRepository.findOne({
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      let empleado: Empleado | null = null;
      if (usuarioCreador?.empleado?.empleado_id) {
        empleado = await this.usersRepository.manager.findOne(Empleado, {
          where: { empleado_id: usuarioCreador.empleado.empleado_id },
          relations: ['empresa', 'cenco', 'cenco.departamento']
        });
      }

      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
      const sistemaOperativo = os.name || 'Desconocido';

      //Crear Registro de evento
      const registroEvento = this.usersRepository.manager.create(RegistroEvento, {
        usuario: usuarioCreador?.username,
        evento: `El usuario ${usuarioCreador?.username} perteneciente a la empresa ${usuarioCreador?.empresa?.nombre_empresa} ha editado al usuario ${actualizada.username} de la empresa ${usuario.empresa?.nombre_empresa || 'Sin Empresa'}`,
        tipo_evento: 'Edición',
        ip: ip,
        fecha: new Date(),
        hora: new Date().toTimeString().split(' ')[0],
        sistema_operativo: sistemaOperativo,
        browser: navegador,
        empresa: empleado?.empresa?.nombre_empresa || usuarioCreador?.empresa?.nombre_empresa,
        depto: empleado?.cenco?.departamento?.nombre_departamento || "Sin Depto",
        cenco: empleado?.cenco?.nombre_cenco || "Sin Cenco",
        rut: usuarioCreador?.run_usuario
      })
      await this.usersRepository.manager.save(registroEvento)

      return {
        mensaje: 'Usuario actualizado con éxito',
        id: actualizada.usuario_id,
        usuario: actualizada.username,
        run: actualizada.run_usuario
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El RUT ya pertenece a otro usuario');
      }
      throw new InternalServerErrorException('Error al actualizar el usuario');
    }
  }


  async asignarCenco(userId: number, cencoIds: number[], idUsuarioCreador: number, ip: string, userAgent: string) {
    const usuario = await this.usersRepository.findOne({
      where: { usuario_id: userId },
      relations: ['cencos', 'empresa']
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const cencosDetalle = await this.usersRepository.manager.find(Cenco, {
      where: { cenco_id: In(cencoIds) }
    });
    const nombresCencos = cencosDetalle.map(c => c.nombre_cenco).join(', ');

    usuario.cencos = cencoIds.map(id => ({ cenco_id: id } as Cenco));
    const resultado = await this.usersRepository.save(usuario);

    // DATOS PARA LA AUDITORÍA
    const autor = await this.usersRepository.findOne({
      where: { usuario_id: idUsuarioCreador },
      relations: ['empleado', 'empresa']
    });

    let empleadoAutor: Empleado | null = null;
    if (autor?.empleado?.empleado_id) {
      empleadoAutor = await this.usersRepository.manager.findOne(Empleado, {
        where: { empleado_id: autor.empleado.empleado_id },
        relations: ['empresa', 'cenco', 'cenco.departamento']
      });
    }

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
    const sistemaOperativo = os.name || 'Desconocido';

    const registroEvento = this.usersRepository.manager.create(RegistroEvento, {
      usuario: autor?.username,
      evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa} le ha asignado los cencos (${nombresCencos}) al usuario ${usuario.username} de la empresa ${usuario.empresa?.nombre_empresa || 'Sin Empresa'}`,
      tipo_evento: 'Asignación',
      ip: ip,
      fecha: new Date(),
      hora: new Date().toTimeString().split(' ')[0],
      sistema_operativo: sistemaOperativo,
      browser: navegador,
      empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
      depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
      cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
      rut: autor?.run_usuario
    });

    await this.usersRepository.manager.save(registroEvento);

    return resultado;
  }


  async enviarCencosPorUsuario(usuarioId: number) {
    const usuario = await this.usersRepository.findOne({
      where: {
        usuario_id: usuarioId
      },
      relations: ['cencos']
    });
    if (!usuario) {
      return []; // Si no hay usuario, retorna lista vacía
    }
    // Retornamos SOLO el arreglo de cencos
    return usuario.cencos;
  }

  async cambiarpasswors(contrasena_actual: string, contrasena_nueva: string, id: number, ip: string, userAgent: string) {
    const usuario = await this.usersRepository.findOne({
      where: { usuario_id: id },
      relations: ['empresa', 'empleado'] // Cargamos relaciones para auditoría
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(contrasena_actual, usuario.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const salt = await bcrypt.genSalt();
    const nuevaContrasenaHash = await bcrypt.hash(contrasena_nueva, salt);
    usuario.password = nuevaContrasenaHash;
    await this.usersRepository.save(usuario);

    // --- AUDITORÍA ---
    let empleado: Empleado | null = null;
    if (usuario?.empleado?.empleado_id) {
      empleado = await this.usersRepository.manager.findOne(Empleado, {
        where: { empleado_id: usuario.empleado.empleado_id },
        relations: ['empresa', 'cenco', 'cenco.departamento']
      });
    }

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
    const sistemaOperativo = os.name || 'Desconocido';

    const registroEvento = this.usersRepository.manager.create(RegistroEvento, {
      usuario: usuario.username,
      evento: `El usuario ${usuario.username} de la empresa ${usuario.empresa?.nombre_empresa || 'Sin Empresa'} ha cambiado su contraseña correctamente.`,
      tipo_evento: 'Cambio de Clave',
      ip: ip,
      fecha: new Date(),
      hora: new Date().toTimeString().split(' ')[0],
      sistema_operativo: sistemaOperativo,
      browser: navegador,
      empresa: empleado?.empresa?.nombre_empresa || usuario?.empresa?.nombre_empresa,
      depto: empleado?.cenco?.departamento?.nombre_departamento || "Sin Depto",
      cenco: empleado?.cenco?.nombre_cenco || "Sin Cenco",
      rut: usuario.run_usuario
    });

    await this.usersRepository.manager.save(registroEvento);
    // -----------------

    return { message: 'Contraseña actualizada correctamente' };
  }

  @Cron('0 0 * * *') // Se ejecuta todos los días a la medianoche
  async eliminarCtaFizcalizadora() {
    const ahora = new Date();
    const usuariosAEliminar = await this.usersRepository.find({
      where: {
        email: Like('%@dt.gob.cl%'),
        reset_token_expires: LessThan(ahora)
      }
    });

    if (usuariosAEliminar.length > 0) {
      console.log(`Eliminando ${usuariosAEliminar.length} usuarios fiscalizadores con token expirado.`);
      await this.usersRepository.remove(usuariosAEliminar);
    }
  }

  async obtenerAdminPorEmpresa(idEmpresa: number) {
    return this.usersRepository.find({
      where: {
        empresa: {
          empresa_id: idEmpresa
        },
        perfil: {
          perfil_id: 1 //ADMINISTRADOR
        }
      },
      relations: ['empresa', 'perfil']
    })
  }
}