import { HttpException, Injectable } from '@nestjs/common';
import { CreateTipoAusenciaDto } from './dto/create-tipo-ausencia.dto';
import { UpdateTipoAusenciaDto } from './dto/update-tipo-ausencia.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TipoAusencia } from './entities/tipo-ausencia.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Estado } from 'src/estado/estado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class TipoAusenciaService {
  constructor(
    @InjectRepository(TipoAusencia)
    private readonly tipoAusenciaRepository: Repository<TipoAusencia>,
  ) { }

  async create(createTipoAusenciaDto: any, idUsuario: number, ip: string, userAgent: string) {
    const { estado_id, ...resto } = createTipoAusenciaDto;
    const tipoAusencia = this.tipoAusenciaRepository.create({
      ...resto,
      estado: { estado_id: estado_id },
    });
    const guardado = await this.tipoAusenciaRepository.save(tipoAusencia) as unknown as TipoAusencia;

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.tipoAusenciaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.tipoAusenciaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const estadoInfo = await this.tipoAusenciaRepository.manager.findOne(Estado, { where: { estado_id } });

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.tipoAusenciaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el tipo de ausencia "${guardado.nombre}" con estado "${estadoInfo?.nombre_estado || 'Desconocido'}"`,
          tipo_evento: 'Creación Tipo de Ausencia',
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

        await this.tipoAusenciaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: "Tipo ausencia creado con exito",
      id: guardado.id
    }
  }

  findAll() {
    const tipoAusencias = this.tipoAusenciaRepository.find({
      relations: [
        'estado'
      ]
    });
    return tipoAusencias;
  }

  findOne(id: number) {
    return `This action returns a #${id} tipoAusencia`;
  }

  async update(id: number, updateTipoAusenciaDto: UpdateTipoAusenciaDto, idUsuario: number, ip: string, userAgent: string) {
    const tipoAusencia = await this.tipoAusenciaRepository.findOne({
      where: { id },
      relations: ['estado']
    });

    if (!tipoAusencia) {
      throw new HttpException('Tipo de ausencia no encontrado', 404);
    }

    const tipoAusenciaAntiguo = cloneEntity(tipoAusencia);

    const { estado_id, ...resto } = updateTipoAusenciaDto;
    this.tipoAusenciaRepository.merge(tipoAusencia, {
      ...resto,
      estado: estado_id ? { estado_id } : tipoAusencia.estado
    } as any);

    const actualizado = await this.tipoAusenciaRepository.save(tipoAusencia);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.tipoAusenciaRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.tipoAusenciaRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const textoCambios = generarTextoCambios(tipoAusenciaAntiguo, updateTipoAusenciaDto);

        const registroEvento = this.tipoAusenciaRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado el tipo de ausencia "${actualizado.nombre}". ${textoCambios}`,
          tipo_evento: 'Edición Tipo de Ausencia',
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

        await this.tipoAusenciaRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: "Tipo ausencia actualizado con exito",
    }
  }

  remove(id: number) {
    return `This action removes a #${id} tipoAusencia`;
  }
}
