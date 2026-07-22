import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAsignacionTurnoRotativoDto } from './dto/create-asignacion_turno_rotativo.dto';
import { UpdateAsignacionTurnoRotativoDto } from './dto/update-asignacion_turno_rotativo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AsignacionTurnoRotativo } from './entities/asignacion_turno_rotativo.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class AsignacionTurnoRotativoService {
  @InjectRepository(AsignacionTurnoRotativo)
  private readonly asignacionTurnoRotativoRepository: Repository<AsignacionTurnoRotativo>;

 async create(
    createAsignacionTurnoRotativoDto: CreateAsignacionTurnoRotativoDto,
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
  const { empleado_id, horario_id, fecha_inicio_turno, fecha_fin_turno } = createAsignacionTurnoRotativoDto;
  const existe = await this.asignacionTurnoRotativoRepository.find({
    relations: { empleado: true },
    where: {
      empleado: { empleado_id: empleado_id },
      fecha_inicio_turno: fecha_inicio_turno
    }
  });
  if (existe.length > 0) {
    throw new HttpException(
      `El empleado ${existe[0].empleado.nombres} ya tiene esta fecha ${fecha_inicio_turno} de asignacion de turno rotativo`, 
      HttpStatus.BAD_REQUEST
    );
  }
  const nuevo = this.asignacionTurnoRotativoRepository.create({
    empleado: { empleado_id: empleado_id } as any,
    horario: { horario_id: horario_id } as any,
    fecha_inicio_turno: fecha_inicio_turno,
    fecha_fin_turno: fecha_fin_turno
  });
  
  const guardada = await this.asignacionTurnoRotativoRepository.save(nuevo);

  // --- AUDITORÍA ---
  if (idUsuario && !isNaN(idUsuario)) {
    const autor = await this.asignacionTurnoRotativoRepository.manager.findOne(User, {
      where: { usuario_id: idUsuario },
      relations: ['empleado', 'empresa']
    });

    if (autor) {
      let empleadoAutor: Empleado | null = null;
      if (autor?.empleado?.empleado_id) {
        empleadoAutor = await this.asignacionTurnoRotativoRepository.manager.findOne(Empleado, {
          where: { empleado_id: autor.empleado.empleado_id },
          relations: ['empresa', 'cenco', 'cenco.departamento']
        });
      }

      // Buscamos el empleado destino
      const empleadoDestino = await this.asignacionTurnoRotativoRepository.manager.findOne(Empleado, {
        where: { empleado_id: empleado_id },
        relations: ['empresa']
      });

      const parser = new UAParser(userAgent);
      const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

      const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
      const inicioFormateado = new Date(fecha_inicio_turno).toLocaleDateString('es-ES', opcionesFecha);
      const finFormateado = new Date(fecha_fin_turno).toLocaleDateString('es-ES', opcionesFecha);

      const registroEvento = this.asignacionTurnoRotativoRepository.manager.create(RegistroEvento, {
        usuario: autor?.username,
        evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha asignado un turno rotativo (${inicioFormateado} al ${finFormateado}) al empleado "${empleadoDestino?.nombres || ''} ${empleadoDestino?.apellido_paterno || ''}" perteneciente a la empresa "${empleadoDestino?.empresa?.nombre_empresa || 'Desconocida'}"`,
        tipo_evento: 'Creación Asignación Turno Rotativo',
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

      await this.asignacionTurnoRotativoRepository.manager.save(registroEvento);
    }
  }
  // -----------------

  return guardada;
}



  async findAll(idEmpleado: number, page: number = 1) {
    const limit = 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.asignacionTurnoRotativoRepository.findAndCount({
      where: {
        empleado: { empleado_id: idEmpleado }
      },
      relations: {
        empleado: {
          empresa: true,
          cenco: true
        },
        horario: true,
      },
      order: {
        fecha_inicio_turno: "ASC"
      },
      select: {
        empleado: {
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          empleado_id: true,
          run: true,
          num_ficha: true,
          empresa: {
            nombre_empresa: true,
            empresa_id: true,
          },
          cenco: {
            cenco_id: true,
            nombre_cenco: true,
            departamento_id: true
          }
        }
      },
      take: limit,
      skip: skip,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit)
    };
  }


  findOne(id: number) {
    return `This action returns a #${id} asignacionTurnoRotativo`;
  }

  async update(
    id: number, 
    updateAsignacionTurnoRotativoDto: UpdateAsignacionTurnoRotativoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    const existe = await this.asignacionTurnoRotativoRepository.findOne({
      where: { id: id },
      relations: ['empleado', 'empleado.empresa']
    });
    if (!existe) {
      throw new HttpException(
        `No se encontro la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }
    
    const existeAntiguo = cloneEntity(existe);

    this.asignacionTurnoRotativoRepository.merge(existe, updateAsignacionTurnoRotativoDto);
    const actualizar = await this.asignacionTurnoRotativoRepository.save(existe);
    
    if (!actualizar) {
      throw new HttpException(
        `No se pudo actualizar la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.asignacionTurnoRotativoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.asignacionTurnoRotativoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
        const inicioFormateado = new Date(actualizar.fecha_inicio_turno).toLocaleDateString('es-ES', opcionesFecha);
        const finFormateado = new Date(actualizar.fecha_fin_turno).toLocaleDateString('es-ES', opcionesFecha);

        const textoCambios = generarTextoCambios(existeAntiguo, updateAsignacionTurnoRotativoDto);

        const registroEvento = this.asignacionTurnoRotativoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado el turno rotativo (${inicioFormateado}) del empleado "${existe.empleado?.nombres || ''} ${existe.empleado?.apellido_paterno || ''}" perteneciente a la empresa "${existe.empleado?.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
          tipo_evento: 'Edición Asignación Turno Rotativo',
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

        await this.asignacionTurnoRotativoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return actualizar;
  }

  async remove(id: number, idUsuario: number, ip: string, userAgent: string) {
    const existe = await this.asignacionTurnoRotativoRepository.findOne({
      where: { id: id },
      relations: ['empleado', 'empleado.empresa']
    });
    if (!existe) {
      throw new HttpException(
        `No se encontro la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Guardamos los datos para el log antes de borrar
    const copiaParaLog = { ...existe };

    const eliminar = await this.asignacionTurnoRotativoRepository.remove(existe);
    if (!eliminar) {
      throw new HttpException(
        `No se pudo eliminar la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.asignacionTurnoRotativoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.asignacionTurnoRotativoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const inicioFormateado = new Date(copiaParaLog.fecha_inicio_turno).toLocaleDateString('es-ES', opcionesFecha);

        const registroEvento = this.asignacionTurnoRotativoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha eliminado el turno rotativo (${inicioFormateado}) del empleado "${copiaParaLog.empleado?.nombres || ''} ${copiaParaLog.empleado?.apellido_paterno || ''}" perteneciente a la empresa "${copiaParaLog.empleado?.empresa?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Eliminación Asignación Turno Rotativo',
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

        await this.asignacionTurnoRotativoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return eliminar;
  }
}
