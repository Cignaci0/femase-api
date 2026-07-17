import { ApiProperty } from '@nestjs/swagger';
import { Cargo } from 'src/cargos/entities/cargo.entity';
import { Departamento } from 'src/departamentos/departamento.entity';
import { Documento } from 'src/documento/entities/documento.entity';
import { Empleado } from 'src/empleado/entities/empleado.entity';
import { Estado } from 'src/estado/estado.entity';
import { Firma } from 'src/firmas/entities/firma.entity';
import { HorasLegale } from 'src/horas_legales/entities/horas_legale.entity';
import { ProveedorCorreo } from 'src/proveedor-correo/entities/proveedor-correo.entity';
import { Solicitude } from 'src/solicitudes/entities/solicitude.entity';
import { Turno } from 'src/turno/entities/turno.entity';
import { User } from 'src/users/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';


@Entity({ name: 'empresa', schema: 'db_fmc' })
export class Empresa {
  @PrimaryGeneratedColumn()
  empresa_id: number;

  @Column()
  @ApiProperty({ description: "nombre_perfil", example: "FEMASE" })
  nombre_empresa: string;

  @Column()
  @ApiProperty({ description: "nombre_perfil", example: "77982123-4" })
  rut_empresa: string;

  @Column()
  @ApiProperty({ description: "direccion_empresa", example: "Calle de prueba 2311" })
  direccion_empresa: string;

  @Column()
  @ApiProperty({ description: "comuna_empresa", example: "Quinta Normal" })
  comuna_empresa: string;

  @Column()
  @ApiProperty({ description: "email_empresa", example: "soporte@femase.cl" })
  email_empresa: string;

  @OneToOne(() => Estado)
  @JoinColumn({ name: 'estado_id' })
  @ApiProperty({ description: "estado", example: 1 })
  estado: Estado;

  @OneToMany(() => Departamento, (departamento) => departamento.empresa)
  departamentos: Departamento[];

  @OneToMany(() => Turno, (turno) => turno.empresa)
  turnos: Turno[];

  @OneToMany(() => Cargo, (cargo) => cargo.empresa)
  cargos: Cargo[];

  @OneToMany(() => Empleado, (empleado) => empleado.empresa)
  empleados: Empleado[];

  @OneToOne(() => ProveedorCorreo, (proveedor_correo) => proveedor_correo.empresa)
  proveedor_correo: ProveedorCorreo;

  @Column()
  @ApiProperty({ description: "nombre_contacto", example: "Bastián Maximiliano" })
  nombre_contacto: string;

  @Column()
  @ApiProperty({ description: "telefono_contacto", example: 22223333 })
  telefono_contacto: string

  @Column()
  @ApiProperty({ description: "email notificacion", example: "[EMAIL_ADDRESS]" })
  email_noti: string

  @OneToOne(() => HorasLegale)
  @ApiProperty({ description: "horas legales", example: 44 })
  horas_legales: HorasLegale;


  @Column()
  @ApiProperty({ description: "horas máximas laborales", example: 45 })
  horario: number

  @Column({ nullable: true })
  @ApiProperty({ description: "url logo empresa", example: "https://ejemplo.com/logo.png" })
  urlLogo: string

  @OneToMany(() => Documento, (documento) => documento.empresa)
  documentos: Documento[];

  @OneToMany(() => Firma, (firma) => firma.empresa)
  firmas: Firma[];

  @Column()
  cierre_mes:number;

}