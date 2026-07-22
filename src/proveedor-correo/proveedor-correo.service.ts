import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProveedorCorreoDto } from './dto/create-proveedor-correo.dto';
import { UpdateProveedorCorreoDto } from './dto/update-proveedor-correo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProveedorCorreo } from './entities/proveedor-correo.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class ProveedorCorreoService {
  constructor(
    @InjectRepository(ProveedorCorreo)
    private readonly proveedorCorreoRepository: Repository<ProveedorCorreo>,
  ) { }


  async create(
    createProveedorCorreoDto: CreateProveedorCorreoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    const nuevoProveedorCorreo = this.proveedorCorreoRepository.create(createProveedorCorreoDto);
    const guardada = await this.proveedorCorreoRepository.save(nuevoProveedorCorreo);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.proveedorCorreoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.proveedorCorreoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        // Buscamos la empresa destino
        const empresaDestino = await this.proveedorCorreoRepository.manager.findOne('Empresa', {
          where: { empresa_id: (createProveedorCorreoDto as any).empresa_id || (createProveedorCorreoDto as any)?.empresa_id }
        });

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.proveedorCorreoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el proveedor de correo "${guardada.dominio}" para la empresa "${(empresaDestino as any)?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Creación Proveedor Correo',
          ip: ip,
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.proveedorCorreoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardada;
  }

  async findAll() {
    const busqueda = await this.proveedorCorreoRepository.find({
      order: {
        id: "ASC"
      },
      relations: {
        empresa: true
      }
    });
    if (busqueda.length === 0) {
      return { proveedorCorreo: [] };
    }
    return { proveedorCorreo: busqueda };
  }

  findOne(id: number) {
    return `This action returns a #${id} proveedorCorreo`;
  }

  async update(
    id: number, 
    updateProveedorCorreoDto: UpdateProveedorCorreoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el proveedor cargando la relación empresa
    const proveedor = await this.proveedorCorreoRepository.findOne({
      where: { id },
      relations: ['empresa']
    });

    if (!proveedor) {
      throw new NotFoundException(`El proveedor de correo con ID ${id} no existe`);
    }

    const proveedorAntiguo = cloneEntity(proveedor);

    // 2. Mezclamos los datos
    this.proveedorCorreoRepository.merge(proveedor, updateProveedorCorreoDto);

    try {
      const actualizada = await this.proveedorCorreoRepository.save(proveedor);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.proveedorCorreoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.proveedorCorreoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const textoCambios = generarTextoCambios(proveedorAntiguo, updateProveedorCorreoDto);

          const registroEvento = this.proveedorCorreoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del proveedor de correo "${actualizada.dominio}" para la empresa "${actualizada.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
            tipo_evento: 'Edición Proveedor Correo',
            ip: ip,
            fecha: new Date(),
            hora: new Date().toTimeString().split(' ')[0],
            sistema_operativo: parser.getOS().name || 'Desconocido',
            browser: navegador,
            empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
            depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
            cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
            rut: autor?.run_usuario
          });

          await this.proveedorCorreoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return actualizada;
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar el proveedor de correo');
    }
  }

  remove(id: number) {
    return `This action removes a #${id} proveedorCorreo`;
  }
}
