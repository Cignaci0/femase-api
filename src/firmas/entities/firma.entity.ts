import { Empleado } from "src/empleado/entities/empleado.entity";
import { Empresa } from "src/empresas/empresas.entity";
import { User } from "src/users/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity({ name: 'firmas', schema: 'db_fmc' })
export class Firma {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column()
    tipo: string;

    @Column({ type: 'text' })
    texto: string;

    @ManyToOne(() => Empresa, (empresa) => empresa.firmas)
    @JoinColumn({ name: 'empresa' })
    empresa: Empresa;

    @Column()
    estado: string

    @ManyToOne(() => Empleado, (empleado) => empleado.firmas)
    @JoinColumn({ name: 'id_empleado' })
    empleado: Empleado;

    @ManyToOne(() => User, (usuario) => usuario.firmas)
    @JoinColumn({ name: 'id_usuario_envia' })
    usuario: User;

    @Column({ type: 'text', nullable: true })
    motivo: string;

    @Column()
    leido:boolean

    @ManyToOne(() => User, (usuario) => usuario.firmas)
    @JoinColumn({ name: 'enviado_por' })
    enviado_por: User;

    @CreateDateColumn()
    fecha_envio: Date;
}
