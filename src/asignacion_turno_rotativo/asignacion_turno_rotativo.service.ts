import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAsignacionTurnoRotativoDto } from './dto/create-asignacion_turno_rotativo.dto';
import { UpdateAsignacionTurnoRotativoDto } from './dto/update-asignacion_turno_rotativo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AsignacionTurnoRotativo } from './entities/asignacion_turno_rotativo.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AsignacionTurnoRotativoService {
  @InjectRepository(AsignacionTurnoRotativo)
  private readonly asignacionTurnoRotativoRepository: Repository<AsignacionTurnoRotativo>;

 async create(createAsignacionTurnoRotativoDto: CreateAsignacionTurnoRotativoDto) {
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
  return this.asignacionTurnoRotativoRepository.save(nuevo);
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

  async update(id: number, updateAsignacionTurnoRotativoDto: UpdateAsignacionTurnoRotativoDto) {
    const existe = await this.asignacionTurnoRotativoRepository.findOne({
      where: { id: id }
    });
    if (!existe) {
      throw new HttpException(
        `No se encontro la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }
    const actualizar = this.asignacionTurnoRotativoRepository.update(id, updateAsignacionTurnoRotativoDto);
    if (!actualizar) {
      throw new HttpException(
        `No se pudo actualizar la asignacion de turno rotativo`,
        HttpStatus.BAD_REQUEST
      );
    }
    return actualizar;
  }

 async remove(id: number) {
  const existe = await this.asignacionTurnoRotativoRepository.findOne({
    where: { id: id }
  });
  if (!existe) {
    throw new HttpException(
      `No se encontro la asignacion de turno rotativo`,
      HttpStatus.BAD_REQUEST
    );
  }
  const eliminar = this.asignacionTurnoRotativoRepository.remove(existe);
  if (!eliminar) {
    throw new HttpException(
      `No se pudo eliminar la asignacion de turno rotativo`,
      HttpStatus.BAD_REQUEST
    );
  }
  return eliminar;
  }
}
