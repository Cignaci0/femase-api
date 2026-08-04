import { PartialType } from '@nestjs/swagger';
import { CreateHuellaDto } from './create-huella.dto';

export class UpdateHuellaDto extends PartialType(CreateHuellaDto) {}
