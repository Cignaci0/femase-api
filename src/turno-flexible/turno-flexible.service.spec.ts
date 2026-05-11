import { Test, TestingModule } from '@nestjs/testing';
import { TurnoFlexibleService } from './turno-flexible.service';

describe('TurnoFlexibleService', () => {
  let service: TurnoFlexibleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurnoFlexibleService],
    }).compile();

    service = module.get<TurnoFlexibleService>(TurnoFlexibleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
