import { Test, TestingModule } from '@nestjs/testing';
import { DiasCompensacionAprobadasController } from './dias_compensacion_aprobadas.controller';
import { DiasCompensacionAprobadasService } from './dias_compensacion_aprobadas.service';

describe('DiasCompensacionAprobadasController', () => {
  let controller: DiasCompensacionAprobadasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiasCompensacionAprobadasController],
      providers: [DiasCompensacionAprobadasService],
    }).compile();

    controller = module.get<DiasCompensacionAprobadasController>(DiasCompensacionAprobadasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
