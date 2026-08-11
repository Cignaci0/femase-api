import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TareaHuella } from './entities/tarea-huella.entity';
import { TareasHuellasService } from './tareas-huellas.service';
import { TareasHuellasController } from './tareas-huellas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TareaHuella])],
  controllers: [TareasHuellasController],
  providers: [TareasHuellasService],
  exports: [TareasHuellasService],
})
export class TareasHuellasModule {}
