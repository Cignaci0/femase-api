import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Empleado } from 'src/empleado/entities/empleado.entity';

@Entity({ schema: 'db_fmc', name: 'solicitud_horas_compensacion' })
export class SolicitudHorasCompensacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'empleado_id' })
  empleado: Empleado;

  @Column({ type: 'date' })
  fecha_solicitada: Date;

  @Column({ type: 'varchar', length: 10, default: '00:00:00' })
  horas_solicitadas: string;

  @Column({ type: 'time', nullable: true })
  hora_inicio: string;

  @Column({ type: 'time', nullable: true })
  hora_fin: string;

  @Column({ type: 'varchar', length: 1, default: 'P' })
  estado: string; // P = Pendiente, A = Aprobada, R = Rechazada

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string;

  @CreateDateColumn()
  fecha_creacion: Date;
}
