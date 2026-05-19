import { PartialType } from '@nestjs/swagger';
import { CreateHorasLegaleDto } from './create-horas_legale.dto';

export class UpdateHorasLegaleDto extends PartialType(CreateHorasLegaleDto) {
    idUsuario?: number;
}
