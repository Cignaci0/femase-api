import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Empresa } from "../../empresas/empresas.entity";
import { User } from "src/users/user.entity";

@Entity({ name: 'registro_conexiones', schema: 'db_fmc' })
export class RegistroConexione {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    fecha: Date;

    @Column()
    hora:string;

    @Column()
    correo:string;

    @Column()
    rut:string;

    @Column()
    ip:string

    @ManyToOne(() => Empresa)
    @JoinColumn({ name: 'empresa' })
    empresa: Empresa;

    @ManyToOne(() => User)
    @JoinColumn({name:'idusuario'})
    idusuario: User
    
    @Column()
    username:string
}
