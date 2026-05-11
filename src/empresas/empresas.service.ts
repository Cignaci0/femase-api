import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Empresa } from './empresas.entity';
import { Repository } from 'typeorm';
import { EmpresaCreadaDto } from './dto/empresa-creada.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { BuscarEmpresaDto } from './dto/search-empresa.dto';
import { log } from 'util';
import * as fs from 'fs';
import { join } from 'path';
import { User } from 'src/users/user.entity';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(Empresa)
    private empresaRepository: Repository<Empresa>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) { }

  async obtenerTodasLasEmpresas(usuarioId: number, usuario: string): Promise<BuscarEmpresaDto> {
    const allEmpresas = await this.empresaRepository.find({
      relations: ['estado', 'departamentos'],
      order: { empresa_id: 'asc' }
    });
    const usuarioLogueado = await this.userRepository.findOne({
      where: { usuario_id: usuarioId },
      relations: ['perfil']
    });
    if (!usuarioLogueado) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (allEmpresas.length > 0) {
      if (usuario == 'superadmin' || usuarioLogueado.perfil.perfil_id == 3) {
        return {
          empresas: allEmpresas,
          mensaje: 'Usuario superadmin o fiscalizador, se envian todas las empresas'
        }
      } else {
        const filteredEmpresas = await this.empresaRepository.query(`
          select e.empresa_id, e.nombre_empresa, e.rut_empresa, e.direccion_empresa, e.estado_id, e.comuna_empresa, e.email_empresa
          from db_fmc.empresa as e
          join db_fmc.usuario as u 
          on u.empresa_id = e.empresa_id
          where u.usuario_id = $1`
          , [usuarioId]);
        return {
          empresas: filteredEmpresas,
          mensaje: 'Se envia la empresa del usuario'
        }
      }
    } else {
      return {
        empresas: [],
        mensaje: 'No hay empresas'
      }
    }
  }

  async create(empresa: Empresa) {
    const nuevaEmpresa = this.empresaRepository.create(empresa);
    return await this.empresaRepository.save(nuevaEmpresa);
  }

  async actualizarEmpresa(id: number, updateDto: UpdateEmpresaDto): Promise<any> {
    // 1. Preload busca por ID y "mezcla" los datos nuevos con los existentes
    const empresa = await this.empresaRepository.preload({
      empresa_id: id,
      ...updateDto,
    });

    // 2. Si no existe el ID, lanzamos 404
    if (!empresa) {
      throw new NotFoundException(`La empresa con ID ${id} no existe`);
    }

    try {
      // 3. Guardamos los cambios (esto disparará validaciones de BD)
      const actualizada = await this.empresaRepository.save(empresa);

      // 4. Retornamos respuesta personalizada
      return {
        mensaje: 'Empresa actualizada con éxito',
        id: actualizada.empresa_id,
        nombre: actualizada.nombre_empresa,
        rut: actualizada.rut_empresa
      };
    } catch (error) {
      // Manejo de error por si el RUT duplicado choca
      if (error.code === '23505') {
        throw new ConflictException('El RUT ya pertenece a otra empresa');
      }
      throw new InternalServerErrorException('Error al actualizar la empresa');
    }
  }

  async actualizarHorario(id: number, horario: number) {
    const empresa = await this.empresaRepository.findOne({ where: { empresa_id: id } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    empresa.horario = horario;
    const actualizada = await this.empresaRepository.save(empresa);
    return {
      mensaje: 'Horario actualizado con éxito',
      id: actualizada.empresa_id,
      horario: actualizada.horario
    };
  }

  async actualizarLogo(id: number, filename: string) {
    const empresa = await this.empresaRepository.findOne({ where: { empresa_id: id } });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    if (empresa.urlLogo) {
      const pathAnterior = join('C:\\Users\\ADMINISTRATIVO\\Documents\\Proyectos\\API\\api-femase-fmc\\imgEmpresas', empresa.urlLogo); // CAMBIAR RUTA
      if (fs.existsSync(pathAnterior)) {
        fs.unlinkSync(pathAnterior);
      }
    }
    // Actualizamos el nombre del nuevo archivo en la base de datos
    empresa.urlLogo = filename;
    await this.empresaRepository.save(empresa);
    return {
      mensaje: 'Logo actualizado con éxito',
      urlLogo: filename
    };
  }

  async obtenerLogoEmpresa(id: number) {
    const empresa = await this.empresaRepository.findOne({ where: { empresa_id: id } });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return empresa.urlLogo;
  }

}