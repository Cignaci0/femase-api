import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTareaHuellaDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Estado de la tarea (NP = No procesada, C = Completada)', example: 'C' })
  estado: string;
}
