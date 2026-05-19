import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAfpDto } from './dto/create-afp.dto';
import { UpdateAfpDto } from './dto/update-afp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Afp } from './entities/afp.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class AfpService {
  constructor(
    @InjectRepository(Afp)
    private readonly afpRepository: Repository<Afp>,
  ) {}

  async buscarTodasLasAfp() {
    const busqueda = await this.afpRepository.find({
      order:{
        afp_id: "ASC"
      }
    });
    if (busqueda.length === 0 ) {
      return {afp: []};
    }
    return {afp: busqueda};
  }

  async create(
    createAfpDto: CreateAfpDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ) {
    const nuevoAfp = this.afpRepository.create(createAfpDto);
    const guardada = await this.afpRepository.save(nuevoAfp);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.afpRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.afpRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.afpRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado la AFP "${guardada.nombre_afp}"`,
          tipo_evento: 'Creación de AFP',
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

        await this.afpRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardada;
  }


  findOne(id: number) {
    return `This action returns a #${id} afp`;
  }

  async update(
    id: number, 
    updateAfpDto: UpdateAfpDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos la AFP
    const afp = await this.afpRepository.findOne({
      where: { afp_id: id }
    });

    if (!afp) {
      throw new NotFoundException(`La AFP con ID ${id} no existe`);
    }

    // 2. Mezclamos los datos
    this.afpRepository.merge(afp, updateAfpDto);

    try {
      const actualizada = await this.afpRepository.save(afp);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.afpRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.afpRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

          const registroEvento = this.afpRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos de la AFP "${actualizada.nombre_afp}"`,
            tipo_evento: 'Edición de AFP',
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

          await this.afpRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return actualizada;
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar la AFP');
    }
  }

  async remove(id: number) {
    return `This action removes a #${id} afp`;
  }
}
