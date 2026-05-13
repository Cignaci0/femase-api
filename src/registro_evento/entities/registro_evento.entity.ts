import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'registros_eventos', schema:'db_fmc' })
export class RegistroEvento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    usuario: string;

    @Column()
    evento: string;

    @Column()
    ip: string;

    @Column()
    tipo_evento: string;

    @Column()
    hora: string;

    @Column()
    sistema_operativo: string;

    @Column()
    browser: string;

    @Column()
    empresa: string;

    @Column({nullable:true})
    depto: string;

    @Column({nullable:true})
    cenco: string;

    @Column()
    rut: string;

    @Column()
    fecha: Date;
}
