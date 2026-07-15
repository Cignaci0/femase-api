import { Empleado } from "src/empleado/entities/empleado.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ schema: "db_fmc", name: "horas_compensacion" })
export class HorasCompensacion {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Empleado)
    @JoinColumn({ name: 'empleado_id' })
    empleado: Empleado;

    @Column({ type: 'varchar', length: 7 })
    periodo: string;

    @Column({ type: 'varchar', default: '00:00:00' })
    horas_extras: string;

    @Column({ type: 'varchar', default: '00:00:00' })
    horas_pagas: string;

    @Column({ type: 'varchar', default: '00:00:00' })
    horas_compensacion: string;
    
    @Column({ type: 'varchar', default: '00:00:00' })
    horas_compensacion_consumidas: string;
}
