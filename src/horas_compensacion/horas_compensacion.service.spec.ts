import { Test, TestingModule } from '@nestjs/testing';
import { HorasCompensacionService } from './horas_compensacion.service';

describe('HorasCompensacionService', () => {
  let service: HorasCompensacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HorasCompensacionService],
    }).compile();

    service = module.get<HorasCompensacionService>(HorasCompensacionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
