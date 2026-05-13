import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHorasLegaleDto } from './dto/create-horas_legale.dto';
import { UpdateHorasLegaleDto } from './dto/update-horas_legale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { HorasLegale } from './entities/horas_legale.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { RegistroEvento } from 'src/registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class HorasLegalesService {

  constructor(
    @InjectRepository(HorasLegale)
    private readonly horasRepository: Repository<HorasLegale>
  ) { }
  create(createHorasLegaleDto: CreateHorasLegaleDto) {


    return 'This action adds a new horasLegale';
  }

  async findAll() {
    const horarios = await this.horasRepository.find();
    return horarios;
  }

  findOne(id: number) {
    return `This action returns a #${id} horasLegale`;
  }

  async update(id: number, updateHorasLegaleDto: UpdateHorasLegaleDto, idUsuario: number, ip: string, userAgent: string) {
    // Separamos idUsuario de los datos de la base de datos para evitar errores de TypeORM
    const { idUsuario: _, ...datosAActualizar } = updateHorasLegaleDto;
    
    const actualizado = await this.horasRepository.update(id, datosAActualizar);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.horasRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.horasRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent);
        const browser = parser.getBrowser();
        const navegador = `${browser.name || 'Desconocido'}-${browser.version || ''}`;

        const registroEvento = this.horasRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} ha actualizado el horario legal a ${updateHorasLegaleDto.hora} horas.`,
          tipo_evento: 'Actualización Horas Legales',
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

        await this.horasRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return actualizado;
  }

  remove(id: number) {
    return `This action removes a #${id} horasLegale`;
  }
}
