import { Injectable } from '@nestjs/common';
import { CreateRegistroConexioneDto } from './dto/create-registro_conexione.dto';
import { UpdateRegistroConexioneDto } from './dto/update-registro_conexione.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { RegistroConexione } from './entities/registro_conexione.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RegistroConexionesService {
  constructor(
    @InjectRepository(RegistroConexione)
    private readonly registroConexioneRepository: Repository<RegistroConexione>,
  ) { }

  async create(createRegistroConexioneDto: CreateRegistroConexioneDto) {
    const payload = {
      ...createRegistroConexioneDto,
      empresa: { empresa_id: createRegistroConexioneDto.empresa }
    };
    const nuevaConexion = this.registroConexioneRepository.create(payload as any);
    return await this.registroConexioneRepository.save(nuevaConexion);
  }

  async findAll(page: number = 1, limit: number = 10, idEmpresa?: number) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (idEmpresa) {
      where.empresa = { empresa_id: idEmpresa };
    }

    const [data, total] = await this.registroConexioneRepository.findAndCount({
      where,
      relations: ['empresa'],
      order: { id: 'DESC' },
      take: limit,
      skip: skip,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  findOne(id: number) {
    return this.registroConexioneRepository.findOneBy({ id });
  }

  update(id: number, updateRegistroConexioneDto: UpdateRegistroConexioneDto) {
    return `This action updates a #${id} registroConexione`;
  }

  remove(id: number) {
    return `This action removes a #${id} registroConexione`;
  }
}
