import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { CreateAusenciaDto } from './dto/create-ausencia.dto';
import { UpdateAusenciaDto } from './dto/update-ausencia.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ausencia } from './entities/ausencia.entity';
import { Between, Repository } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class AusenciasService {
  constructor(
    @InjectRepository(Ausencia)
    private readonly ausenciaRepository: Repository<Ausencia>,
  ) { }

  async create(
    createAusenciaDto: CreateAusenciaDto,
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
    const existe = await this.ausenciaRepository.query(
      `SELECT * FROM db_fmc.ausencias WHERE num_ficha = $1 AND $2 BETWEEN fecha_inicio AND fecha_fin`,
      [createAusenciaDto.num_ficha, createAusenciaDto.fecha_inicio]
    );

    if (existe.length > 0) {
      throw new BadRequestException('Ya existe una ausencia en esa fecha');
    }
    
    const guardada = await this.ausenciaRepository.save(createAusenciaDto as any);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.ausenciaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.ausenciaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        // Buscamos el empleado destino por num_ficha
        const empleadoDestino = await this.ausenciaRepository.manager.findOne(Empleado, {
          where: { num_ficha: createAusenciaDto.num_ficha },
          relations: ['empresa']
        });

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
        const inicioFormateado = new Date(createAusenciaDto.fecha_inicio).toLocaleDateString('es-ES', opcionesFecha);
        const finFormateado = new Date(createAusenciaDto.fecha_fin).toLocaleDateString('es-ES', opcionesFecha);

        const registroEvento = this.ausenciaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado una ausencia (${inicioFormateado} al ${finFormateado}) para el empleado "${empleadoDestino?.nombres || ''} ${empleadoDestino?.apellido_paterno || ''}" perteneciente a la empresa "${empleadoDestino?.empresa?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Creación de Ausencia',
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

        await this.ausenciaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardada;
  }

  async update(
    id: number, 
    updateAusenciaDto: UpdateAusenciaDto,
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
    // 1. Buscamos la ausencia existente
    const ausencia = await this.ausenciaRepository.findOneBy({ id });
    if (!ausencia) {
      throw new HttpException(
        `No se encontraron registros para la ausencia con id ${id}`,
        404
      );
    }

    // 2. Validamos duplicidad de fechas si se están cambiando
    if (updateAusenciaDto.fecha_inicio) {
      const existeFecha = await this.ausenciaRepository.query(
        `SELECT * FROM db_fmc.ausencias WHERE num_ficha = $1 AND $2 BETWEEN fecha_inicio AND fecha_fin AND id != $3`,
        [updateAusenciaDto.num_ficha || ausencia.num_ficha, updateAusenciaDto.fecha_inicio, id]
      );

      if (existeFecha.length > 0) {
        throw new BadRequestException('Ya existe una ausencia en esa fecha');
      }
    }

    const ausenciaAntigua = cloneEntity(ausencia);

    // 3. Mezclamos los datos
    // Usamos 'as any' para evitar el error de tipado entre el string del DTO y el objeto Empleado de la entidad
    this.ausenciaRepository.merge(ausencia, updateAusenciaDto as any);
    
    // Mapeo manual para motivo_ausencia si es necesario (ya que el DTO usa un nombre distinto a la relación de la entidad)
    if (updateAusenciaDto.motivo_ausencia) {
      ausencia.tipo_ausencia = { id: updateAusenciaDto.motivo_ausencia } as any;
    }

    const actualizada = await this.ausenciaRepository.save(ausencia);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.ausenciaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.ausenciaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        // Buscamos el empleado destino por num_ficha de la ausencia (ya que viene de la BD)
        const empleadoDestino = await this.ausenciaRepository.manager.findOne(Empleado, {
          where: { num_ficha: actualizada.num_ficha as any },
          relations: ['empresa']
        });

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
        const inicioFormateado = new Date(actualizada.fecha_inicio).toLocaleDateString('es-ES', opcionesFecha);
        const finFormateado = new Date(actualizada.fecha_fin).toLocaleDateString('es-ES', opcionesFecha);

        const textoCambios = generarTextoCambios(ausenciaAntigua, updateAusenciaDto);

        const registroEvento = this.ausenciaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado la ausencia (${inicioFormateado} al ${finFormateado}) del empleado "${empleadoDestino?.nombres || ''} ${empleadoDestino?.apellido_paterno || ''}" perteneciente a la empresa "${empleadoDestino?.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
          tipo_evento: 'Edición de Ausencia',
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

        await this.ausenciaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return actualizada;
  }

  async findAll(numFicha: string, fecha_inicio?: Date, fecha_fin?: Date) {
    const where: any = {
      num_ficha: numFicha
    };

    if (fecha_inicio && fecha_fin) {
      where.fecha_fin = Between(fecha_inicio, fecha_fin);
    }

    const existe = await this.ausenciaRepository.find({
      order: {
        id: "ASC"
      },
      relations: ["tipo_ausencia"],
      select: {
        tipo_ausencia: {
          id: true,
          nombre: true
        }
      },
      where: where
    })

    if (existe.length === 0) {
      throw new HttpException(
        `No se encontraron registros para el empleado con ficha ${numFicha} en el rango indicado`,
        404
      );
    }
    return existe;
  }

  remove(id: number) {
    return `This action removes a #${id} ausencia`;
  }
}
