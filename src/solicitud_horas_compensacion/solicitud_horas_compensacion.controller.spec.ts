import { Test, TestingModule } from '@nestjs/testing';
import { SolicitudHorasCompensacionController } from './solicitud_horas_compensacion.controller';
import { SolicitudHorasCompensacionService } from './solicitud_horas_compensacion.service';

describe('SolicitudHorasCompensacionController', () => {
  let controller: SolicitudHorasCompensacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitudHorasCompensacionController],
      providers: [SolicitudHorasCompensacionService],
    }).compile();

    controller = module.get<SolicitudHorasCompensacionController>(SolicitudHorasCompensacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
