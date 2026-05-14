import { Injectable } from '@nestjs/common';
import { CreateSolicitudeDto } from './dto/create-solicitude.dto';
import { UpdateSolicitudeDto } from './dto/update-solicitude.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Solicitude } from './entities/solicitude.entity';
import { Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Empresa } from 'src/empresas/empresas.entity';
import { User } from 'src/users/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitude)
    private readonly solicitudRepository: Repository<Solicitude>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    private readonly mailService: MailerService,

  ) { }

  async create(createSolicitudeDto: CreateSolicitudeDto, idUsuario?: number, ip?: string, userAgent?: string) {
    const usuario = await this.solicitudRepository.manager.findOne(User, {
      where: {
        usuario_id: createSolicitudeDto.idUsuario,
      },
      relations: ['empleado'],
    });

    const now = new Date();
    const solictud = this.solicitudRepository.create({
      tipo: createSolicitudeDto.tipo,
      texto: createSolicitudeDto.texto,
      estado: 'P',
      empleado: usuario?.empleado,
      usuario: { usuario_id: createSolicitudeDto.id_usuario_empleador },
      fecha: now,
      hora: now.toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour12: false,
      }),
    });
    const empleado = await this.solicitudRepository.manager.findOne(Empleado, {
      where: {
        empleado_id: usuario?.empleado.empleado_id,
      },
    });
    const fechaFormateada = now.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }).replace(/-/g, '/');

    try {
      await this.mailService.sendMail({
        to: empleado?.email_laboral,
        subject: 'Nueva Solicitud de firma',
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Nueva Solicitud de Empleado</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado Empleador:</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              El empleado ha realizado una nueva solicitud de firma según el siguiente detalle:
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong style="color: #601445;">Nombre:</strong> <span style="color: #601445;">${usuario?.nombres || ''} ${usuario?.apellido_paterno || ''} ${usuario?.apellido_materno || ''}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Fecha:</strong> <span style="color: #601445;">${fechaFormateada}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Hora:</strong> <span style="color: #601445;">${solictud.hora}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Tipo:</strong> <span style="color: #601445;">${createSolicitudeDto.tipo}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Descripción:</strong> <span style="color: #601445;">${createSolicitudeDto.texto}</span></p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Para gestionar las solicitudes en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`,
      })
    } catch (error) {
      console.error('Error enviando correo:', error);
    }

    try {
      await this.mailService.sendMail({
        to: usuario?.email,
        subject: 'Nueva Solicitud de firma',
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Confirmación de Solicitud</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Usted ha realizado una solicitud de firma según el siguiente detalle:
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong style="color: #601445;">Nombre:</strong> <span style="color: #601445;">${usuario?.nombres || ''} ${usuario?.apellido_paterno || ''} ${usuario?.apellido_materno || ''}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Fecha:</strong> <span style="color: #601445;">${fechaFormateada}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Hora:</strong> <span style="color: #601445;">${solictud.hora}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Tipo:</strong> <span style="color: #601445;">${createSolicitudeDto.tipo}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Descripción:</strong> <span style="color: #601445;">${createSolicitudeDto.texto}</span></p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar el estado de sus solicitudes en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`,
      })
    } catch (error) {
      console.error('Error enviando correo:', error);
    }

    const guardado = await this.solicitudRepository.save(solictud);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.solicitudRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.solicitudRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.solicitudRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado una solicitud de firma: "${createSolicitudeDto.tipo}" para el empleado "${usuario?.nombres} ${usuario?.apellido_paterno}".`,
          tipo_evento: 'Creación Solicitud Firma',
          ip: ip || 'Desconocida',
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.solicitudRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  async findAll(id_empresa?: number) {
    const whereCondition = id_empresa ? { empleado: { empresa: { empresa_id: id_empresa } } } : {};

    return await this.solicitudRepository.find({
      where: whereCondition,
      relations: ['empleado', 'usuario'],
    });
  }

  async findByEmpleado(idUsuario: number) {
    const usuario = await this.solicitudRepository.manager.findOne(User, {
      where: {
        usuario_id: idUsuario,
      },
      relations: ['empleado'],
    });
    return await this.solicitudRepository.find({ where: { empleado: { empleado_id: usuario?.empleado.empleado_id } } });
  }

  findOne(id: number) {
    return `This action returns a #${id} solicitude`;
  }

  async update(id: number, updateSolicitudeDto: UpdateSolicitudeDto, idUsuario?: number, ip?: string, userAgent?: string) {
    const solicitud = await this.solicitudRepository.findOne({ where: { id }, relations: { empleado: true, usuario: true } });

    if (!solicitud) {
      throw new Error(`Solicitud no encontrada`);
    }

    const empleado = await this.solicitudRepository.manager.findOne(Empleado, {
      where: {
        empleado_id: solicitud.empleado?.empleado_id,
      },
    });
    const fechaAprobacion = new Date();
    const fechaFormateada = fechaAprobacion.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }).replace(/-/g, '/');
    const horaAprobacion = fechaAprobacion.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour12: false,
    });
    const usuario = await this.solicitudRepository.manager.findOne(User, {
      where: {
        usuario_id: solicitud.usuario?.usuario_id,
      },
    });
    if (updateSolicitudeDto.estado === "R") {
      await this.mailService.sendMail({
        to: empleado?.email_laboral,
        subject: 'Solicitud rechazada',
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Resolución de Solicitud</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${solicitud?.empleado?.nombres || ''} ${solicitud?.empleado?.apellido_paterno || ''} ${solicitud?.empleado?.apellido_materno || ''}</strong>, con fecha ${fechaFormateada} se ha <strong>rechazado</strong> su solicitud según el siguiente detalle:
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong style="color: #601445;">Tipo:</strong> <span style="color: #601445;">${solicitud?.tipo}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Hora de Resolución:</strong> <span style="color: #601445;">${horaAprobacion}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Descripción:</strong> <span style="color: #601445;">${solicitud?.texto}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Motivo Resolución:</strong> <span style="color: #601445;">${updateSolicitudeDto.motivo}</span></p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc; font-weight: bold; margin-bottom: 5px;">Para apelar a esta resolución solicitamos escribir a <a href="mailto:${usuario?.email}" style="color: #0088cc;">${usuario?.email}</a></p>
              <p style="font-size: 14px; color: #0088cc; font-weight: bold; margin-top: 0;">en un plazo máximo de 48 horas.</p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar sus solicitudes en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`,
      })
    } else if (updateSolicitudeDto.estado === "A") {
      await this.mailService.sendMail({
        to: empleado?.email_laboral,
        subject: 'Solicitud aprobada',
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Resolución de Solicitud</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${solicitud?.empleado?.nombres || ''} ${solicitud?.empleado?.apellido_paterno || ''} ${solicitud?.empleado?.apellido_materno || ''}</strong>, con fecha ${fechaFormateada} se ha <strong>aprobado</strong> su solicitud según el siguiente detalle:
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong style="color: #601445;">Tipo:</strong> <span style="color: #601445;">${solicitud?.tipo}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Hora de Resolución:</strong> <span style="color: #601445;">${horaAprobacion}</span></p>
              <p style="margin: 5px 0;"><strong style="color: #601445;">Descripción:</strong> <span style="color: #601445;">${solicitud?.texto}</span></p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar sus solicitudes en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`,
      })
    }

    Object.assign(solicitud, updateSolicitudeDto);
    const guardado = await this.solicitudRepository.save(solicitud);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.solicitudRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.solicitudRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        let estadoTexto = '';
        if (updateSolicitudeDto.estado === 'A') estadoTexto = 'Aprobado';
        if (updateSolicitudeDto.estado === 'R') estadoTexto = 'Rechazado';

        const registroEvento = this.solicitudRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha resuelto la solicitud de firma del empleado "${solicitud.empleado?.nombres} ${solicitud.empleado?.apellido_paterno}". Estado: ${estadoTexto}.`,
          tipo_evento: 'Resolución Solicitud Firma',
          ip: ip || 'Desconocida',
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.solicitudRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  remove(id: number) {
    return `This action removes a #${id} solicitude`;
  }
}
