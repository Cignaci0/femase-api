import { Module } from '@nestjs/common';
import { DiasCompensacionAprobadasService } from './dias_compensacion_aprobadas.service';
import { DiasCompensacionAprobadasController } from './dias_compensacion_aprobadas.controller';

@Module({
  controllers: [DiasCompensacionAprobadasController],
  providers: [DiasCompensacionAprobadasService],
})
export class DiasCompensacionAprobadasModule {}
