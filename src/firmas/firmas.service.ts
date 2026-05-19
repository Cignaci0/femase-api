import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { UpdateFirmaDto } from './dto/update-firma.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Firma } from './entities/firma.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { NotFoundError } from 'rxjs';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class FirmasService {
  constructor(
    @InjectRepository(Firma)
    private readonly firmaRepository: Repository<Firma>,
    private readonly mailerService: MailerService,
  ) { }

  async create(createFirmaDto: CreateFirmaDto, idUsuario?: number, ip?: string, userAgent?: string) {
    const firma = this.firmaRepository.create({
      nombre: createFirmaDto.nombre,
      tipo: createFirmaDto.tipo,
      texto: createFirmaDto.texto,
      estado: "P",
      empresa: { empresa_id: createFirmaDto.empresa },
      empleado: { empleado_id: createFirmaDto.id_empleado },
      ...(createFirmaDto.usuario && { usuario: { usuario_id: createFirmaDto.usuario } })
    });
    const empleado = await this.firmaRepository.manager.findOne(Empleado, {
      where: { empleado_id: createFirmaDto.id_empleado }
    });
    if (!empleado) {
      throw new NotFoundException("Empleado no encontrado");
    }

    try {
      await this.mailerService.sendMail({
        to: empleado.email_laboral,
        subject: "Nueva Solicitud de firma",
        html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Nueva Solicitud de Firma</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Se ha creado una nueva solicitud de firma.
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;">Favor de revisar la solicitud en su portal para aprobar o rechazar la solicitud.</p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar la solicitud en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`

      });
    } catch (error) {
      console.error("Error enviando email:", error.message);
    }
    const guardada = await this.firmaRepository.save(firma);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.firmaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.firmaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.firmaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado una solicitud de firma: "${createFirmaDto.nombre}" para el empleado "${empleado.nombres} ${empleado.apellido_paterno}".`,
          tipo_evento: 'Creación Firma',
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

        await this.firmaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardada;
  }

  async findAll(empresa_id: number, usuario_id: number) {
    const usuario = await this.firmaRepository.manager.findOne(User, {
      where: { usuario_id: usuario_id },
      relations: ['empleado']
    });

    if (!usuario || !usuario.empleado) {
      throw new NotFoundException("Usuario o empleado asociado no encontrado");
    }

    return await this.firmaRepository.find({
      where: {
        empresa: { empresa_id: empresa_id },
        empleado: { empleado_id: usuario.empleado.empleado_id }
      },
      order: {
        id: "DESC",
      }
    })
  }

  findOne(id: number) {
    return `This action returns a #${id} firma`;
  }

  async aprovarRechazarFirma(idFirma: number, updateFirmaDto: UpdateFirmaDto, usuario_id: number, pin: number, idUsuario?: number, ip?: string, userAgent?: string) {
    const firma = await this.firmaRepository.findOne({ 
      where: { id: idFirma },
      relations: ['usuario', 'empleado'] 
    });

    if (!firma) {
      throw new NotFoundException("Firma no encontrada");
    }

    const usuario = await this.firmaRepository.manager.findOne(User, {
      where: { usuario_id: usuario_id },
      relations: ['empleado']
    });

    if (!usuario || !usuario.empleado) {
      throw new NotFoundException("Usuario o empleado asociado no encontrado");
    }

    const empleado = usuario.empleado;
    const usuarioEmpleador = firma.usuario;
    
    if (empleado.pin_firma !== pin) {
      throw new NotFoundException("Pin incorrecto");
    }

    if(updateFirmaDto.estado === "A"){
      if (usuarioEmpleador && usuarioEmpleador.email) {
        await this.mailerService.sendMail({
          to: usuarioEmpleador.email,
          cc: [empleado.email],
          subject: "Firma aprobada",
          html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Firma Aprobada</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado Empleador:</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              El empleado <strong>${empleado?.nombres || ''} ${empleado?.apellido_paterno || ''} ${empleado?.apellido_materno || ''}</strong> ha aprobado la solicitud de firma.
            </p>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`
        });
      }
    }else if(updateFirmaDto.estado === "R"){
      if (usuarioEmpleador && usuarioEmpleador.email) {
        await this.mailerService.sendMail({
          to: usuarioEmpleador.email,
          subject: "Firma rechazada",
          html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Firma Rechazada</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado Empleador:</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              El empleado <strong>${empleado?.nombres || ''} ${empleado?.apellido_paterno || ''} ${empleado?.apellido_materno || ''}</strong> ha rechazado la solicitud de firma.
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong style="color: #601445;">Motivo:</strong> <span style="color: #601445;">${updateFirmaDto.motivo}</span></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>`
        });
      }
    }

    await this.firmaRepository.update(idFirma, {
      estado: updateFirmaDto.estado,
      motivo: updateFirmaDto.motivo
    });

    const firmaFinal = await this.firmaRepository.findOneBy({ id: idFirma });

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.firmaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.firmaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        let estadoTexto = '';
        if (updateFirmaDto.estado === 'A') estadoTexto = 'Aprobada';
        if (updateFirmaDto.estado === 'R') estadoTexto = 'Rechazada';

        const registroEvento = this.firmaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha resuelto la solicitud de firma: "${firma.nombre}" del empleado "${firma.empleado?.nombres} ${firma.empleado?.apellido_paterno}". Estado: ${estadoTexto}.`,
          tipo_evento: 'Resolución Firma',
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

        await this.firmaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return firmaFinal;
  }

  remove(id: number) {
    return `This action removes a #${id} firma`;
  }
}
