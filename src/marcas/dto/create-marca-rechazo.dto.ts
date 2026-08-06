import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMarcaRechazoDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Huella del rechazo', example: 'abc123huella' })
  huella_rechazo: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del dispositivo', example: 1 })
  dispositivo_id: number;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ description: 'Fecha del rechazo', example: '2026-08-05' })
  fecha?: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'Hora del rechazo', example: '18:00:00' })
  hora?: string;
}
