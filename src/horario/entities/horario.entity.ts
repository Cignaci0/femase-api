import { ApiProperty } from "@nestjs/swagger";
import { AsignacionTurnoRotativo } from "src/asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity";
import { DetalleTurno } from "src/detalle-turno/entities/detalle-turno.entity";
import { Empresa } from "src/empresas/empresas.entity";
import { Teletrabajo } from "src/teletrabajo/entities/teletrabajo.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'horario', schema: 'db_fmc' })
export class Horario {
  @PrimaryGeneratedColumn()
  horario_id: number;

  @Column({
    type: "time",
    name: "hora_entrada",
    nullable: true
  })
  @ApiProperty({ description: "hora_entrada", example: "09:00:00" })
  hora_entrada: string; // Formato esperado: "14:30:00"

  @Column({
    type: "time",
    name: "hora_salida",
    nullable: true
  })
  @ApiProperty({ description: "hora_salida", example: "13:00:00" })
  hora_salida: string;

  @OneToOne(() => Empresa)
  @ApiProperty({ type: () => Empresa, description: "empresa", example: 1 })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({
    type: "time",
    name: "holgura_mins",
    nullable: true
  })

  @ApiProperty({ description: "holgura_mins", example: "00:40:00" })
  holgura_mins: string;

  @Column({
    type: "time",
    name: "colacion",
    nullable: true
  })
  @ApiProperty({ description: "colacion", example: "00:60:00" })
  colacion: string;

  @OneToMany(() => DetalleTurno, (detalleTurno) => detalleTurno.horario)
  @JoinColumn({ name: 'id_horario' })
  detalle_turno: DetalleTurno[];

  @OneToMany(() => AsignacionTurnoRotativo, (asignacion_turno_rotativo) => asignacion_turno_rotativo.horario)
  asignacion_turno_rotativo: AsignacionTurnoRotativo[];

  @Column()
  nocturno: boolean

  @OneToMany(() => Teletrabajo, (teletrabajo) => teletrabajo.horario_id)
  teletrabajo: Teletrabajo[];

  @Column()
  hora_inicio_colacion: string;

  @Column()
  hora_fin_colacion: string;

  @Column()
  marca_colacion: boolean;
}
