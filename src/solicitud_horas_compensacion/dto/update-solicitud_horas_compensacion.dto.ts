import { PartialType } from '@nestjs/swagger';
import { CreateSolicitudHorasCompensacionDto } from './create-solicitud_horas_compensacion.dto';

export class UpdateSolicitudHorasCompensacionDto extends PartialType(CreateSolicitudHorasCompensacionDto) {}
