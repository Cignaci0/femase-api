import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateHuellaDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Huella digital en formato Base64', example: 'dGhlIGZpbmdlcnByaW50IGRhdGE=' })
  huella_xml: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Número de ficha del empleado', example: '12345' })
  num_ficha: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del dispositivo donde se capturó la huella', example: 1 })
  dispositivo_id: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Índice de la huella', example: 1 })
  indice: number;
}
