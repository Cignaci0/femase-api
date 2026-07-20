import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity';
import { ILike, In, Not, Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import * as bcrypt from 'bcrypt';
import { Cenco } from 'src/cencos/cenco.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class EmpleadoService {
  constructor(
    @InjectRepository(Empleado)
    private empleadoRepository: Repository<Empleado>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  async create(
    createEmpleadoDto: Empleado,
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
    // Primero creo el empleado
    const nuevoEmpleado = this.empleadoRepository.create(createEmpleadoDto);
    if (nuevoEmpleado.email || nuevoEmpleado.email_laboral || nuevoEmpleado.email_noti) {
      const existeEmail = await this.empleadoRepository.findOne({
        where: {
          email: nuevoEmpleado.email,
        },
      })
      if (existeEmail) throw new ConflictException('Ya existe el email');
      const existeEmailLaboral = await this.empleadoRepository.findOne({
        where: {
          email_laboral: nuevoEmpleado.email_laboral,
        },
      })
      if (existeEmailLaboral) throw new ConflictException('Ya existe el email laboral');
    }
    if (nuevoEmpleado.run) {
      const runLimpio = nuevoEmpleado.run.replace(/\D/g, '');
      nuevoEmpleado.pin_firma = parseInt(runLimpio.substring(0, 4));
    }
    const guardarNuevoEmpleado = await this.empleadoRepository.save(nuevoEmpleado);

    if (!guardarNuevoEmpleado) throw new HttpException('Error al crear el empleado', 400);

    // Busco al empleado creado
    const empleadoCreado = await this.empleadoRepository.findOne({
      where: { empleado_id: guardarNuevoEmpleado.empleado_id },
      relations: [
        'estado',
        'empresa',
        'cenco'
      ]
    });

    if (!empleadoCreado) throw new HttpException('No se encontro el empleado', 400);

    // Encripto run para guardar clave
    const salt = await bcrypt.genSalt();
    const claveHash = await bcrypt.hash(empleadoCreado.run, salt);

    // Creo el usuario ligado exclusivamente a esta ficha
    const nuevoUser = this.userRepository.create({
      username: empleadoCreado?.num_ficha, // Usando num_ficha como login
      password: claveHash,
      nombres: empleadoCreado?.nombres,
      apellido_paterno: empleadoCreado?.apellido_paterno,
      apellido_materno: empleadoCreado?.apellido_materno,
      email: empleadoCreado?.email,
      empresa: empleadoCreado?.empresa,
      estado: { estado_id: 1 },
      perfil: { perfil_id: 8 },
      run_usuario: empleadoCreado?.run,
      empleado: { empleado_id: empleadoCreado?.empleado_id },
      cencos: empleadoCreado.cenco ? [empleadoCreado.cenco] : [] // Asignamos su cenco inicial
    });

    const guardarNuevoUser = await this.userRepository.save(nuevoUser);
    if (!guardarNuevoUser) throw new HttpException('Error al crear el usuario', 400);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.empleadoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.empleadoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.empleadoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el empleado "${guardarNuevoEmpleado.nombres} ${guardarNuevoEmpleado.apellido_paterno} ${guardarNuevoEmpleado.apellido_materno}" para la empresa "${empleadoCreado.empresa?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Creación de Empleado',
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

        await this.empleadoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: 'Empleado creado correctamente y asociado a un usuario!'
    }
  }


  async findAll(page: number, limit: number, empresa_id?: number, estado_id?: number, search?: string) {
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (empresa_id) filters.empresa = { empresa_id };
    if (estado_id) filters.estado = { estado_id };

    let whereClause: any = filters;
    if (search && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      whereClause = [
        { ...filters, run: ILike(term) },
        { ...filters, nombres: ILike(term) },
        { ...filters, apellido_paterno: ILike(term) },
        { ...filters, apellido_materno: ILike(term) },
      ];
    }

    const [empleados, total] = await this.empleadoRepository.findAndCount({
      where: whereClause,
      order: {
        empleado_id: 'ASC'
      },
      skip,
      take: limit,
      relations: [
        'estado',
        'empresa',
        'cargo',
        'turno',
        "cenco",
        "turno.detalle_turno.horario",
        "turno.detalle_turno.dia"
      ]
    });

    if (empleados.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit
      }
    }

    const ids = empleados.map(e => e.empleado_id);
    const usuarios = await this.userRepository.find({
      where: { empleado: { empleado_id: In(ids) } },
      relations: ['empleado', 'cencos']
    });

    const data = empleados.map(emp => {
      const u = usuarios.find(usuario => usuario.empleado?.empleado_id === emp.empleado_id);
      return {
        ...emp,
        cencos: u ? u.cencos : []
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async update(
    id: number, 
    updateEmpleadoDto: UpdateEmpleadoDto | any, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    const dtoTransformado = { ...updateEmpleadoDto };
    
    // 1. Buscamos el empleado cargando la relación empresa
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: id },
      relations: ['empresa']
    });

    if (!empleado) {
      throw new NotFoundException(`El empleado con ID ${id} no existe`);
    }

    // Mezclamos los datos
    this.empleadoRepository.merge(empleado, dtoTransformado);

    if (updateEmpleadoDto.email) {
      const existeEmail = await this.empleadoRepository.findOne({
        where: {
          email: updateEmpleadoDto.email,
          empleado_id: Not(id)
        },
      })
      if (existeEmail) throw new ConflictException('Ya existe el email');
    }

    if (updateEmpleadoDto.email_laboral) {
      const existeEmailLaboral = await this.empleadoRepository.findOne({
        where: {
          email_laboral: updateEmpleadoDto.email_laboral,
          empleado_id: Not(id)
        },
      })
      if (existeEmailLaboral) throw new ConflictException('Ya existe el email laboral');
    }

    try {
      // 1. Guardar cambios en empleado
      const actualizada = await this.empleadoRepository.save(empleado);

      // 2. Traer empleado actualizado con su nuevo cenco
      const empGuardado = await this.empleadoRepository.findOne({
        where: { empleado_id: actualizada.empleado_id },
        relations: ['cenco', 'empresa']
      });

      if (empGuardado) {
        // Buscar especifícamente el usuario que pertenece a este empleado (ficha)
        const usuario = await this.userRepository.findOne({
          where: { empleado: { empleado_id: empGuardado.empleado_id } },
          relations: ['cencos', 'empleado']
        });

        if (usuario) {
          // Si el empleado tiene un cenco, lo asignamos; si se lo quitaron, vaciamos la lista.
          usuario.cencos = empGuardado.cenco ? [empGuardado.cenco] : [];
          await this.userRepository.save(usuario);
        }
      }

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.empleadoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.empleadoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.empleadoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del empleado "${actualizada.nombres} ${actualizada.apellido_paterno} ${actualizada.apellido_materno || ''}" perteneciente a la empresa "${empGuardado?.empresa?.nombre_empresa || 'Desconocida'}"`,
            tipo_evento: 'Edición de Empleado',
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

          await this.empleadoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Empleado actualizado con éxito y cenco de usuario sincronizado',
        id: actualizada.empleado_id
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe el empleado');
      }
      throw new InternalServerErrorException('Error al actualizar el empleado');
    }
  }

  remove(id: number) {
    return `This action removes a #${id} empleado`;
  }

  async findByRun(run: string) {
    const empleado = await this.empleadoRepository.find({
      where: { run },
      relations: [
        'estado',
        'empresa',
        'cargo',
        'turno',
        "cenco",
        "turno.detalle_turno.horario",
        "turno.detalle_turno.dia"
      ]
    });
    if (empleado.length === 0) {
      throw new NotFoundException(`El empleado con RUN ${run} no existe`);
    }
    return empleado;
  }

  async findByNombre(nombre: string) {
    const query = this.empleadoRepository.createQueryBuilder('empleado')
      .leftJoinAndSelect('empleado.estado', 'estado')
      .leftJoinAndSelect('empleado.empresa', 'empresa')
      .leftJoinAndSelect('empleado.cargo', 'cargo')
      .leftJoinAndSelect('empleado.turno', 'turno')
      .leftJoinAndSelect('turno.detalle_turno', 'detalle_turno')
      .leftJoinAndSelect('detalle_turno.horario', 'horario')
      .leftJoinAndSelect('detalle_turno.dia', 'dia')
      .leftJoinAndSelect('empleado.cenco', 'cenco')
      .where("CONCAT(empleado.nombres, ' ', empleado.apellido_paterno, ' ', empleado.apellido_materno) ILIKE :nombre", {
        nombre: `%${nombre}%`
      });

    const empleados = await query.getMany();

    if (empleados.length === 0) {
      throw new NotFoundException(`El empleado con nombre ${nombre} no existe`);
    }
    return empleados;
  }

  async findByEmpresa(empresa_id: number) {
    const empleados = await this.empleadoRepository.find({
      where: { empresa: { empresa_id } },
      relations: [
        'estado',
        'empresa',
        'cargo',
        'turno',
        "cenco",
        "turno.detalle_turno.horario",
        "turno.detalle_turno.dia"
      ]
    });
    if (empleados.length === 0) {
      throw new NotFoundException(`El empleado con empresa ${empresa_id} no existe`);
    }
    return empleados;
  }

  async cambiarPinFirma(
    idUser: number, 
    pinActual: number, 
    pinFirma: number, 
    ip: string, 
    userAgent: string
  ) {
    const usuario = await this.userRepository.findOne({
      where: { usuario_id: idUser },
      relations: ['empleado', 'empresa', 'empleado.empresa', 'empleado.cenco', 'empleado.cenco.departamento']
    });
    
    if (!usuario) throw new NotFoundException(`El usuario con ID ${idUser} no existe`)
    
    if (!usuario.empleado) {
      throw new BadRequestException('El usuario no tiene una ficha de empleado asociada para cambiar el PIN');
    }

    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: usuario.empleado.empleado_id },
      relations: ['empresa', 'cenco', 'cenco.departamento']
    });

    if (!empleado) throw new NotFoundException(`El empleado asociado al usuario no existe`)
    if (empleado.pin_firma !== pinActual) throw new BadRequestException('El pin actual es incorrecto')
    
    empleado.pin_firma = pinFirma;
    await this.empleadoRepository.save(empleado);

    // --- AUDITORÍA ---
    const parser = new UAParser(userAgent);
    const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

    const registroEvento = this.empleadoRepository.manager.create(RegistroEvento, {
      usuario: usuario.username,
      evento: `El usuario ${usuario.username} de la empresa ${usuario.empresa?.nombre_empresa || 'Sin Empresa'} ha cambiado su PIN de firma electrónica`,
      tipo_evento: 'Cambio PIN Firma',
      ip: ip,
      fecha: new Date(),
      hora: new Date().toTimeString().split(' ')[0],
      sistema_operativo: parser.getOS().name || 'Desconocido',
      browser: navegador,
      empresa: empleado?.empresa?.nombre_empresa || usuario?.empresa?.nombre_empresa,
      depto: empleado?.cenco?.departamento?.nombre_departamento || "Sin Depto",
      cenco: empleado?.cenco?.nombre_cenco || "Sin Cenco",
      rut: usuario.run_usuario
    });

    await this.empleadoRepository.manager.save(registroEvento);
    // -----------------

    return {
      message: 'Pin de firma cambiado correctamente'
    }
  }

  async cambiarNoti(idUsuario: number, noti30Entrada?: boolean, noti30Salida?: boolean) {
    const usuario = await this.userRepository.findOne({
      where: { usuario_id: idUsuario },
      relations: ['empleado']
    })
    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${idUsuario} no existe`)
    }
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: usuario.empleado.empleado_id }
    })
    if (!empleado) {
      throw new NotFoundException(`El empleado con ID ${idUsuario} no existe`)
    }
    if (noti30Entrada !== undefined) {
      empleado.noti_30_entrada = noti30Entrada;
    }
    if (noti30Salida !== undefined) {
      empleado.noti_30_salida = noti30Salida;
    }
    await this.empleadoRepository.save(empleado);
    return {
      message: 'Notificaciones cambiadas correctamente'
    }
  }
  async obtenerNoti(idUsuario: number) {
    const usuario = await this.userRepository.findOne({
      where: { usuario_id: idUsuario },
      relations: ['empleado']
    })
    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${idUsuario} no existe`)
    }
    const empleado = await this.empleadoRepository.findOne({
      where: { empleado_id: usuario.empleado.empleado_id }
    })
    if (!empleado) {
      throw new NotFoundException(`El empleado con ID ${idUsuario} no existe`)
    }
    return {
      noti_30_entrada: empleado.noti_30_entrada,
      noti_30_salida: empleado.noti_30_salida
    }
  }

}


