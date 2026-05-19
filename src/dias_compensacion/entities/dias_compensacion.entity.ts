import { Empleado } from "src/empleado/entities/empleado.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "dias_compensacion", schema: "db_fmc" })
export class DiasCompensacion {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    horas_extras: string

    @ManyToOne(() => Empleado, (empleado) => empleado.dias_compensacion)
    @JoinColumn({ name: "id_empleado" })
    empleado: Empleado

    @Column()
    fecha: Date
}
