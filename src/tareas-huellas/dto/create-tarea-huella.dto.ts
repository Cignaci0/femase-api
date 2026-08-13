import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class HuellaItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Huella en formato XML', example: '<xml>huella_1</xml>' })
  huella: string;

  @IsInt()
  @IsNotEmpty()
  @ApiProperty({ description: 'Índice/posición del dedo', example: 0 })
  indice: number;
}

export class CreateTareaHuellaDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del dispositivo', example: 5 })
  dispositivo_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HuellaItemDto)
  @ApiProperty({
    description: 'Arreglo de huellas',
    type: [HuellaItemDto],
    example: [
      { xml: '<xml>huella_1</xml>', indice: 0 },
      { xml: '<xml>huella_2</xml>', indice: 1 },
    ],
  })
  huellas: HuellaItemDto[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Número de ficha del empleado', example: '13472383-1' })
  num_ficha: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Estado inicial (NP = No procesada, C = Completada)', example: 'NP', default: 'NP' })
  estado?: string;
}
