import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Departamento } from './departamento.entity';
import { Repository } from 'typeorm';
import { UpdateDepartamentoDto } from './dto/update-departamento.dto';
import { DepartamentoCreatedDto } from './dto/departamento-created.dto';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
import { Empresa } from 'src/empresas/empresas.entity';
import { generarTextoCambios, cloneEntity } from 'src/utils/audit.utils';
const UAParser = require('ua-parser-js');
import { SearchDeptoDto } from './dto/search-depto.dto';

@Injectable()
export class DepartamentosService {
  constructor(
    @InjectRepository(Departamento)
    private departamentoRepository: Repository<Departamento>
  ) { }

  async buscarTodosLosDepartamentos(): Promise<SearchDeptoDto> {
    const busqueda = await this.departamentoRepository.find({
      relations: ['estado', 'empresa', 'cencos'],
      order: { departamento_id: 'ASC' }
    });

    if (busqueda.length > 0) {
      return {
        departamentos: busqueda
      }
    } else {
      return {
        departamentos: []
      }
    }
  }

  async buscarDeptoPorEmpresa(empresa_id: number) {
    const busqueda = await this.departamentoRepository.find({
      relations: ['estado', 'empresa', 'cencos'],
      order: { departamento_id: 'ASC' },
      where: { empresa: { empresa_id } }
    });

    if (busqueda.length > 0) {
      return {
        departamentos: busqueda
      }
    } else {
      return {
        departamentos: []
      }
    }
  }

  async crearDepartamento(
    departamento: Departamento, 
    usuario: string, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<DepartamentoCreatedDto> {
    try {
      const nuevoDepartamento = this.departamentoRepository.create(departamento);
      const guardada = await this.departamentoRepository.save(nuevoDepartamento);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.departamentoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.departamentoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          // Buscamos el nombre de la empresa a la que se le creó el depto
          const empresaId = (departamento.empresa as any).empresa_id || (departamento as any).empresa;
          const empresaDestino = await this.departamentoRepository.manager.findOne(Empresa, {
            where: { empresa_id: empresaId }
          });

          const parser = new UAParser(userAgent);
          const browser = parser.getBrowser();
          const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

          const registroEvento = this.departamentoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado el departamento "${guardada.nombre_departamento}" para la empresa "${empresaDestino?.nombre_empresa || 'Desconocida'}"`,
            tipo_evento: 'Creación de Departamento',
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

          await this.departamentoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      return {
        departamento_id: guardada.departamento_id,
        nombre_departamento: guardada.nombre_departamento,
        mensaje: 'Departamento creado correctamente'
      }

    } catch (error) {
      // Error de PostgreSQL/MySQL para "llave duplicada" (comúnmente código 23505)
      if (error.code === '23505') {
        throw new ConflictException('El departamento ya existe o el identificador está duplicado');
      }

      // Error de validación de datos
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Los datos proporcionados no son válidos');
      }

      // Error genérico por si falla la conexión o algo inesperado
      throw new InternalServerErrorException('Error crítico al crear el departamento en la base de datos');
    }
  }

  async actualizarDepto(
    id: number, 
    updateDto: UpdateDepartamentoDto, 
    idUsuario: number, 
    ip: string, 
    userAgent: string
  ): Promise<any> {
    // 1. Buscamos el departamento cargando su relación con la empresa para el log
    const departamento = await this.departamentoRepository.findOne({
      where: { departamento_id: id },
      relations: ['empresa', 'estado']
    });

    // 2. Si no existe el ID, lanzamos 404
    if (!departamento) {
      throw new NotFoundException(`El departamento con ID ${id} no existe`);
    }

    const departamentoAntiguo = cloneEntity(departamento);

    // 3. Mezclamos los datos nuevos
    this.departamentoRepository.merge(departamento, updateDto);

    try {
      // 4. Guardamos los cambios
      const actualizada = await this.departamentoRepository.save(departamento);

      // --- AUDITORÍA ---
      if (idUsuario && !isNaN(idUsuario)) {
        const autor = await this.departamentoRepository.manager.findOne(User, {
          where: { usuario_id: idUsuario },
          relations: ['empleado', 'empresa']
        });

        if (autor) {
          let empleadoAutor: Empleado | null = null;
          if (autor?.empleado?.empleado_id) {
            empleadoAutor = await this.departamentoRepository.manager.findOne(Empleado, {
              where: { empleado_id: autor.empleado.empleado_id },
              relations: ['empresa', 'cenco', 'cenco.departamento']
            });
          }

          const parser = new UAParser(userAgent);
          const browser = parser.getBrowser();
          const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

          const textoCambios = generarTextoCambios(departamentoAntiguo, updateDto);

          const registroEvento = this.departamentoRepository.manager.create(RegistroEvento, {
            usuario: autor?.username,
            evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha actualizado los datos del departamento "${actualizada.nombre_departamento}" de la empresa "${actualizada.empresa?.nombre_empresa || 'Desconocida'}". ${textoCambios}`,
            tipo_evento: 'Edición de Departamento',
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

          await this.departamentoRepository.manager.save(registroEvento);
        }
      }
      // -----------------

      // 5. Retornamos respuesta personalizada
      return {
        mensaje: 'Departamento actualizado con éxito',
        id: actualizada.departamento_id,
        nombre: actualizada.nombre_departamento
      };
    } catch (error) {
      // Manejo de error por si el RUT duplicado choca
      if (error.code === '23505') {
        throw new ConflictException('El nombre ya pertenece a otro departamento');
      }
      throw new InternalServerErrorException('Error al actualizar el departamento');
    }
  }
}
