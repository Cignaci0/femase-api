import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UseGuards } from '@nestjs/common';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Cargo } from './entities/cargo.entity';
import { Repository } from 'typeorm';
import { SearchCargoDto } from './dto/search-cargo.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
@UseGuards(AuthGuard)
export class CargosService {
  constructor(
    @InjectRepository(Cargo)
    private cargoRepository: Repository<Cargo>
  ) { }

  async create(
    createCargoDto: Cargo, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<CreateCargoDto> {
    try {
      const nuevo = this.cargoRepository.create(createCargoDto);
      
      // Buscamos al usuario para obtener su nombre y metadata
      const autor = await this.cargoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      nuevo.usuario_creador = autor?.username || 'Desconocido';
      const guardada = await this.cargoRepository.save(nuevo);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.cargoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

        // Buscamos el nombre de la empresa destino para el log
        const empresaId = (createCargoDto as any).empresa_id || (createCargoDto.empresa as any)?.empresa_id;
        const empresaDestino = await this.cargoRepository.manager.findOne('Empresa', {
          where: { empresa_id: empresaId }
        });

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.cargoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el cargo "${guardada.nombre}" para la empresa "${(empresaDestino as any)?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Creación de Cargo',
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

          await this.cargoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        cargo_id: guardada.cargo_id,
        nombre: guardada.nombre,
        mensaje: 'Cargo creado correctamente'
      }

    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El cargo ya existe o el identificador está duplicado');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }

      throw new InternalServerErrorException('Error crítico al crear el cargo en la base de datos');
    }
  }

  async findAll(userId: number): Promise<SearchCargoDto> {
    const busqueda = await this.cargoRepository.find({
      order: {
        cargo_id: 'asc'
      }, relations: ['estado', 'empresa']
    });

    if (busqueda.length > 0) {
      return {
        cargos: busqueda,
        mensaje: 'Cargos encontrados!'
      }
    } else {
      return {
        cargos: [],
        mensaje: 'No se han encontrado cargos'
      }
    }
  }

  async cargosPorEmpresa(empresaId: number): Promise<SearchCargoDto> {
    const busqueda = await this.cargoRepository.find({
      relations: ['empresa', 'estado'],
      where: { empresa: { empresa_id: empresaId } },
      order: { cargo_id: 'asc' }
    });

    if (busqueda.length > 0) {
      return {
        cargos: busqueda,
        mensaje: 'Cargos encontrados!'
      }
    } else {
      return {
        cargos: [],
        mensaje: 'No se han encontrado cargos'
      }
    }
  }

  async update(
    id: number, 
    updateCargoDto: UpdateCargoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el cargo cargando su relación con la empresa
    const cargo = await this.cargoRepository.findOne({
      where: { cargo_id: id },
      relations: ['empresa', 'estado']
    });

    // 2. Si no existe el ID, lanzamos 404
    if (!cargo) {
      throw new NotFoundException(`El cargo con ID ${id} no existe`);
    }

    const cargoAntiguo = cloneEntity(cargo);

    // 3. Mezclamos los datos nuevos
    this.cargoRepository.merge(cargo, updateCargoDto);

    try {
      // 4. Guardamos los cambios
      const actualizada = await this.cargoRepository.save(cargo);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.cargoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.cargoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const textoCambios = generarTextoCambios(cargoAntiguo, updateCargoDto);

          const registroEvento = this.cargoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del cargo "${actualizada.nombre}" para la empresa "${actualizada.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
            tipo_evento: 'Edición de Cargo',
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

          await this.cargoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Cargo actualizado con éxito',
        id: actualizada.cargo_id,
        nombre: actualizada.nombre
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El nombre ya pertenece a otro cargo');
      }
      throw new InternalServerErrorException('Error al actualizar el cargo');
    }
  }
}