import { Test, TestingModule } from '@nestjs/testing';
import { TurnoFlexibleController } from './turno-flexible.controller';
import { TurnoFlexibleService } from './turno-flexible.service';

describe('TurnoFlexibleController', () => {
  let controller: TurnoFlexibleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurnoFlexibleController],
      providers: [TurnoFlexibleService],
    }).compile();

    controller = module.get<TurnoFlexibleController>(TurnoFlexibleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
