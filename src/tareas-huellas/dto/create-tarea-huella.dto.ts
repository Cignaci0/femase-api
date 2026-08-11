import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTareaHuellaDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Huella individual seleccionada', example: '<xml>...</xml>' })
  huella?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ApiProperty({ description: 'Arreglo de huellas seleccionadas', example: ['<xml>1</xml>', '<xml>2</xml>'] })
  huellas?: string[];

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del dispositivo seleccionado', example: 1 })
  dispositivo_id: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Número de ficha del empleado', example: '123456' })
  num_ficha?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Estado inicial (NP = No procesada, C = Completada)', example: 'NP', default: 'NP' })
  estado?: string;
}
