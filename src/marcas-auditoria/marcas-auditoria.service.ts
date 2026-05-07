import { Injectable } from '@nestjs/common';
import { CreateMarcasAuditoriaDto } from './dto/create-marcas-auditoria.dto';
import { UpdateMarcasAuditoriaDto } from './dto/update-marcas-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MarcasAuditoria } from './entities/marcas-auditoria.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MarcasAuditoriaService {
  constructor(
    @InjectRepository(MarcasAuditoria)
    private readonly marcasAuditoriaRepository: Repository<MarcasAuditoria>,
  ) { }

  create(createMarcasAuditoriaDto: CreateMarcasAuditoriaDto) {
    return 'This action adds a new marcasAuditoria';
  }

  async findAll(idMarca: number) {
    if (!idMarca) {
      return [];
    }

    const resultados = await this.marcasAuditoriaRepository.find({
      where: {
        id_marca: idMarca
      },
      order: {
        fecha_actualizacion: 'DESC'
      }
    });

    return resultados.map((r: any) => {
      let fMarca = r.fecha_marca;
      if (fMarca instanceof Date) {
        fMarca = fMarca.toISOString().substring(0, 10);
      } else if (typeof fMarca === 'string') {
        fMarca = fMarca.substring(0, 10);
      }

      let fActualizacion = r.fecha_actualizacion;
      if (fActualizacion instanceof Date) {
        fActualizacion = fActualizacion.toISOString().substring(0, 19).replace('T', ' ');
      } else if (typeof fActualizacion === 'string') {
        fActualizacion = fActualizacion.substring(0, 19).replace('T', ' ');
      }

      return { ...r, fecha_marca: fMarca, fecha_actualizacion: fActualizacion };
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} marcasAuditoria`;
  }

  update(id: number, updateMarcasAuditoriaDto: UpdateMarcasAuditoriaDto) {
    return `This action updates a #${id} marcasAuditoria`;
  }

  remove(id: number) {
    return `This action removes a #${id} marcasAuditoria`;
  }
}
