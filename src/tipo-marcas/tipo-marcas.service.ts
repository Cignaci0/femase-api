import { HttpException, Inject, Injectable } from '@nestjs/common';
import { CreateTipoMarcaDto } from './dto/create-tipo-marca.dto';
import { UpdateTipoMarcaDto } from './dto/update-tipo-marca.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TipoMarca } from './entities/tipo-marca.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class TipoMarcasService {

  constructor(@InjectRepository(TipoMarca)
  private tipoMarcasRepository: Repository<TipoMarca>
  ) { }

  async create(createTipoMarcaDto: CreateTipoMarcaDto, idUsuario: number, ip: string, userAgent: string) {
    const nuevoTipoMarca = this.tipoMarcasRepository.create(createTipoMarcaDto);
    const guardado = await this.tipoMarcasRepository.save(nuevoTipoMarca) as unknown as TipoMarca;

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.tipoMarcasRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.tipoMarcasRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.tipoMarcasRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el tipo de marca "${guardado.nombre}"`,
          tipo_evento: 'Creación Tipo de Marca',
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

        await this.tipoMarcasRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: "Tipo de marca creado con exito",
      id: guardado.tipo_marca_id
    }
  }

  findAll() {
    return this.tipoMarcasRepository.find({
      relations: {
        estado_id: true
      },
      order: {
        tipo_marca_id: "ASC"
      }
    });
  }

  
  findOne(id: number) {
    return `This action returns a #${id} tipoMarca`;
  }

  async update(id: number, updateTipoMarcaDto: UpdateTipoMarcaDto, idUsuario: number, ip: string, userAgent: string) {
    const tipoMarca = await this.tipoMarcasRepository.findOne({
      where: {
        tipo_marca_id: id
      },
      relations: ['estado']
    });
    if (!tipoMarca) {
      throw new HttpException('Tipo de marca no encontrado', 404);
    }

    const tipoMarcaAntiguo = cloneEntity(tipoMarca);

    this.tipoMarcasRepository.merge(tipoMarca, updateTipoMarcaDto as any);
    const actualizado = await this.tipoMarcasRepository.save(tipoMarca);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.tipoMarcasRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.tipoMarcasRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const textoCambios = generarTextoCambios(tipoMarcaAntiguo, updateTipoMarcaDto);

        const registroEvento = this.tipoMarcasRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado el tipo de marca "${actualizado.nombre}". ${textoCambios}`,
          tipo_evento: 'Edición Tipo de Marca',
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

        await this.tipoMarcasRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return {
      message: "Tipo de marca actualizado con exito"
    };
  }

  remove(id: number) {
    return `This action removes a #${id} tipoMarca`;
  }
}
