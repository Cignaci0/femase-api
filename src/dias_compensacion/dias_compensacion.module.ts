import { Module } from '@nestjs/common';
import { DiasCompensacionService } from './dias_compensacion.service';
import { DiasCompensacionController } from './dias_compensacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiasCompensacion } from './entities/dias_compensacion.entity';
import { User } from 'src/users/user.entity';
import { AutorizaHorasExtra } from 'src/autoriza_horas_extras/entities/autoriza_horas_extra.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiasCompensacion, User, AutorizaHorasExtra])
  ],
  controllers: [DiasCompensacionController],
  providers: [DiasCompensacionService],
})
export class DiasCompensacionModule { }
