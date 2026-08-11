import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsIP, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateDispositivoDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'nombre', example: 'ADMINISTRACION_CENTRAL' })
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'ubicacion', example: 'La Rioja 2956 - Entrada B' })
  ubicacion: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'comuna', example: 'Quinta Normal' })
  comuna: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'modelo', example: 'FEMASE-CONTROL' })
  modelo: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'fabricante', example: 'FEMASE' })
  fabricante: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'version_firmware', example: '2.0.0.0' })
  version_firmware: string;

  @IsIP()
  @IsNotEmpty()
  @ApiProperty({ description: 'direccion_ip', example: '10.14.0.12' })
  direccion_ip: string;

  @IsString()
  @IsOptional() // O IsNotEmpty según tu lógica
  @ApiProperty({ description: 'gateway', example: '0.0.0.0' })
  gateway: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'dns', example: 'femase.cl' })
  dns: string;

  // --- RELACIONES (IDs) ---
  //@IsNumber()
  //@IsNotEmpty()
  //@ApiProperty({ description: "ID del centro", example: 1 })
  centro_id: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: "ID del estado", example: 1 })
  estado_id: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ description: "ID del tipo de dispositivo", example: 1 })
  tipo_dispositivo_id: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: "ID de la empresa", example: 1 })
  empresa_id?: number;
}