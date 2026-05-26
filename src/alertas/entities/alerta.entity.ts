import { Empleado } from "src/empleado/entities/empleado.entity";
import { User } from "src/users/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'alertas', schema: 'db_fmc' })
export class Alerta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tipo: number;

    @ManyToOne(() => Empleado, (empleado) => empleado.alertas, { nullable: true })
    @JoinColumn({ name: 'id_empleado' })
    empleado: Empleado | null;

    @ManyToOne(() => User, (usuario) => usuario.alertas, { nullable: true })
    @JoinColumn({ name: 'id_usuario' })
    usuario: User | null;

    @Column()
    fecha: Date;
}
