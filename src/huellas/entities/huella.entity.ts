import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Empleado } from "src/empleado/entities/empleado.entity";
import { Dispositivo } from "src/dispositivo/entities/dispositivo.entity";

@Entity({ schema: 'db_fmc', name: 'huellas' })
export class Huella {
  @PrimaryGeneratedColumn()
  huella_id: number;

  @Column()
  huella_base64: string;

  @Column()
  num_ficha: string;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'num_ficha', referencedColumnName: 'num_ficha' })
  empleado: Empleado;

  @Column()
  dispositivo_id: number;

  @ManyToOne(() => Dispositivo)
  @JoinColumn({ name: 'dispositivo_id' })
  dispositivo: Dispositivo;
}