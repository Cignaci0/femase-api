import { Module } from '@nestjs/common';
import { DiasCompensacionService } from './dias_compensacion.service';
import { DiasCompensacionController } from './dias_compensacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiasCompensacion } from './entities/dias_compensacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiasCompensacion])
  ],
  controllers: [DiasCompensacionController],
  providers: [DiasCompensacionService],
})
export class DiasCompensacionModule { }
