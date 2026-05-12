import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateDocumentoDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: 'Nombre del documento', example: 'Contrato de Trabajo' })
    nombre: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: 'Tipo de documento', example: 'PDF' })
    tipo: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: 'Contenido del documento', example: 'Texto del documento...' })
    texto: string;

    @IsNotEmpty()
    @ApiProperty({ description: 'ID de la empresa asociada', example: 1 })
    empresa: any;
}
