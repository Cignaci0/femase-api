import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDispositivo } from './entities/tipo-dispositivo.entity';
import { CreateTipoDispositivoDto } from './dto/create-tipo-dispositivo.dto';
import { UpdateTipoDispositivoDto } from './dto/update-tipo-dispositivo.dto';
import { SearchTipoDispositivoDto } from './dto/search-tipo-dispositivo.dto';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class TipoDispositivoService {
  constructor(
    @InjectRepository(TipoDispositivo)
    private tipoDispositivoRepository: Repository<TipoDispositivo>
  ) { }

  async create(
    createTipoDispositivoDto: TipoDispositivo, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<CreateTipoDispositivoDto> {
    try {
      const nuevo = this.tipoDispositivoRepository.create(createTipoDispositivoDto);
      
      // Buscamos al usuario para asignarlo como creador (manteniendo compatibilidad con tu lógica actual)
      const autor = await this.tipoDispositivoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });
      
      nuevo.usuario_creador = autor?.username || 'Desconocido';
      const guardada = await this.tipoDispositivoRepository.save(nuevo);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.tipoDispositivoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.tipoDispositivoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el tipo de dispositivo "${guardada.nombre_tipo}"`,
            tipo_evento: 'Creación de Tipo Dispositivo',
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

          await this.tipoDispositivoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        tipoDispositivoId: guardada.tipo_dispositivo_id,
        nombreTipoDispositivo: guardada.nombre_tipo,
        mensaje: 'Tipo de dispositivo creado correctamente'
      }

    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El tipo de dispositivo ya existe o el identificador está duplicado');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }

      throw new InternalServerErrorException('Error crítico al crear el tipo de dispositivo en la base de datos');
    }
  }

  async findAll(): Promise<SearchTipoDispositivoDto> {
    const busqueda = await this.tipoDispositivoRepository.find({
      order: {
        tipo_dispositivo_id: 'asc'
      },
      relations: ['estado']
    });

    if (busqueda.length > 0) {
      return {
        tipos: busqueda,
        mensaje: 'Busqueda realizada correctamente'
      }
    } else {
      return {
        tipos: [],
        mensaje: 'No se han encontrado tipos de dispositivo'
      }
    }
  }

  async update(
    id: number, 
    updateTipoDispositivoDto: UpdateTipoDispositivoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el tipo de dispositivo
    const tipoDis = await this.tipoDispositivoRepository.findOne({
      where: { tipo_dispositivo_id: id },
      relations: ['estado']
    });

    // 2. Si no existe el ID, lanzamos 404
    if (!tipoDis) {
      throw new NotFoundException(`El tipo de dispositivo con ID ${id} no existe`);
    }

    const tipoDisAntiguo = cloneEntity(tipoDis);

    // 3. Mezclamos los datos nuevos
    this.tipoDispositivoRepository.merge(tipoDis, updateTipoDispositivoDto);

    try {
      // 4. Guardamos los cambios
      const actualizada = await this.tipoDispositivoRepository.save(tipoDis);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.tipoDispositivoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.tipoDispositivoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const textoCambios = generarTextoCambios(tipoDisAntiguo, updateTipoDispositivoDto);

          const registroEvento = this.tipoDispositivoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del tipo de dispositivo "${actualizada.nombre_tipo}". ${textoCambios}`,
            tipo_evento: 'Edición de Tipo Dispositivo',
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

          await this.tipoDispositivoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      // 5. Retornamos respuesta personalizada
      return {
        mensaje: 'Tipo de dispositivo actualizado con éxito',
        id: actualizada.tipo_dispositivo_id,
        nombre: actualizada.nombre_tipo,
        descripcion: actualizada.descripcion
      };
    } catch (error) {
      // Manejo de error por si el RUT duplicado choca
      if (error.code === '23505') {
        throw new ConflictException('Ya existe el nombre del tipo de dispositivo');
      }
      throw new InternalServerErrorException('Error al actualizar el tipo de dispositivo');
    }
  }
}
