import { Empleado } from "src/empleado/entities/empleado.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ schema: "db_fmc", name: "turno_flexible" })
export class TurnoFlexible {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fecha: Date;

  @Column()
  hora_marca: string;

  @Column()
  evento: number;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: "num_ficha", referencedColumnName: "num_ficha" })
  num_ficha: Empleado;
}
