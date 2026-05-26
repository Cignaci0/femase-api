import { Empleado } from "src/empleado/entities/empleado.entity"
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: "dias_compensacion_aprobadas", schema: "db_fmc" })
export class DiasCompensacionAprobada {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    horas_extras: string

    @ManyToOne(() => Empleado, (empleado) => empleado.dias_compensacion)
    @JoinColumn({ name: "id_empleado" })
    empleado: Empleado

    @Column()
    fecha: Date

    @Column()
    estado:string

    @Column({ type: 'date', nullable: true })
    fecha_inicio_descanso: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_fin_descanso: string | null;
}
