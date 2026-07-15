import { Test, TestingModule } from '@nestjs/testing';
import { HorasCompensacionController } from './horas_compensacion.controller';
import { HorasCompensacionService } from './horas_compensacion.service';

describe('HorasCompensacionController', () => {
  let controller: HorasCompensacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HorasCompensacionController],
      providers: [HorasCompensacionService],
    }).compile();

    controller = module.get<HorasCompensacionController>(HorasCompensacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
