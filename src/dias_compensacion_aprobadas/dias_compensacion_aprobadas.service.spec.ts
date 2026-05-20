import { Test, TestingModule } from '@nestjs/testing';
import { DiasCompensacionAprobadasService } from './dias_compensacion_aprobadas.service';

describe('DiasCompensacionAprobadasService', () => {
  let service: DiasCompensacionAprobadasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiasCompensacionAprobadasService],
    }).compile();

    service = module.get<DiasCompensacionAprobadasService>(DiasCompensacionAprobadasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
