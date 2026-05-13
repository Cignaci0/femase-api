import { Module } from '@nestjs/common';
import { RegistroEventoService } from './registro_evento.service';
import { RegistroEventoController } from './registro_evento.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroEvento } from './entities/registro_evento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroEvento])
  ],
  controllers: [RegistroEventoController],
  providers: [RegistroEventoService],
})
export class RegistroEventoModule { }
