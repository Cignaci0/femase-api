import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';
import { Feriado } from './entities/feriado.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FeriadosService {

  constructor(
    @InjectRepository(Feriado)
    private readonly feriadosRepository: Repository<Feriado>,
  ) { }

  async create(
    createFeriadoDto: CreateFeriadoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    const nuevoferiado = this.feriadosRepository.create(createFeriadoDto);
    const guardada = await this.feriadosRepository.save(nuevoferiado);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.feriadosRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.feriadosRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.feriadosRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el feriado "${guardada.nombre}" para la fecha "${guardada.fecha}"`,
          tipo_evento: 'Creación de Feriado',
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

        await this.feriadosRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardada;
  }

  async findAll() {
    return await this.feriadosRepository.find({
      order: { id: 'ASC' }
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} feriado`;
  }

  async update(
    id: number, 
    updateFeriadoDto: UpdateFeriadoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el feriado
    const feriado = await this.feriadosRepository.findOne({
      where: { id }
    });

    if (!feriado) {
      throw new NotFoundException(`El feriado con ID ${id} no existe`);
    }

    const feriadoAntiguo = cloneEntity(feriado);

    // 2. Mezclamos los datos
    this.feriadosRepository.merge(feriado, updateFeriadoDto);

    try {
      const actualizada = await this.feriadosRepository.save(feriado);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.feriadosRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.feriadosRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const textoCambios = generarTextoCambios(feriadoAntiguo, updateFeriadoDto);

          const registroEvento = this.feriadosRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del feriado "${actualizada.nombre}" para la fecha "${actualizada.fecha}". ${textoCambios}`,
            tipo_evento: 'Edición de Feriado',
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

          await this.feriadosRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Feriado actualizado con exito',
        id: actualizada.id
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar el feriado');
    }
  }

  async seed() {
    const count = await this.feriadosRepository.count();
    if (count > 0) {
      return { mensaje: 'La tabla feriados ya contiene datos', total: count };
    }

    const filePath = path.join(process.cwd(), 'utils', 'feriados.json');
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const feriados: any[] = JSON.parse(rawData);

    const entidades: Feriado[] = feriados.map((f) => {
      const { id, ...data } = f;
      return this.feriadosRepository.create(data as Partial<Feriado>);
    });

    await this.feriadosRepository.save(entidades);
    return { mensaje: 'Feriados insertados con éxito', total: entidades.length };
  }

  remove(id: number) {
    return `This action removes a #${id} feriado`;
  }
}
