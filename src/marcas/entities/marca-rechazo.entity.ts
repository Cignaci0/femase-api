import { ApiProperty } from "@nestjs/swagger";
import { Dispositivo } from "src/dispositivo/entities/dispositivo.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'marcas_rechazo', schema: 'db_fmc' })
export class MarcaRechazo {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'ID del rechazo', example: 1 })
  id_rechazo: number;

  @Column({ type: 'varchar' })
  @ApiProperty({ description: 'Huella del rechazo', example: 'abc123huella' })
  huella_rechazo: string;

  @Column()
  @ApiProperty({ description: 'ID del dispositivo', example: 1 })
  dispositivo_id: number;

  @ManyToOne(() => Dispositivo)
  @JoinColumn({ name: 'dispositivo_id' })
  dispositivo: Dispositivo;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: 'Fecha del rechazo', example: '2026-08-05' })
  fecha: Date;

  @Column({ type: 'time without time zone', nullable: true })
  @ApiProperty({ description: 'Hora del rechazo', example: '18:00:00' })
  hora: string;
}