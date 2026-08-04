import { Test, TestingModule } from '@nestjs/testing';
import { HuellasService } from './huellas.service';

describe('HuellasService', () => {
  let service: HuellasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HuellasService],
    }).compile();

    service = module.get<HuellasService>(HuellasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
