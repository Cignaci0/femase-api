import { PartialType } from '@nestjs/swagger';
import { CreateHorasCompensacionDto } from './create-horas_compensacion.dto';

export class UpdateHorasCompensacionDto extends PartialType(CreateHorasCompensacionDto) {}
