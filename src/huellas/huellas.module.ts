import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HuellasService } from './huellas.service';
import { HuellasController } from './huellas.controller';
import { Huella } from './entities/huella.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Huella])],
  controllers: [HuellasController],
  providers: [HuellasService],
  exports: [HuellasService],
})
export class HuellasModule {}
