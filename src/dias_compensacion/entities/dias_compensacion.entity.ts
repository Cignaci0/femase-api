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

    @Column({ default: "00:00:00" })
    horas_descontadas: string

    @Column({ type: 'varchar', nullable: true })
    estado: string | null;

    @Column({ type: 'varchar', nullable: true, default: '00:00:00' })
    horas_solicitadas: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_inicio_descanso: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_fin_descanso: string | null;
}
