import { PartialType } from '@nestjs/swagger';
import { CreateDiasCompensacionDto } from './create-dias_compensacion.dto';

export class UpdateDiasCompensacionDto extends PartialType(CreateDiasCompensacionDto) {}
