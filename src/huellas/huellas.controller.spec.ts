import { Test, TestingModule } from '@nestjs/testing';
import { HuellasController } from './huellas.controller';
import { HuellasService } from './huellas.service';

describe('HuellasController', () => {
  let controller: HuellasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HuellasController],
      providers: [HuellasService],
    }).compile();

    controller = module.get<HuellasController>(HuellasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
