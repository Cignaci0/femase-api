import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Perfil } from './perfil.entity';
import { In, Repository } from 'typeorm';
import { Menu } from 'src/menus/menus.entity';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@Injectable()
export class PerfilesService {
  constructor(
    @InjectRepository(Perfil)
    private perfilRepository: Repository<Perfil>
  ) { }

  async obtenerTodosLosPerfiles(): Promise<Perfil[]> {
    return this.perfilRepository.find({
      relations: ['estado', 'modulos'],
      order: { perfil_id: 'asc' }
    });
  }

  async crearPerfil(perfil: Perfil, idUsuario: number, ip: string, userAgent: string): Promise<CreatePerfilDto> {
    try {
      // Obtenemos los datos del autor para el campo usuario_creador y auditoría
      const autor = await this.perfilRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      const nuevo = this.perfilRepository.create(perfil);
      nuevo.usuario_creador = autor?.username || 'Desconocido';
      const guardada = await this.perfilRepository.save(nuevo);

      // --- AUDITORÍA ---
      let empleadoAutor: Empleado | null = null;
      if (autor?.empleado?.empleado_id) {
        empleadoAutor = await this.perfilRepository.manager.findOne(Empleado, {
          where: { empleado_id: autor.empleado.empleado_id },
          relations: ['empresa', 'cenco', 'cenco.departamento']
        });
      }

      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
      const sistemaOperativo = os.name || 'Desconocido';

      const registroEvento = this.perfilRepository.manager.create(RegistroEvento, {
        usuario: autor?.username,
        evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el perfil "${guardada.nombre_perfil}"`,
        tipo_evento: 'Creación de Perfil',
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

      await this.perfilRepository.manager.save(registroEvento);
      // -----------------

      return {
        perfil_id: guardada.perfil_id,
        nombre: guardada.nombre_perfil,
        mensaje: 'Perfil creado correctamente'
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El perfil ya existe o el identificador está duplicado');
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }
      throw new InternalServerErrorException('Error crítico al crear el registro en la base de datos');
    }
  }

  async actualizarPerfil(id: number, infoActualizar: UpdatePerfilDto, idUsuario: number, ip: string, userAgent: string): Promise<any> {
    const perfil = await this.perfilRepository.findOne({
      where: { perfil_id: id }
    });

    if (!perfil) {
      throw new NotFoundException(`El perfil con ID ${id} no existe`);
    }

    this.perfilRepository.merge(perfil, infoActualizar);

    try {
      const actualizada = await this.perfilRepository.save(perfil);

      // --- AUDITORÍA ---
      const autor = await this.perfilRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      let empleadoAutor: Empleado | null = null;
      if (autor?.empleado?.empleado_id) {
        empleadoAutor = await this.perfilRepository.manager.findOne(Empleado, {
          where: { empleado_id: autor.empleado.empleado_id },
          relations: ['empresa', 'cenco', 'cenco.departamento']
        });
      }

      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
      const sistemaOperativo = os.name || 'Desconocido';

      const registroEvento = this.perfilRepository.manager.create(RegistroEvento, {
        usuario: autor?.username,
        evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha editado el perfil "${actualizada.nombre_perfil}"`,
        tipo_evento: 'Edición de Perfil',
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

      await this.perfilRepository.manager.save(registroEvento);
      // -----------------

      return {
        mensaje: 'Perfil actualizado con éxito',
        id: actualizada.perfil_id,
        nombre: actualizada.nombre_perfil
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El nombre ya pertenece a otro perfil');
      }
      throw new InternalServerErrorException('Error al actualizar el perfil');
    }
  }

  async asignarModulos(perfilId: number, moduloIds: number[], idUsuario: number, ip: string, userAgent: string) {
    const perfil = await this.perfilRepository.findOne({
      where: { perfil_id: perfilId },
      relations: ['modulos']
    });

    if (!perfil) throw new NotFoundException('Perfil no encontrado');

    // Buscamos los nombres de los módulos para la auditoría
    const modulosDetalle = await this.perfilRepository.manager.find(Menu, {
      where: { modulo_id: In(moduloIds) }
    });
    const nombresModulos = modulosDetalle.map(m => m.modulo_id).join(', ');

    perfil.modulos = moduloIds.map(id => ({ modulo_id: id } as Menu));
    const actualizada = await this.perfilRepository.save(perfil);

    // --- AUDITORÍA ---
    const autor = await this.perfilRepository.manager.findOne(User, {
      where: { usuario_id: idUsuario },
      relations: ['empleado', 'empresa']
    });

    let empleadoAutor: Empleado | null = null;
    if (autor?.empleado?.empleado_id) {
      empleadoAutor = await this.perfilRepository.manager.findOne(Empleado, {
        where: { empleado_id: autor.empleado.empleado_id },
        relations: ['empresa', 'cenco', 'cenco.departamento']
      });
    }

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;
    const sistemaOperativo = os.name || 'Desconocido';

    const registroEvento = this.perfilRepository.manager.create(RegistroEvento, {
      usuario: autor?.username,
      evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} le ha asignado los módulos (${nombresModulos}) al perfil ${perfil.nombre_perfil}`,
      tipo_evento: 'Asignación de Módulos',
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

    await this.perfilRepository.manager.save(registroEvento);
    // -----------------

    return actualizada;
  }
}
