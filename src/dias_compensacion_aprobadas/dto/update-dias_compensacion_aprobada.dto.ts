import { PartialType } from '@nestjs/swagger';
import { CreateDiasCompensacionAprobadaDto } from './create-dias_compensacion_aprobada.dto';

export class UpdateDiasCompensacionAprobadaDto extends PartialType(CreateDiasCompensacionAprobadaDto) {}
