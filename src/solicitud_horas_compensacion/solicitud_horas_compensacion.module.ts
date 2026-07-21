import { Module } from '@nestjs/common';
import { SolicitudHorasCompensacionService } from './solicitud_horas_compensacion.service';
import { SolicitudHorasCompensacionController } from './solicitud_horas_compensacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudHorasCompensacion } from './entities/solicitud_horas_compensacion.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { AsignacionTurnoRotativo } from 'src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';
import { HorasCompensacionModule } from 'src/horas_compensacion/horas_compensacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudHorasCompensacion, Empleado, AsignacionTurnoRotativo]),
    HorasCompensacionModule
  ],
  controllers: [SolicitudHorasCompensacionController],
  providers: [SolicitudHorasCompensacionService],
})
export class SolicitudHorasCompensacionModule {}
