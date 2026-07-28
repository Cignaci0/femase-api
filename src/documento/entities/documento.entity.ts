import { ApiProperty } from "@nestjs/swagger";
import { Empresa } from "src/empresas/empresas.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'documentos', schema: 'db_fmc' })
export class Documento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column()
    tipo: string;

    @Column({ type: 'text' })
    texto: string;

    @ManyToOne(() => Empresa, (empresa) => empresa.documentos)
    @JoinColumn({ name: 'empresa' })
    empresa: Empresa;
}
