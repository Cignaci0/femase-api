import { PartialType } from '@nestjs/swagger';
import { CreateAutorizaHorasExtraDto } from './create-autoriza_horas_extra.dto';

export class UpdateAutorizaHorasExtraDto extends PartialType(CreateAutorizaHorasExtraDto) {
    estado:string
}
