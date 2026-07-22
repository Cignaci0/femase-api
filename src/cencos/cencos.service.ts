import { BadRequestException, ConflictException, HttpException, Inject, Injectable, InternalServerErrorException, NotFoundException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cenco } from './cenco.entity';
import { In, Repository } from 'typeorm';
import { CencoCreadoDTO } from './dto/created-cenco.dto';
import { UpdateCencoDTO } from './dto/update-cenco.dto';
import { SearchCencoDto } from './dto/search-cenco.dto';
import { CreateCencoDto } from './dto/create-cenco.dto';
import { Turno } from 'src/turno/entities/turno.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { User } from 'src/users/user.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Departamento } from 'src/departamentos/departamento.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');

@Injectable()
export class CencosService {
  constructor(
    @InjectRepository(Cenco)
    private cencoRepository: Repository<Cenco>,
    @InjectRepository(Turno)
    private turnoRepository: Repository<Turno>
  ) { }

  async findAll() {
    return await this.cencoRepository.find({
      relations: ['dispositivos', 'departamento', 'departamento.empresa', 'estado', 'turnos',],
      order: { cenco_id: 'asc' }
    })
  }

  async findByDepartamentoId(departamentoId: number) {
    return await this.cencoRepository.find({
      where: { departamento: { departamento_id: departamentoId } },
      relations: ['dispositivos', 'departamento', 'departamento.empresa', 'estado', 'turnos',],
      order: { cenco_id: 'asc' }
    })
  }

  async create(
    createCencoDto: CreateCencoDto,
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
    const nuevoCenco = this.cencoRepository.create(createCencoDto);
    const guardado = await this.cencoRepository.save(nuevoCenco);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.cencoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.cencoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        // Buscamos el nombre del departamento al que pertenece el cenco
        const deptoId = createCencoDto.departamento_id
        const departamentoDestino = await this.cencoRepository.manager.findOne(Departamento, {
          where: { departamento_id: deptoId },
          relations: ['empresa']
        });

        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

        const registroEvento = this.cencoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el centro de costo "${guardado.nombre_cenco}" para el departamento "${departamentoDestino?.nombre_departamento || 'Desconocido'}" de la empresa "${departamentoDestino?.empresa?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Creación de Centro de Costo',
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

        await this.cencoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  async actualizarCenco(
    id: number,
    updateDto: UpdateCencoDTO,
    idUsuario: number,
    ip: string,
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el cenco cargando relaciones para el log
    const cenco = await this.cencoRepository.findOne({
      where: { cenco_id: id },
      relations: ['departamento', 'departamento.empresa', 'estado']
    });

    if (!cenco) {
      throw new NotFoundException(`El centro de costo con ID ${id} no existe`);
    }

    const cencoAntiguo = cloneEntity(cenco);

    // 2. Mezclamos los datos nuevos
    this.cencoRepository.merge(cenco, updateDto);

    if (updateDto.email_notificacion) {
      await this.cencoRepository.manager.update(Empleado, { cenco: { cenco_id: id } }, { email_noti: updateDto.email_notificacion })
    }

    try {
      const actualizada = await this.cencoRepository.save(cenco);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.cencoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.cencoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const browser = parser.getBrowser();
          const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

          const textoCambios = generarTextoCambios(cencoAntiguo, updateDto);

          const registroEvento = this.cencoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del centro de costo "${actualizada.nombre_cenco}" del departamento "${actualizada.departamento?.nombre_departamento || 'Desconocido'}" de la empresa "${actualizada.departamento?.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
            tipo_evento: 'Edición de Centro de Costo',
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

          await this.cencoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        mensaje: 'Centro de costo actualizado con éxito',
        id: actualizada.cenco_id,
        nombre: actualizada.nombre_cenco
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe el centro de costo');
      }
      throw new InternalServerErrorException('Error al actualizar el centro de costo');
    }
  }

  async asignarTurnos(
    cencoId: number,
    turnoIds: number[],
    idUsuario: number,
    ip: string,
    userAgent: string
  ) {
    // 1. Buscamos el cenco cargando sus turnos actuales y relaciones para el log
    const cenco = await this.cencoRepository.findOne({
      where: { cenco_id: cencoId },
      relations: ['turnos', 'departamento', 'departamento.empresa']
    });

    if (!cenco) throw new NotFoundException('Centro no encontrado');

    // 2. Reasignamos el array con objetos que solo tengan el ID
    cenco.turnos = turnoIds.map(id => ({ turno_id: id } as Turno));
    // Obtenemos los nombres de los turnos para el log de auditoría
    const turnosEntities = await Promise.all(
      turnoIds.map(id => this.cencoRepository.manager.findOne(Turno, { where: { turno_id: id } }))
    );
    const nombreTurnos = turnosEntities.filter(t => t).map(t => t?.nombre).join(', ');

    // 3. Guardamos la entidad completa
    const guardado = await this.cencoRepository.save(cenco);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.cencoRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.cencoRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

        const registroEvento = this.cencoRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha asignado los turnos "${nombreTurnos}" al centro de costo "${cenco.nombre_cenco}" de la empresa "${cenco.departamento?.empresa?.nombre_empresa || 'Desconocida'}"`,
          tipo_evento: 'Asignación de Turnos',
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

        await this.cencoRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardado;
  }

  async buscarCencosPorUsuario(usuarioId: number): Promise<any> {
    const cencos = await this.cencoRepository.find({
      relations: ['usuarios']
    })

    let nuevaListaCencos: Array<Cenco> = new Array<Cenco>;

    cencos.forEach(cenco => {
      const existe: boolean = cenco.usuarios.some((usuario) => usuario.usuario_id == usuarioId);
      if (existe) {
        nuevaListaCencos.push(cenco);
      }
    });

    return nuevaListaCencos;
  }
}
