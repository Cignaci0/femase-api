import { Test, TestingModule } from '@nestjs/testing';
import { SolicitudHorasCompensacionService } from './solicitud_horas_compensacion.service';

describe('SolicitudHorasCompensacionService', () => {
  let service: SolicitudHorasCompensacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SolicitudHorasCompensacionService],
    }).compile();

    service = module.get<SolicitudHorasCompensacionService>(SolicitudHorasCompensacionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
