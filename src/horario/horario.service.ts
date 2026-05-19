import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Horario } from './entities/horario.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class HorarioService {
  constructor(
    @InjectRepository(Horario)
    private horarioRepository: Repository<Horario>
  ) { }


  async create(
    createHorarioDto: Horario, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    try {
      const nuevo = this.horarioRepository.create(createHorarioDto);
      const guardada = await this.horarioRepository.save(nuevo);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.horarioRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.horarioRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          // Buscamos la empresa destino
          const empresaId = (createHorarioDto as any).empresa_id || (createHorarioDto.empresa as any)?.empresa_id;
          const empresaDestino = await this.horarioRepository.manager.findOne('Empresa', {
            where: { empresa_id: empresaId }
          });

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.horarioRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el horario "${guardada.hora_entrada} - ${guardada.hora_salida}" para la empresa "${(empresaDestino as any)?.nombre_empresa || 'Desconocida'}"`,
            tipo_evento: 'Creación de Horario',
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

          await this.horarioRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        message: 'Registro creado con éxito',
        id: guardada.horario_id
      }
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El registro ya existe o el identificador está duplicado');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }

      throw new InternalServerErrorException('Error crítico al crear el registro en la base de datos');
    }
  }

  findAll(empresa_id:number) {
    return this.horarioRepository.find({
      order: {
        horario_id: 'asc'
      },
      relations: ['empresa'],
      where: {
        empresa: {
          empresa_id: empresa_id
        }
      }
    });
  }

  async update(
    id: number, 
    updateHorarioDto: UpdateHorarioDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el horario cargando la relación empresa
    const horario = await this.horarioRepository.findOne({
      where: { horario_id: id },
      relations: ['empresa']
    });

    if (!horario) {
      throw new NotFoundException(`El horario con ID ${id} no existe`);
    }

    // 2. Mezclamos los datos
    this.horarioRepository.merge(horario, updateHorarioDto);

    try {
      const actualizada = await this.horarioRepository.save(horario);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.horarioRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.horarioRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.horarioRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del horario "${actualizada.hora_entrada} - ${actualizada.hora_salida}" para la empresa "${actualizada.empresa?.nombre_empresa || 'Desconocida'}"`,
            tipo_evento: 'Edición de Horario',
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

          await this.horarioRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Horario actualizado con éxito',
        id: actualizada.horario_id,
        entrada: actualizada.hora_entrada,
        salida: actualizada.hora_salida
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('El nombre ya pertenece a otro horario');
      }
      throw new InternalServerErrorException('Error al actualizar el horario');
    }
  }

  remove(id: number) {
    return `This action removes a #${id} horario`;
  }
}
