import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { Documento } from './entities/documento.entity';
import { Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';
import { Firma } from 'src/firmas/entities/firma.entity';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class DocumentoService {

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>
  ) { }

  async create(createDocumentoDto: CreateDocumentoDto, idUsuario?: number, ip?: string, userAgent?: string) {
    const nuevoDocumento = await this.documentoRepository.save(createDocumentoDto);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.documentoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.documentoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.documentoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado un nuevo documento: "${nuevoDocumento.nombre}" (Tipo: ${nuevoDocumento.tipo}).`,
          tipo_evento: 'Creación Documento',
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

        await this.documentoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return nuevoDocumento;
  }

  async findAll(empresa_id: number) {
    return await this.documentoRepository.find({
      where: {
        empresa: { empresa_id: empresa_id }
      },
      relations: ['empresa']
    });
  }

  async findOne(id: number) {
    const documento = await this.documentoRepository.findOne({ where: { id } });
    if (!documento) {
      throw new NotFoundException(`El documento con ID ${id} no existe`);
    }
    return documento;
  }

  async update(id: number, updateDocumentoDto: UpdateDocumentoDto, idUsuario?: number, ip?: string, userAgent?: string) {
    const documento = await this.documentoRepository.preload({ id, ...updateDocumentoDto });
    if (!documento) {
      throw new NotFoundException(`El documento con ID ${id} no existe`);
    }
    const guardado = await this.documentoRepository.save(documento);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.documentoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.documentoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.documentoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha modificado el documento: "${guardado.nombre}"`,
          tipo_evento: 'Modificación Documento',
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

        await this.documentoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  async remove(id: number, idUsuario?: number, ip?: string, userAgent?: string) {
    const documento = await this.documentoRepository.findOne({ where: { id } });
    if (!documento) {
      throw new NotFoundException(`El documento con ID ${id} no existe`);
    }
    const nombreDoc = documento.nombre;
    await this.documentoRepository.remove(documento);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.documentoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.documentoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.documentoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha eliminado el documento: "${nombreDoc}"`,
          tipo_evento: 'Eliminación Documento',
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

        await this.documentoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      mensaje: 'Documento eliminado con exito',
      id: id
    };
  }
}
