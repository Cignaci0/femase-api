import { PartialType } from '@nestjs/swagger';
import { CreateTurnoFlexibleDto } from './create-turno-flexible.dto';

export class UpdateTurnoFlexibleDto extends PartialType(CreateTurnoFlexibleDto) {}
