import { Module } from '@nestjs/common';
import { HorasCompensacionService } from './horas_compensacion.service';
import { HorasCompensacionController } from './horas_compensacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { HorasCompensacion } from './entities/horas_compensacion.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Empleado, HorasCompensacion])],
  controllers: [HorasCompensacionController],
  providers: [HorasCompensacionService],
  exports: [HorasCompensacionService]
})
export class HorasCompensacionModule {}
