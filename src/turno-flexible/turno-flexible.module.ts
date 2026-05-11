import { Module } from '@nestjs/common';
import { TurnoFlexibleService } from './turno-flexible.service';
import { TurnoFlexibleController } from './turno-flexible.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnoFlexible } from './entities/turno-flexible.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TurnoFlexible])],
  controllers: [TurnoFlexibleController],
  providers: [TurnoFlexibleService],
})
export class TurnoFlexibleModule { }
