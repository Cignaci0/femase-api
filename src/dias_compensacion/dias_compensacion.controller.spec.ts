import { Test, TestingModule } from '@nestjs/testing';
import { DiasCompensacionController } from './dias_compensacion.controller';
import { DiasCompensacionService } from './dias_compensacion.service';

describe('DiasCompensacionController', () => {
  let controller: DiasCompensacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiasCompensacionController],
      providers: [DiasCompensacionService],
    }).compile();

    controller = module.get<DiasCompensacionController>(DiasCompensacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
