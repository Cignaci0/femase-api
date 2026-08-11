import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMarcaDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Fecha de la marca', example: '2023-10-25' })
  fecha_marca: Date;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Hora de la marca', example: '08:30:00' })
  hora_marca: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'Tipo de evento (1=Entrada, 2=Salida, etc.)', example: 1 })
  evento: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Hashcode generado', example: 'abc123hash' })
  hashcode?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Información adicional', example: 'Marca manual' })
  info_adicional?: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del dispositivo', example: 1 })
  dispositivo_id: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Número de ficha', example: '123456' })
  num_ficha: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: 'ID del tipo de marca', example: 1 })
  id_tipo_marca?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Comentario', example: 'Comentario' })
  comentario?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Huella de rechazo', example: 'abc123huella' })
  huella_rechazo?: string;
}
