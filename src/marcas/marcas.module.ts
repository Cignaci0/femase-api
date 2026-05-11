import { Module, forwardRef } from '@nestjs/common';
import { MarcasService } from './marcas.service';
import { MarcasController } from './marcas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marca } from './entities/marca.entity';
import { MarcasAuditoria } from 'src/marcas-auditoria/entities/marcas-auditoria.entity';
import { Feriado } from '../feriados/entities/feriado.entity';
import { AutorizaHorasExtra } from 'src/autoriza_horas_extras/entities/autoriza_horas_extra.entity';
import { TurnoFlexible } from 'src/turno-flexible/entities/turno-flexible.entity';

import { DetalleAsistenciaModule } from 'src/detalle-asistencia/detalle-asistencia.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marca, MarcasAuditoria, Feriado, AutorizaHorasExtra, TurnoFlexible]),
    forwardRef(() => DetalleAsistenciaModule),
    ConfigModule
  ],
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService]
})
export class MarcasModule { }
