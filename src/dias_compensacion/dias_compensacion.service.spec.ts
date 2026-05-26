import { Test, TestingModule } from '@nestjs/testing';
import { DiasCompensacionService } from './dias_compensacion.service';

describe('DiasCompensacionService', () => {
  let service: DiasCompensacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiasCompensacionService],
    }).compile();

    service = module.get<DiasCompensacionService>(DiasCompensacionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
