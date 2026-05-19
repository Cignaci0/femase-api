import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Dispositivo } from './entities/dispositivo.entity';
import { SearchDispositivoDto } from './dto/search-dispositivo.dto';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Cenco } from 'src/cencos/cenco.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class DispositivoService {
  constructor(
    @InjectRepository(Dispositivo)
    private dispositivoRepository: Repository<Dispositivo>,
    @InjectRepository(Empleado)
    private empleadoRepository: Repository<Empleado>,
  ) { }

  async create(
    dto: CreateDispositivoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    const nuevo = this.dispositivoRepository.create(dto);
    const guardado = await this.dispositivoRepository.save(nuevo);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.dispositivoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.dispositivoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        // Buscamos el nombre del cenco si se asignó uno al dispositivo
        let nombreCenco = "Sin Cenco";
        if (dto.centro_id) {
          const cencoRel = await this.dispositivoRepository.manager.findOne(Cenco, {
            where: { cenco_id: (dto.centro_id as any).cenco_id || (dto.centro_id as any) }
          });
          nombreCenco = cencoRel?.nombre_cenco || "Desconocido";
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.dispositivoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el dispositivo con ID "${guardado.dispositivo_id}" (Nombre: ${guardado.nombre})"`,
          tipo_evento: 'Creación de Dispositivo',
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

        await this.dispositivoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  async findAll() {
    return await this.dispositivoRepository.find({
      relations: ['cenco', 'estado', 'tipo_dispositivo'],
      order: { dispositivo_id: 'asc' }
    })
  }

  async update(
    id: number, 
    updateDispositivoDto: UpdateDispositivoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el dispositivo cargando relaciones para el log
    const dispositivo = await this.dispositivoRepository.findOne({
      where: { dispositivo_id: id },
      relations: ['cenco', 'cenco.departamento', 'cenco.departamento.empresa']
    });

    if (!dispositivo) {
      throw new NotFoundException(`El dispositivo con ID ${id} no existe`);
    }

    // 2. Mezclamos los datos nuevos
    this.dispositivoRepository.merge(dispositivo, updateDispositivoDto);

    try {
      const actualizada = await this.dispositivoRepository.save(dispositivo);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.dispositivoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.dispositivoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.dispositivoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del dispositivo con ID "${actualizada.dispositivo_id}" nombre: "${actualizada.nombre}"`,
            tipo_evento: 'Edición de Dispositivo',
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

          await this.dispositivoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Dispositivo actualizado con éxito',
        id: actualizada.dispositivo_id
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe el dispositivo');
      }
      throw new InternalServerErrorException('Error al actualizar el dispositivo');
    }
  }

  async buscarDispositivosPorEmpleado(rut: string) {
    const empleados = await this.empleadoRepository.find({
      where: { run: rut },
      relations: ['cenco']
    });

    if (!empleados || empleados.length === 0) {
      throw new NotFoundException(`No se encontraron empleados con RUT ${rut}`);
    }

    const cencoIds = [...new Set(empleados.map(emp => emp.cenco?.cenco_id).filter(id => id != null))];

    if (cencoIds.length === 0) {
      return [];
    }

    const dispositivos = await this.dispositivoRepository.find({
      where: {
        cenco: { cenco_id: In(cencoIds) }
      },
      relations: ['cenco']
    });

    return dispositivos;
  }


}
