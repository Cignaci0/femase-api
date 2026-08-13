import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Dispositivo } from 'src/dispositivo/entities/dispositivo.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';

@Entity({ schema: 'db_fmc', name: 'tareas_huellas' })
export class TareaHuella {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'ID de la tarea', example: 1 })
  tarea_id: number;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: 'Índice/posición del dedo de la huella', example: 0, required: false })
  indice: number;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Huella en formato XML', example: '<xml>...</xml>' })
  huella: string;

  @Column()
  @ApiProperty({ description: 'ID del dispositivo', example: 1 })
  dispositivo_id: number;

  @ManyToOne(() => Dispositivo)
  @JoinColumn({ name: 'dispositivo_id' })
  dispositivo: Dispositivo;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: 'Número de ficha del empleado', example: '123456' })
  num_ficha: string;

  @ManyToOne(() => Empleado, { nullable: true })
  @JoinColumn({ name: 'num_ficha', referencedColumnName: 'num_ficha' })
  empleado: Empleado;

  @Column({ type: 'varchar', length: 2, default: 'NP' })
  @ApiProperty({ description: 'Estado de la tarea (NP = No procesada, C = Completada)', example: 'NP', default: 'NP' })
  estado: string;
}
