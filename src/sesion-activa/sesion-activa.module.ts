import { Global, Module } from '@nestjs/common';
import { SesionActivaService } from './sesion-activa.service';
import { SesionActivaController } from './sesion-activa.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SesionActiva } from './entities/sesion-activa.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SesionActiva])],
  controllers: [SesionActivaController],
  providers: [SesionActivaService],
  exports: [SesionActivaService],
})
export class SesionActivaModule { }
