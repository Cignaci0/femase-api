import { PartialType } from '@nestjs/swagger';
import { CreateDiasCompensacionDto } from './create-dias_compensacion.dto';

export class UpdateDiasCompensacionDto extends PartialType(CreateDiasCompensacionDto) {
  horas_descontar?: number;
  estado?: string | null;
  fecha_inicio_descanso?: string | Date;
  fecha_fin_descanso?: string | Date;
}
