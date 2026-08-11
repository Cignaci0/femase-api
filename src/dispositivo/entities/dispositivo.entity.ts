import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { Cenco } from "src/cencos/cenco.entity";
import { Empresa } from "src/empresas/empresas.entity";
import { Estado } from "src/estado/estado.entity";
import { Marca } from "src/marcas/entities/marca.entity";
import { TipoDispositivo } from "src/tipo-dispositivo/entities/tipo-dispositivo.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'dispositivo', schema: 'db_fmc' })
export class Dispositivo {
  @PrimaryGeneratedColumn()
  dispositivo_id: number;

  @CreateDateColumn({
    type: 'timestamp', // O 'date' según prefieras
    default: () => 'CURRENT_TIMESTAMP'
  })
  fecha_creacion: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    nullable: true
  })
  fecha_actualizacion: Date;

  @Column()
  @ApiProperty({ description: 'ubicacion', example: 'La Rioja 2956 - Entrada B' })
  ubicacion: string;

  @Column()
  @ApiProperty({ description: 'comuna', example: 'Quinta Normal' })
  comuna: string;

  @Column()
  @ApiProperty({ description: 'modelo', example: 'FEMASE-CONTROL' })
  modelo: string;

  @Column()
  @ApiProperty({ description: 'fabricante', example: 'FEMASE' })
  fabricante: string;

  @Column()
  @ApiProperty({ description: 'version_firmware', example: '2.0.0.0' })
  version_firmware: string;

  @Column()
  @ApiProperty({ description: 'direccion_ip', example: '10.14.0.12' })
  direccion_ip: string;

  @Column()
  @ApiProperty({ description: 'gateway', example: '0.0.0.0' })
  gateway: string;

  @Column()
  @ApiProperty({ description: 'dns', example: 'femase.cl' })
  dns: string;

  @Column()
  estado_id: number;

  @OneToOne(() => Estado)
  @JoinColumn({ name: 'estado_id' })
  @ApiProperty({ description: "estado", example: 1 })
  estado: Estado;

  @Column()
  tipo_dispositivo_id: number;

  @OneToOne(() => TipoDispositivo)
  @JoinColumn({ name: 'tipo_dispositivo_id' })
  @ApiProperty({ description: "tipo_dispositivo", example: 1 })
  tipo_dispositivo: TipoDispositivo;

  @Column()
  @ApiProperty({ description: 'nombre', example: 'ADMINISTRACION_CENTRAL' })
  nombre: string;

  @ManyToOne(() => Cenco, (cenco) => cenco.dispositivos)
  @JoinColumn({ name: 'cenco_id' })
  @ApiProperty({ description: 'cenco_id', example: 22 })
  cenco: Cenco;

  @Column({ nullable: true })
  @ApiProperty({ description: 'ID de la empresa', example: 1 })
  empresa_id: number;

  @ManyToOne(() => Empresa, (empresa) => empresa.dispositivos, { nullable: true })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @OneToMany(() => Marca, (marca) => marca.dispositivo)
  marcas: Marca[];
}
