import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateHuellaDto } from './dto/create-huella.dto';
import { UpdateHuellaDto } from './dto/update-huella.dto';
import { Huella } from './entities/huella.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { TareaHuella } from 'src/tareas-huellas/entities/tarea-huella.entity';

@Injectable()
export class HuellasService {
  constructor(
    @InjectRepository(Huella)
    private readonly huellaRepository: Repository<Huella>,
  ) { }

  async create(createHuellaDto: CreateHuellaDto): Promise<Huella> {
    const nuevaHuella = this.huellaRepository.create(createHuellaDto);
    return await this.huellaRepository.save(nuevaHuella);
  }

  async pagination(page: number = 1, query: string = '', limit: number = 10, empresaId?: number) {
    const skip = (page - 1) * limit;

    let numFichasValidos: string[] | null = null;
    
    if (empresaId) {
      const empleados = await this.huellaRepository.manager
        .createQueryBuilder(Empleado, 'empleado')
        .select('empleado.num_ficha', 'num_ficha')
        .where('empleado.empresa_id = :empresaId', { empresaId })
        .getRawMany();
        
      numFichasValidos = empleados.map(e => e.num_ficha);
      
      if (numFichasValidos.length === 0) {
        return { data: [], total: 0, page, lastPage: 0 };
      }
    }

    const qbFichas = this.huellaRepository.createQueryBuilder('huella')
      .select('DISTINCT huella.num_ficha', 'num_ficha')
      .orderBy('huella.num_ficha', 'ASC');

    if (query) {
      qbFichas.andWhere('huella.num_ficha LIKE :query', { query: `%${query}%` });
    }

    if (numFichasValidos) {
      qbFichas.andWhere('huella.num_ficha IN (:...fichas)', { fichas: numFichasValidos });
    }

    const totalFichasQuery = await qbFichas.getRawMany();
    const total = totalFichasQuery.length;

    qbFichas.limit(limit).offset(skip);
    const fichasPaginadas = await qbFichas.getRawMany();
    const fichasToFetch = fichasPaginadas.map(f => f.num_ficha);

    if (fichasToFetch.length === 0) {
      return { data: [], total, page, lastPage: Math.ceil(total / limit) };
    }

    const huellas = await this.huellaRepository.find({
      where: { num_ficha: In(fichasToFetch) },
      order: { num_ficha: 'ASC', indice: 'ASC' }
    });

    const grupos: { [num_ficha: string]: { huellas: any[]; dispositivo_id: number } } = {};

    for (const h of huellas) {
      const ficha = h.num_ficha || '';
      if (!grupos[ficha]) {
        grupos[ficha] = {
          dispositivo_id: h.dispositivo_id,
          huellas: [],
        };
      }
      grupos[ficha].huellas.push({
        huella_id: h.huella_id,
        indice: h.indice,
        huella_xml: h.huella_xml,
        dispositivo_id: h.dispositivo_id,
      });
    }

    const data = Object.entries(grupos).map(([ficha, data]) => ({
      num_ficha: ficha,
      cantidad_huellas: data.huellas.length,
      dispositivo_id: data.dispositivo_id,
      huellas: data.huellas,
    }));

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findByDispositivo(dispositivo_id: number) {
    const huellas = await this.huellaRepository.find({
      where: { dispositivo_id },
      relations: ['empleado', 'empleado.empresa'],
    });

    const grupos: { [num_ficha: string]: { huellas: any[]; dispositivo_id: number } } = {};

    for (const h of huellas) {
      const ficha = h.num_ficha || '';
      if (!grupos[ficha]) {
        grupos[ficha] = { dispositivo_id: h.dispositivo_id, huellas: [] };
      }
      grupos[ficha].huellas.push({
        huella_id: h.huella_id,
        indice: h.indice,
        huella_xml: h.huella_xml,
        dispositivo_id: h.dispositivo_id,
      });
    }

    return Object.entries(grupos).map(([ficha, data]) => ({
      num_ficha: ficha,
      cantidad_huellas: data.huellas.length,
      dispositivo_id: data.dispositivo_id,
      huellas: data.huellas,
    }));
  }

  async findOne(id: number): Promise<Huella> {
    const huella = await this.huellaRepository.findOne({
      where: { huella_id: id },
      relations: ['empleado', 'dispositivo'],
    });

    if (!huella) {
      throw new NotFoundException(`Huella con ID ${id} no encontrada`);
    }

    return huella;
  }

  async update(id: number, updateHuellaDto: UpdateHuellaDto): Promise<Huella> {
    const huella = await this.findOne(id);
    this.huellaRepository.merge(huella, updateHuellaDto);
    return await this.huellaRepository.save(huella);
  }


}
