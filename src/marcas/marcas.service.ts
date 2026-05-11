import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UpdateMarcaDto } from './dto/update-marca.dto';
import { Between, In, Repository } from 'typeorm';
import { Marca } from './entities/marca.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Empleado } from '../empleado/entities/empleado.entity';
import { MarcasAuditoria } from '../marcas-auditoria/entities/marcas-auditoria.entity';
import { Feriado } from '../feriados/entities/feriado.entity';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { AutorizaHorasExtra } from 'src/autoriza_horas_extras/entities/autoriza_horas_extra.entity';
import { AsignacionTurnoRotativo } from '../asignacion_turno_rotativo/entities/asignacion_turno_rotativo.entity';
import { Alerta } from 'src/alertas/entities/alerta.entity';
import { Teletrabajo } from '../teletrabajo/entities/teletrabajo.entity';

@Injectable()
export class MarcasService {
  constructor(
    @InjectRepository(Marca)
    private marcaRepository: Repository<Marca>,
    @InjectRepository(MarcasAuditoria)
    private marcasAuditoriaRepository: Repository<MarcasAuditoria>,
    @InjectRepository(Feriado)
    private readonly feriadosRepository: Repository<Feriado>,
    private readonly mailerService: MailerService,
    @InjectRepository(AutorizaHorasExtra)
    private readonly autorizaHorasExtrasRepository: Repository<AutorizaHorasExtra>,
    private readonly configService: ConfigService,
  ) { }

  private readonly logger = new Logger(MarcasService.name);

  private formatRUN(run: string): string {
    if (!run) return '';
    let cleanRUN = run.replace(/[.-]/g, '');
    let dv = cleanRUN.slice(-1).toUpperCase();
    let body = cleanRUN.slice(0, -1);
    let formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedBody}-${dv}`;
  }

  async create(createMarcaDto: CreateMarcaDto) {
    if (!createMarcaDto) {
      throw new HttpException('No se proporcionaron los datos para crear la marca', 404);
    }
    const nuevaMarca = this.marcaRepository.create(createMarcaDto);

    nuevaMarca.hashcode = crypto.createHash('md5').update(JSON.stringify(nuevaMarca.evento + ';' + nuevaMarca.fecha_marca + ';' + nuevaMarca.hora_marca + ';' + nuevaMarca.num_ficha + ';' + nuevaMarca.id_tipo_marca + ';' + nuevaMarca.info_adicional + ';' + nuevaMarca.comentario)).digest('hex');
    const guardar = await this.marcaRepository.save(nuevaMarca);

    if (!guardar) {
      throw new HttpException('No se pudo crear la marca', 404);
    }

    try {
      const empleadoInfo = await this.marcaRepository.manager.findOne(Empleado, {
        where: { num_ficha: nuevaMarca.num_ficha }, relations: ['cenco', 'empresa']
      });

      if (empleadoInfo && empleadoInfo.email) {
        const correoEmpleado = empleadoInfo.email_laboral;
        const nombreEmpleado = empleadoInfo.nombres + ' ' + empleadoInfo.apellido_paterno + ' ' + empleadoInfo.apellido_materno;
        let eventoNombre = 'Marca';
        if (nuevaMarca.evento === 1) eventoNombre = 'Entrada';
        if (nuevaMarca.evento === 2) eventoNombre = 'Salida';

        let fMarca = nuevaMarca.fecha_marca;
        let fechaFormatString = '';
        if (fMarca instanceof Date) {
          const day = String(fMarca.getDate()).padStart(2, '0');
          const month = String(fMarca.getMonth() + 1).padStart(2, '0');
          const year = fMarca.getFullYear();
          fechaFormatString = `${day}/${month}/${year}`;
        } else if (typeof fMarca === 'string') {
          const parts = (fMarca as string).substring(0, 10).split('-');
          if (parts.length === 3) {
            fechaFormatString = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            fechaFormatString = fMarca;
          }
        }

        let fechaParaQuery = '';
        if (fMarca instanceof Date) {
          fechaParaQuery = fMarca.toISOString().substring(0, 10);
        } else if (typeof fMarca === 'string') {
          fechaParaQuery = (fMarca as string).substring(0, 10);
        }

        const tieneTeletrabajo = await this.marcaRepository.manager.findOne(Teletrabajo, {
          where: {
            id_empleado: { empleado_id: empleadoInfo.empleado_id },
            fecha_actual: fechaParaQuery as any
          }
        });

        const direccionMarca = tieneTeletrabajo ? empleadoInfo.direccion : empleadoInfo.cenco.direccion;

        const nombre_empresa = empleadoInfo?.empresa.nombre_empresa;
        const rut_empresa = empleadoInfo?.empresa.rut_empresa;
        const direccion = empleadoInfo?.empresa.direccion_empresa;
        const comuna = empleadoInfo?.empresa.comuna_empresa;

        await this.mailerService.sendMail({
          to: correoEmpleado,
          cc: empleadoInfo.email_noti,
          subject: 'Nueva Marca Registrada',
          html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hola, ${nombreEmpleado}</h2>
            <p>Se ha creado una nueva marca en el sistema con los siguientes detalles:</p>
            <ul>
              <li><strong>Fecha:</strong> ${fechaFormatString}</li>
              <li><strong>Hora:</strong> ${nuevaMarca.hora_marca}</li>
              <li><strong>Run:</strong> ${this.formatRUN(empleadoInfo.run)}</li>
              <li><strong>Num ficha:</strong> ${empleadoInfo.num_ficha}</li>
              <li><strong>Nombre:</strong> ${nombreEmpleado}</li>
              <li><strong>Evento:</strong> ${eventoNombre}</li>
              <li><strong>Hashcode:</strong> ${nuevaMarca.hashcode}</li>
              <li><strong>Dirección Marcación:</strong> ${direccionMarca}</li>
              
            </ul>
            <p>Sistema excepcional de jordana: No Aplica</p>
            <p>Resolución Exenta: No Aplica</p>
            <p>Geolocalización: No Aplica</p>
            <p>Empleador:</p>
            <ul>
              <li><strong>Nombre Empresa:</strong> ${nombre_empresa}</li>
              <li><strong>Rut Empresa:</strong> ${this.formatRUN(rut_empresa)}</li>
              <li><strong>Dirección Empresa:</strong> ${direccion}</li>
              <li><strong>Comuna Empresa:</strong> ${comuna}</li>
            </ul>
            <p>Empresa Transitoria o Subcontratado: NO APLICA</p>
            <p>Nombre: NO APLICA</p>
            <p>Rut: NO APLICA</p>
            <p>Si no reconoces esta marca o tienes dudas, puedes contactar al administrador.</p>
          </div>`,
        });
      }
    } catch (error) {
      console.error('Error al enviar correo de nueva marca:', error);
    }

    return { message: 'Marca creada exitosamente', data: guardar };
  }

  async findAll(numFicha: string, fechaInicio: string, fechaFin: string) {
    const busqueda = await this.marcaRepository.find({
      where: {
        num_ficha: numFicha,
        fecha_marca: Between(fechaInicio as any, fechaFin as any),
      },
      order: {
        fecha_marca: 'ASC',
      },
      relations: [
        'empleado',
        'dispositivo',
        'empleado.turno',
        'empleado.turno.detalle_turno',
        'empleado.turno.detalle_turno.horario',
        'empleado.turno.detalle_turno.dia',
        'tipo_marca'
      ],
      select: {
        id_marca: true,
        fecha_marca: true,
        hora_marca: true,
        evento: true,
        hashcode: true,
        info_adicional: true,
        comentario: true,
        tipo_marca: {
          tipo_marca_id: true,
          nombre: true,
        },
        empleado: {
          num_ficha: true,
          turno: {
            turno_id: true,
            detalle_turno: {
              id_detalle_turno: true,
              horario: {
                hora_entrada: true,
                hora_salida: true,
                colacion: true,
              },
            },
          }
        },
        dispositivo: {
          nombre: true,
        }
      }
    });

    const feriados = await this.feriadosRepository.find();

    const result: any[] = [];

    let empleadoInfo: Empleado | null = null;

    if (busqueda.length > 0 && busqueda[0].empleado) {
      empleadoInfo = busqueda[0].empleado;

    } else {
      empleadoInfo = await this.marcaRepository.manager.findOne(Empleado, {
        where: { num_ficha: numFicha },
        relations: ['turno', 'turno.detalle_turno', 'turno.detalle_turno.horario', 'turno.detalle_turno.dia']
      });
    }

    if (!empleadoInfo) {
      throw new HttpException('No se pudo encontrar el empleado', 404);
    }

    let asignacionesRotativas: AsignacionTurnoRotativo[] = [];
    if (empleadoInfo.permite_rotativo) {
      asignacionesRotativas = await this.marcaRepository.manager.find(AsignacionTurnoRotativo, {
        where: {
          empleado: { num_ficha: numFicha }
        },
        relations: ['horario']
      });
    }

    const diasTurnoQuery = await this.marcaRepository.manager.query(
      `SELECT e.turno_id, dt.id_dia 
       FROM db_fmc.empleado e 
       LEFT JOIN db_fmc.detalle_turno dt ON dt.id_turno = e.turno_id 
       WHERE e.num_ficha = $1`,
      [numFicha]
    );

    let diasConTurno = [1, 2, 3, 4, 5, 6, 7];
    if (diasTurnoQuery && diasTurnoQuery.length > 0) {
      if (diasTurnoQuery[0].turno_id !== null) {
        diasConTurno = diasTurnoQuery.filter((row: any) => row.id_dia !== null).map((row: any) => row.id_dia);
      }
    }

    const startParts = fechaInicio.split('-');
    const currentDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));

    const endParts = fechaFin.split('-');
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      let diaSemana = currentDate.getDay();
      if (diaSemana === 0) diaSemana = 7;

      const isFeriado = feriados.some(fer => {
        let fStr = '';
        if (fer.fecha instanceof Date) fStr = fer.fecha.toISOString().substring(0, 10);
        else if (typeof fer.fecha === 'string') fStr = fer.fecha.substring(0, 10);
        return fStr === dateKey;
      });

      const diasNombres = ['', 'Lu.', 'Ma.', 'Mi.', 'Ju.', 'Vi.', 'Sá.', 'Do.'];
      const fechaFormatExt = `${diasNombres[diaSemana]} ${day}-${month}-${year}`;

      let horarioTurnoRotativo: any = null;
      if (empleadoInfo?.permite_rotativo) {
        const asignacion = asignacionesRotativas.find(a => {
          let start = '';
          if (a.fecha_inicio_turno instanceof Date) start = a.fecha_inicio_turno.toISOString().substring(0, 10);
          else start = String(a.fecha_inicio_turno).substring(0, 10);

          let end = '';
          if (a.fecha_fin_turno instanceof Date) end = a.fecha_fin_turno.toISOString().substring(0, 10);
          else end = String(a.fecha_fin_turno).substring(0, 10);

          return dateKey >= start && dateKey <= end;
        });
        if (asignacion) {
          horarioTurnoRotativo = asignacion.horario;
        }
      }

      let tieneTurnoHoy = diasConTurno.includes(diaSemana);
      if (empleadoInfo?.permite_rotativo) {
        tieneTurnoHoy = !!horarioTurnoRotativo;
      }

      const marcasDelDia = busqueda.filter((m) => {
        let mDateKey = '';
        if (typeof m.fecha_marca === 'string') {
          mDateKey = (m.fecha_marca as string).substring(0, 10);
        } else if (m.fecha_marca instanceof Date) {
          const year = m.fecha_marca.getUTCFullYear();
          const month = String(m.fecha_marca.getUTCMonth() + 1).padStart(2, '0');
          const day = String(m.fecha_marca.getUTCDate()).padStart(2, '0');
          mDateKey = `${year}-${month}-${day}`;
        } else if (m.fecha_marca) {
          const d = new Date(m.fecha_marca);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          mDateKey = `${year}-${month}-${day}`;
        }
        return mDateKey === dateKey;
      });

      if (marcasDelDia.length > 0) {
        const formateadas = marcasDelDia.map(m => {
          let dtDia = m.empleado?.turno?.detalle_turno?.find((dt: any) => dt.dia?.cod_dia === diaSemana);
          let overrideHorario = dtDia && (dtDia as any).horario ? (dtDia as any).horario : null;
          if (empleadoInfo?.permite_rotativo && horarioTurnoRotativo) {
            overrideHorario = horarioTurnoRotativo;
          }

          return {
            ...m,
            fecha_marca: fechaFormatExt as any,
            empleado: m.empleado ? {
              ...m.empleado,
              turno: m.empleado.turno ? {
                ...m.empleado.turno,
                detalle_turno: overrideHorario ? { horario: overrideHorario } : null
              } : (overrideHorario ? { detalle_turno: { horario: overrideHorario } } : null)
            } : null
          };
        });
        result.push(...formateadas);

        if (marcasDelDia.length === 1) {
          const marcaUnica = marcasDelDia[0];
          let infoFaltante = 'Falta Marca';
          if (marcaUnica.evento === 1) {
            infoFaltante = 'Falta Marca Salida';
          } else if (marcaUnica.evento === 2) {
            infoFaltante = 'Falta Marca Entrada';
          }

          let dtDia = empleadoInfo?.turno?.detalle_turno?.find((dt: any) => dt.dia?.cod_dia === diaSemana);
          let overrideHorario = dtDia && (dtDia as any).horario ? (dtDia as any).horario : null;
          if (empleadoInfo?.permite_rotativo && horarioTurnoRotativo) {
            overrideHorario = horarioTurnoRotativo;
          }

          result.push({
            id_marca: null,
            fecha_marca: fechaFormatExt as any,
            hora_marca: null,
            evento: null,
            hashcode: null,
            info_adicional: infoFaltante,
            dispositivo: null,
            tieneTurno: tieneTurnoHoy,
            empleado: {
              num_ficha: empleadoInfo?.num_ficha,
              turno: empleadoInfo?.turno ? {
                turno_id: empleadoInfo.turno.turno_id,
                detalle_turno: overrideHorario ? { horario: overrideHorario } : null
              } : (overrideHorario ? { detalle_turno: { horario: overrideHorario } } : null)
            },
          } as any);
        }
      } else {
        let dtDia = empleadoInfo?.turno?.detalle_turno?.find((dt: any) => dt.dia?.cod_dia === diaSemana);

        let infoTexto = tieneTurnoHoy ? 'Faltan ambas marcas ' : 'Día libre';
        if (isFeriado) infoTexto = 'Feriado';

        let overrideHorario = dtDia && (dtDia as any).horario ? (dtDia as any).horario : null;
        if (empleadoInfo?.permite_rotativo && horarioTurnoRotativo) {
          overrideHorario = horarioTurnoRotativo;
        }

        result.push({
          id_marca: null,
          fecha_marca: fechaFormatExt as any,
          hora_marca: null,
          evento: null,
          hashcode: null,
          info_adicional: infoTexto,
          dispositivo: null,
          tieneTurno: tieneTurnoHoy,
          empleado: {
            num_ficha: empleadoInfo?.num_ficha,
            turno: empleadoInfo?.turno ? {
              turno_id: empleadoInfo.turno.turno_id,
              detalle_turno: overrideHorario ? { horario: overrideHorario } : null
            } : (overrideHorario ? { detalle_turno: { horario: overrideHorario } } : null)
          },
        } as any);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  findOne(id: number) {
    return `This action returns a #${id} marca`;
  }

  async update(id: number, updateMarcaDto: UpdateMarcaDto, usuarioActualizador: string) {
    if (!updateMarcaDto || Object.keys(updateMarcaDto).length === 0) {
      throw new HttpException('No se proporcionaron los datos para actualizar la marca', 400);
    }

    const marcaOriginal = await this.marcaRepository.findOne({ where: { id_marca: id } });

    if (!marcaOriginal) {
      throw new HttpException('No se encontró la marca a actualizar', 404);
    }

    // Generamos un Token único (UUID) para los enlaces del correo
    const tokenSeguridad = crypto.randomBytes(32).toString('hex');

    // Procesamos la fecha propuesta para la auditoría
    let fechaPropuesta = updateMarcaDto.fecha_marca || marcaOriginal.fecha_marca;
    if (fechaPropuesta instanceof Date) {
      fechaPropuesta = fechaPropuesta.toISOString().substring(0, 10) as any;
    } else if (typeof fechaPropuesta === 'string') {
      fechaPropuesta = (fechaPropuesta as string).substring(0, 10) as any;
    }

    // Creamos el registro en MarcasAuditoria con estado 'Pendiente' (3)
    const marcaAuditoria = this.marcasAuditoriaRepository.create({
      id_marca: id,
      marca: { id_marca: id },
      num_ficha: marcaOriginal.num_ficha,
      fecha_marca: fechaPropuesta,
      hora_marca: updateMarcaDto.hora_marca || marcaOriginal.hora_marca,
      evento: updateMarcaDto.evento || marcaOriginal.evento,
      id_tipo_marca: updateMarcaDto.id_tipo_marca || marcaOriginal.id_tipo_marca,
      info_adicional: updateMarcaDto.info_adicional !== undefined ? updateMarcaDto.info_adicional : marcaOriginal.info_adicional,
      comentario: updateMarcaDto.comentario !== undefined ? updateMarcaDto.comentario : marcaOriginal.comentario,
      estado_id: 3, // Pendiente
      token: tokenSeguridad,
      datos_update: updateMarcaDto as any,
      fecha_actualizacion: new Date(),
      usuario_actualizador: usuarioActualizador
    });

    if (marcaAuditoria.fecha_actualizacion) {
      if (marcaAuditoria.fecha_actualizacion instanceof Date) {
        marcaAuditoria.fecha_actualizacion = marcaAuditoria.fecha_actualizacion.toISOString().substring(0, 19).replace('T', ' ') as any;
      }
    }

    // El hashcode se calcula sobre los datos PROPUESTOS
    marcaAuditoria.hashcode = crypto.createHash('md5').update(JSON.stringify(marcaAuditoria.evento + ';' + marcaAuditoria.fecha_marca + ';' + marcaAuditoria.hora_marca + ';' + marcaAuditoria.num_ficha + ';' + marcaAuditoria.id_tipo_marca + ';' + marcaAuditoria.info_adicional + ';' + marcaAuditoria.comentario)).digest('hex');

    const guardarAuditoria = await this.marcasAuditoriaRepository.save(marcaAuditoria);

    try {
      const empleadoInfo = await this.marcaRepository.manager.findOne(Empleado, {
        where: { num_ficha: marcaOriginal.num_ficha }, relations: ['cenco', 'empresa']
      });

      if (empleadoInfo && empleadoInfo.email_laboral) {
        const correoEmpleado = empleadoInfo.email_laboral
        const nombreEmpleadoCompleto = empleadoInfo.nombres + ' ' + empleadoInfo.apellido_paterno + ' ' + empleadoInfo.apellido_materno;

        let eventoNombre = 'Marca';
        if (marcaAuditoria.evento === 1) eventoNombre = 'Entrada';
        if (marcaAuditoria.evento === 2) eventoNombre = 'Salida';

        let fMarca = marcaAuditoria.fecha_marca;
        let fechaFormatString = '';
        if (fMarca instanceof Date) {
          const day = String(fMarca.getDate()).padStart(2, '0');
          const month = String(fMarca.getMonth() + 1).padStart(2, '0');
          const year = fMarca.getFullYear();
          fechaFormatString = `${day}/${month}/${year}`;
        } else if (typeof fMarca === 'string') {
          const parts = (fMarca as string).substring(0, 10).split('-');
          if (parts.length === 3) {
            fechaFormatString = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            fechaFormatString = fMarca;
          }
        }

        const nombre_empresa = empleadoInfo.empresa?.nombre_empresa || 'No especificada';
        const rut_empresa = empleadoInfo.empresa?.rut_empresa || 'No especificado';
        const direccion = empleadoInfo.empresa?.direccion_empresa || 'No especificada';
        const comuna = empleadoInfo.empresa?.comuna_empresa || 'No especificada';

        // Se obtiene la URL base desde las variables de entorno o usa una por defecto
        const urlBase = this.configService.get<string>('API_URL_BASE') || 'https://tu-api.com';
        const linkAprobar = `${urlBase}/marcas/confirmar?token=${tokenSeguridad}&accion=aprobar`;
        const linkRechazar = `${urlBase}/marcas/confirmar?token=${tokenSeguridad}&accion=rechazar`;

        await this.mailerService.sendMail({
          to: correoEmpleado,
          cc: empleadoInfo.email_noti,
          subject: 'Solicitud de Modificación de Marca',
          html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hola, ${nombreEmpleadoCompleto}</h2>
            <p>Se ha solicitado modificar una marca en el sistema con los siguientes detalles:</p>
            <ul>
              <li><strong>Fecha:</strong> ${fechaFormatString}</li>
              <li><strong>Hora:</strong> ${marcaAuditoria.hora_marca}</li>
              <li><strong>Run:</strong> ${this.formatRUN(empleadoInfo.run)}</li>
              <li><strong>Num ficha:</strong> ${empleadoInfo.num_ficha}</li>
              <li><strong>Nombre:</strong> ${nombreEmpleadoCompleto}</li>
              <li><strong>Evento:</strong> ${eventoNombre}</li>
              <li><strong>Hashcode:</strong> ${marcaAuditoria.hashcode}</li>
              <li><strong>Dirección Marcación:</strong> ${empleadoInfo.cenco?.direccion || 'No especificada'}</li>
            </ul>

            <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 5px solid #ffc107; border-radius: 4px;">
              <p style="margin-top: 0; font-size: 16px; font-weight: bold;">¿Autorizas este cambio?</p>
              <div style="margin-top: 15px;">
                <a href="${linkAprobar}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 15px; font-weight: bold; display: inline-block;">SÍ, APROBAR</a>
                <a href="${linkRechazar}" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">NO, RECHAZAR</a>
              </div>
              <p style="margin-bottom: 0; margin-top: 15px; font-size: 13px; color: #6c757d;">* Si no respondes en 48 horas, el cambio se aprobará automáticamente.</p>
            </div>

            <p>Sistema excepcional de jordana: No Aplica</p>
            <p>Resolución Exenta: No Aplica</p>
            <p>Geolocalización: No Aplica</p>
            <p>Empleador:</p>
            <ul>
              <li><strong>Nombre Empresa:</strong> ${nombre_empresa}</li>
              <li><strong>Rut Empresa:</strong> ${this.formatRUN(rut_empresa)}</li>
              <li><strong>Dirección Empresa:</strong> ${direccion}</li>
              <li><strong>Comuna Empresa:</strong> ${comuna}</li>
            </ul>
            <p>Empresa Transitoria o Subcontratado: NO APLICA</p>
            <p>Nombre: NO APLICA</p>
            <p>Rut: NO APLICA</p>
            <p>Si no reconoces esta marca o tienes dudas, puedes contactar al administrador.</p>
          </div>`,
        });
      }
    } catch (error) {
      console.error('Error al enviar correo de actualización de marca:', error);
    }

    return {
      message: 'Solicitud de modificación enviada exitosamente. El cambio está pendiente de aprobación.',
      data: guardarAuditoria
    };
  }

  async confirmarCambio(token: string, accion: string) {
    // 1. Buscamos la solicitud por el token asegurándonos que siga Pendiente (3)
    const auditoria = await this.marcasAuditoriaRepository.findOne({
      where: { token: token, estado_id: 3 }
    });

    if (!auditoria) {
      // Retornamos HTML porque esto se abre en el navegador web del usuario
      return `
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h2 style="color: #dc3545;">Enlace Inválido</h2>
          <p>Esta solicitud ya fue procesada, expiró o el enlace es incorrecto.</p>
        </div>
      `;
    }

    if (accion === 'aprobar') {
      // Buscamos la marca original en la tabla principal
      const marcaOriginal = await this.marcaRepository.findOne({ where: { id_marca: auditoria.id_marca } });

      if (marcaOriginal) {
        // Aplicamos todos los cambios que estaban en el JSON (datos_update)
        Object.assign(marcaOriginal, auditoria.datos_update);

        // Asignamos el hashcode que ya habíamos calculado en la auditoría
        marcaOriginal.hashcode = auditoria.hashcode;

        await this.marcaRepository.save(marcaOriginal);
      }

      auditoria.estado_id = 1; // Cambiamos a Activo (Aprobado)
    } else if (accion === 'rechazar') {
      auditoria.estado_id = 2; // Cambiamos a Inactivo (Rechazado)
    }

    // Guardamos el nuevo estado en la auditoría
    await this.marcasAuditoriaRepository.save(auditoria);

    const color = accion === 'aprobar' ? '#28a745' : '#dc3545';
    const mensaje = accion === 'aprobar' ? 'aprobado y aplicado' : 'rechazado';

    return `
      <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: ${color};">¡Proceso Exitoso!</h2>
        <p>El cambio de la marca ha sido <strong>${mensaje}</strong> correctamente.</p>
        <p>Ya puedes cerrar esta ventana.</p>
      </div>
    `;
  }

  async remove(id: number) {
    const marca = await this.marcaRepository.findOne({ where: { id_marca: id } });
    if (!marca) {
      throw new HttpException('No se encontró la marca a eliminar', 404);
    }
    const empleadoInfo = await this.marcaRepository.manager.findOne(Empleado, {
      where: { num_ficha: marca.num_ficha }, relations: ['cenco', 'empresa']
    });

    if (empleadoInfo && (empleadoInfo.email || empleadoInfo.email_laboral)) {
      const correoEmpleado = empleadoInfo.email_laboral || empleadoInfo.email;
      const nombreEmpleado = empleadoInfo.nombres + ' ' + empleadoInfo.apellido_paterno + ' ' + empleadoInfo.apellido_materno;
      const correoCenco = empleadoInfo.cenco?.email_notificacion || '';

      let eventoNombre = 'Marca';
      if (marca.evento === 1) eventoNombre = 'Entrada';
      if (marca.evento === 2) eventoNombre = 'Salida';

      let fMarca = marca.fecha_marca;
      let fechaFormatString = '';
      if (fMarca instanceof Date) {
        const day = String(fMarca.getDate()).padStart(2, '0');
        const month = String(fMarca.getMonth() + 1).padStart(2, '0');
        const year = fMarca.getFullYear();
        fechaFormatString = `${day}/${month}/${year}`;
      } else if (typeof fMarca === 'string') {
        const parts = (fMarca as string).substring(0, 10).split('-');
        if (parts.length === 3) {
          fechaFormatString = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          fechaFormatString = fMarca;
        }
      }

      const nombre_empresa = empleadoInfo.empresa?.nombre_empresa || 'No especificada';
      const rut_empresa = empleadoInfo.empresa?.rut_empresa || 'No especificado';
      const direccion = empleadoInfo.empresa?.direccion_empresa || 'No especificada';
      const comuna = empleadoInfo.empresa?.comuna_empresa || 'No especificada';

      try {
        await this.mailerService.sendMail({
          to: correoEmpleado,
          cc: empleadoInfo.email_noti,
          subject: 'Eliminacion de Marca Registrada',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Hola, ${nombreEmpleado}</h2>
              <p>Se ha eliminado una marca en el sistema con los siguientes detalles:</p>
              <ul>
                <li><strong>Fecha:</strong> ${fechaFormatString}</li>
                <li><strong>Hora:</strong> ${marca.hora_marca}</li>
                <li><strong>Run:</strong> ${this.formatRUN(empleadoInfo.run)}</li>
                <li><strong>Num ficha:</strong> ${empleadoInfo.num_ficha}</li>
                <li><strong>Nombre:</strong> ${nombreEmpleado}</li>
                <li><strong>Evento:</strong> ${eventoNombre}</li>
                <li><strong>Hashcode:</strong> ${marca.hashcode}</li>
                <li><strong>Dirección Marcación:</strong> ${empleadoInfo.cenco?.direccion || 'No especificada'}</li>
                <li><strong>Comentario:</strong> ${marca.comentario}</li>
              </ul>
              <p>Sistema excepcional de jordana: No Aplica</p>
              <p>Resolución Exenta: No Aplica</p>
              <p>Geolocalización: No Aplica</p>
              <p>Empleador:</p>
              <ul>
                <li><strong>Nombre Empresa:</strong> ${nombre_empresa}</li>
                <li><strong>Rut Empresa:</strong> ${this.formatRUN(rut_empresa)}</li>
                <li><strong>Dirección Empresa:</strong> ${direccion}</li>
                <li><strong>Comuna Empresa:</strong> ${comuna}</li>
              </ul>
              <p>Empresa Transitoria o Subcontratado: NO APLICA</p>
              <p>Nombre: NO APLICA</p>
              <p>Rut: NO APLICA</p>
              <p>Si no reconoces esta marca o tienes dudas, puedes contactar al administrador.</p>
            </div>`,
        });
      } catch (error) {
        console.error('Error al enviar correo de eliminación:', error.message);
      }
    }
    await this.marcasAuditoriaRepository.delete({ id_marca: id });
    return this.marcaRepository.delete(id);
  }

  async getMarcasByHash(hashcode: string) {
    const marca = await this.marcaRepository.findOne({
      where: { hashcode: hashcode.trim() },
      relations: [
        'empleado',
        'empleado.turno',
        'empleado.turno.detalle_turno',
        'empleado.turno.detalle_turno.horario',
        'empleado.turno.detalle_turno.dia',
        'tipo_marca',
        'dispositivo'
      ],
      select: {
        id_marca: true,
        fecha_marca: true,
        hora_marca: true,
        evento: true,
        hashcode: true,
        info_adicional: true,
        comentario: true,
        tipo_marca: {
          tipo_marca_id: true,
          nombre: true,
        },
        empleado: {
          num_ficha: true,
          nombres: true,
          apellido_paterno: true,
          turno: {
            turno_id: true,
            nombre: true,
            detalle_turno: {
              id_detalle_turno: true,
              dia: {
                cod_dia: true,
              },
              horario: {
                hora_entrada: true,
                hora_salida: true,
              },
            },
          }
        },
        dispositivo: {
          nombre: true,
        }
      }
    });

    if (!marca) return null;

    // Formatear fecha y filtrar turno (siguiendo la lógica de findAll)
    const fecha = new Date(marca.fecha_marca);
    const day = String(fecha.getDate()).padStart(2, '0');
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const year = fecha.getFullYear();

    let diaSemana = fecha.getDay();
    if (diaSemana === 0) diaSemana = 7;

    const diasNombres = ['', 'Lu.', 'Ma.', 'Mi.', 'Ju.', 'Vi.', 'Sá.', 'Do.'];
    const fechaFormatExt = `${diasNombres[diaSemana]} ${day}-${month}-${year}`;

    let horarioFinal: any = null;
    if (marca.empleado?.turno?.detalle_turno) {
      const dtDia = marca.empleado.turno.detalle_turno.find((dt: any) => dt.dia?.cod_dia === diaSemana);
      if (dtDia && dtDia.horario) {
        horarioFinal = dtDia.horario;
      }
    }

    return {
      ...marca,
      fecha_marca: fechaFormatExt as any,
      empleado: marca.empleado ? {
        ...marca.empleado,
        turno: marca.empleado.turno ? {
          ...marca.empleado.turno,
          detalle_turno: horarioFinal ? { horario: horarioFinal } : null
        } : (horarioFinal ? { detalle_turno: { horario: horarioFinal } } : null)
      } : null
    };
  }

  /**
   * Procesa aprobaciones automáticas para solicitudes pendientes por más de 44 horas.
   * Este método se ejecuta automáticamente cada hora.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async procesarAprobacionesAutomaticas() {
    // Calculamos el límite de 48 horas atrás
    const hace48Horas = new Date();
    hace48Horas.setHours(hace48Horas.getHours() - 48);

    // Buscamos solicitudes pendientes creadas hace más de 24 horas
    const pendientes = await this.marcasAuditoriaRepository.find({
      where: {
        estado_id: 3, // Pendiente
        fecha_actualizacion: Between(new Date(0) as any, hace48Horas as any) // Aproximación para "menor que"
      }
    });

    if (pendientes.length === 0) {
      this.logger.log('No se encontraron marcas pendientes de aprobación automática.');
      return;
    }

    for (const auditoria of pendientes) {
      try {
        this.logger.log(`Aprobando automáticamente solicitud #${auditoria.correlativo} (Token: ${auditoria.token})`);
        await this.confirmarCambio(auditoria.token, 'aprobar');
      } catch (error) {
        this.logger.error(`Error al aprobar automáticamente la solicitud #${auditoria.correlativo}:`, error);
      }
    }

    this.logger.log(`Se procesaron ${pendientes.length} aprobaciones automáticas.`);
  }

  private async enviarCorreoAlerta(empleado: Empleado, tipo: number) {
    const correoEmpleado = empleado.email_laboral
    const correoEmpleador = empleado.email_noti
    const nombreCompleto = `${empleado.nombres} ${empleado.apellido_paterno} ${empleado.apellido_materno}`;

    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const diaActual = ahora.getDay() || 7;
    const horaActual = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const fechaDeHoy = `${day}/${month}/${year}`;

    let horarioHoy: any = null;

    if (empleado.permite_rotativo) {
      const asignaciones = await this.marcaRepository.manager.find(AsignacionTurnoRotativo, {
        where: { empleado: { empleado_id: empleado.empleado_id } },
        relations: ['horario']
      });
      const asigHoy = asignaciones.find(a => {
        let start = '';
        if (a.fecha_inicio_turno instanceof Date) start = a.fecha_inicio_turno.toISOString().substring(0, 10);
        else start = String(a.fecha_inicio_turno).substring(0, 10);

        let end = '';
        if (a.fecha_fin_turno instanceof Date) end = a.fecha_fin_turno.toISOString().substring(0, 10);
        else end = String(a.fecha_fin_turno).substring(0, 10);

        return dateKey >= start && dateKey <= end;
      });
      if (asigHoy) {
        horarioHoy = asigHoy.horario;
      }
    } else {
      if (empleado.turno && empleado.turno.detalle_turno) {
        const dtDia = empleado.turno.detalle_turno.find((dt: any) => dt.dia?.cod_dia === diaActual);
        if (dtDia && dtDia.horario) {
          horarioHoy = dtDia.horario;
        }
      }
    }

    const horarioEntrada = horarioHoy ? horarioHoy.hora_entrada : 'No asignado';
    const horarioSalida = horarioHoy ? horarioHoy.hora_salida : 'No asignado';
    const alerta30Entrada = empleado.noti_30_entrada
    const alerta30Salida = empleado.noti_30_salida

    let subject = '';
    let htmlMsg = '';

    if (tipo === 2 && alerta30Entrada === true) {
      subject = 'Alerta de no marcación 30 minutos de entrada';
      htmlMsg = `
      <p>--- Datos del empleador ---</p>
      <p>Empresa: ${empleado.empresa?.nombre_empresa || 'N/A'}.</p>
      <p>Rut: ${empleado.empresa?.rut_empresa}</p>
      <p>Sucursal: ${empleado.cenco?.nombre_cenco || 'N/A'}</p>
      <P>Direccion: ${empleado.cenco?.direccion}</P>
      <p>--- Datos del trabajador ---</p>
      <p>Run: ${empleado.run}<p>
      <p>Nombre: ${nombreCompleto}<p>
      <p>Fecha Entrada: ${fechaDeHoy}</p>
      <p>Horario Entrada: ${horarioEntrada}</p>
      <p>Siendo el ${fechaDeHoy} a las ${horaActual} horas, usted no registra Marcación de Entrada.</p>
      `;

    } else if (tipo === 3) {
      subject = 'Notificación derecho a desconexión';
      htmlMsg = `<p>Hola ${nombreCompleto}, Te recordamos que siendo ${fechaDeHoy} a las ${horaActual} horas, le informamos que restan 30 min para el inicio del derecho a desconexión.</p>`;

    } else if (tipo === 4 && alerta30Salida === true) {
      subject = 'Alerta de no marcación 30 minutos de salida';
      htmlMsg = `
      <p>--- Datos del empleador ---</p>
      <p>Empresa: ${empleado.empresa?.nombre_empresa || 'N/A'}.</p>
      <p>Rut: ${empleado.empresa?.rut_empresa}</p>
      <p>Sucursal: ${empleado.cenco?.nombre_cenco || 'N/A'}</p>
      <P>Direccion: ${empleado.cenco?.direccion}</P>
      <p>--- Datos del trabajador ---</p>
      <p>Run: ${empleado.run}</p>
      <p>Nombre: ${nombreCompleto}</p>
      <p>Fecha Salida: ${fechaDeHoy}</p>
      <p>Horario Salida: ${horarioSalida}</p>
      <p>Siendo el ${fechaDeHoy} a las ${horaActual} horas, usted no registra Marcación de Salida.</p>
      `;
    } 

    if (htmlMsg) {
      try {
        await this.mailerService.sendMail({
          to: correoEmpleado,
          cc: correoEmpleador,
          subject: subject,
          html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            ${htmlMsg}
          </div>`,
        });
      } catch (error) {
        this.logger.error(`Error al enviar correo de alerta a ${correoEmpleado}:`, error);
      }
    }
  }

  /**
   * Monitor que verifica horarios de entrada de los empleados
   * para mandar un aviso preventivo 30 min antes y 30 min después si no marcaron.
   */
  @Cron('0 */2 * * * *')
  async verificarNotificacionesMarcas() {
    this.logger.log('Ejecutando verificación de notificaciones de marcas (cada 2 min)...');
    try {
      const ahora = new Date();
      const year = ahora.getFullYear();
      const month = String(ahora.getMonth() + 1).padStart(2, '0');
      const day = String(ahora.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // Formato local asumiendo el CRON corre hora de chile o local.

      let diaSemana = ahora.getDay();
      if (diaSemana === 0) diaSemana = 7;

      const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
      const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

      const empleados = await this.marcaRepository.manager.find(Empleado, {
        where: { estado: { estado_id: 1 } },
        relations: ['turno', 'turno.detalle_turno', 'turno.detalle_turno.horario', 'turno.detalle_turno.dia', 'empresa', 'cenco']
      });

      if (empleados.length === 0) return;

      const empleadoIds = empleados.map(e => e.empleado_id);
      const numFichas = empleados.map(e => e.num_ficha);

      // --- PRE-CARGA DE DATOS (BATCHING) ---

      // 1. Asignaciones rotativas
      const empleadosRotativosIds = empleados.filter(e => e.permite_rotativo).map(e => e.empleado_id);
      const rotativosMap = new Map();
      if (empleadosRotativosIds.length > 0) {
        const asignaciones = await this.marcaRepository.manager.find(AsignacionTurnoRotativo, {
          where: { empleado: { empleado_id: In(empleadosRotativosIds) } },
          relations: ['horario', 'empleado']
        });

        // Agrupamos por empleado en memoria
        const asigByEmp = new Map();
        for (const a of asignaciones) {
          const empId = a.empleado.empleado_id;
          if (!asigByEmp.has(empId)) asigByEmp.set(empId, []);
          asigByEmp.get(empId).push(a);
        }

        for (const [empId, asigs] of asigByEmp.entries()) {
          const asigHoy = asigs.find(a => {
            let start = '';
            if (a.fecha_inicio_turno instanceof Date) start = a.fecha_inicio_turno.toISOString().substring(0, 10);
            else start = String(a.fecha_inicio_turno).substring(0, 10);

            let end = '';
            if (a.fecha_fin_turno instanceof Date) end = a.fecha_fin_turno.toISOString().substring(0, 10);
            else end = String(a.fecha_fin_turno).substring(0, 10);

            return dateKey >= start && dateKey <= end;
          });
          if (asigHoy) {
            rotativosMap.set(empId, asigHoy);
          }
        }
      }

      // 2. Teletrabajos
      const teletrabajosHoy = await this.marcaRepository.manager.find(Teletrabajo, {
        where: {
          id_empleado: { empleado_id: In(empleadoIds) },
          fecha_actual: dateKey as any
        },
        relations: ['id_empleado']
      });
      const teletrabajoSet = new Set(teletrabajosHoy.map(t => t.id_empleado.empleado_id));

      // 3. Alertas de hoy
      const alertasHoy = await this.marcaRepository.manager.find(Alerta, {
        where: {
          empleado: { empleado_id: In(empleadoIds) },
          tipo: In([2, 3, 4]),
          fecha: Between(inicioDia, finDia)
        },
        relations: ['empleado']
      });
      const alertasMap = new Map<number, Set<number>>();
      for (const alerta of alertasHoy) {
        const empId = alerta.empleado.empleado_id;
        if (!alertasMap.has(empId)) alertasMap.set(empId, new Set());
        alertasMap.get(empId)!.add(alerta.tipo);
      }

      // 4. Marcas de hoy
      const marcasHoy = await this.marcaRepository.find({
        where: {
          num_ficha: In(numFichas),
          evento: In([1, 2]),
          fecha_marca: dateKey as any
        }
      });
      const marcasMap = new Map<string, Set<number>>();
      for (const marca of marcasHoy) {
        if (!marcasMap.has(marca.num_ficha)) marcasMap.set(marca.num_ficha, new Set());
        marcasMap.get(marca.num_ficha)!.add(marca.evento);
      }

      const nuevasAlertasAInsertar: Alerta[] = [];
      const correosAEnviar: { empleado: Empleado; tipo: number }[] = [];

      // --- EVALUACIÓN EN MEMORIA ---
      for (const empleado of empleados) {
        let horarioHoy: any = null;
        let tieneTeletrabajo = false;

        if (empleado.permite_rotativo) {
          const asigHoy = rotativosMap.get(empleado.empleado_id);
          if (asigHoy) {
            horarioHoy = asigHoy.horario;
            if (asigHoy.teletrabajo) tieneTeletrabajo = true;
          }
        } else {
          if (empleado.turno && empleado.turno.detalle_turno) {
            const dtDia = empleado.turno.detalle_turno.find((dt: any) => dt.dia?.cod_dia === diaSemana);
            if (dtDia && dtDia.horario) {
              horarioHoy = dtDia.horario;
            }
          }
          if (teletrabajoSet.has(empleado.empleado_id)) {
            tieneTeletrabajo = true;
          }
        }

        const empAlertasHoy = alertasMap.get(empleado.empleado_id) || new Set<number>();
        const empMarcasHoy = marcasMap.get(empleado.num_ficha) || new Set<number>();

        if (horarioHoy && horarioHoy.hora_entrada) {
          const horaParts = horarioHoy.hora_entrada.split(':');
          const entradaDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaParts[0]), parseInt(horaParts[1]), parseInt(horaParts[2] || '0'), 0);

          const diffMs = entradaDate.getTime() - ahora.getTime();
          const diffTotalMinutos = diffMs / 60000;

          if (diffTotalMinutos <= -30 && diffTotalMinutos >= -120) {
            if (!empAlertasHoy.has(2)) {
              if (!empMarcasHoy.has(1)) {
                if (empleado.email || empleado.email_laboral) {
                  correosAEnviar.push({ empleado, tipo: 2 });
                  nuevasAlertasAInsertar.push(
                    this.marcaRepository.manager.create(Alerta, {
                      tipo: 2,
                      empleado: { empleado_id: empleado.empleado_id } as Empleado,
                      fecha: ahora
                    })
                  );
                  empAlertasHoy.add(2); // Evita duplicar procesamientos si existieran
                }
              }
            }
          }
        }

        if (tieneTeletrabajo && horarioHoy && horarioHoy.hora_salida) {
          const horaPartsSalida = horarioHoy.hora_salida.split(':');
          const salidaDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaPartsSalida[0]), parseInt(horaPartsSalida[1]), parseInt(horaPartsSalida[2] || '0'), 0);

          const diffMsSalida = salidaDate.getTime() - ahora.getTime();
          const diffTotalMinutosSalida = diffMsSalida / 60000;

          if (diffTotalMinutosSalida >= 0 && diffTotalMinutosSalida <= 30) {
            if (!empAlertasHoy.has(3)) {
              if (empleado.email || empleado.email_laboral) {
                correosAEnviar.push({ empleado, tipo: 3 });
                nuevasAlertasAInsertar.push(
                  this.marcaRepository.manager.create(Alerta, {
                    tipo: 3,
                    empleado: { empleado_id: empleado.empleado_id } as Empleado,
                    fecha: ahora
                  })
                );
                empAlertasHoy.add(3);
              }
            }
          }
        }

        if (horarioHoy && horarioHoy.hora_salida) {
          const horaPartsSalida = horarioHoy.hora_salida.split(':');
          const salidaDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), parseInt(horaPartsSalida[0]), parseInt(horaPartsSalida[1]), parseInt(horaPartsSalida[2] || '0'), 0);

          const diffMsSalida = salidaDate.getTime() - ahora.getTime();
          const diffTotalMinutosSalida = diffMsSalida / 60000;

          if (diffTotalMinutosSalida <= -30 && diffTotalMinutosSalida >= -120) {
            if (!empAlertasHoy.has(4)) {
              if (!empMarcasHoy.has(2)) {
                if (empleado.email || empleado.email_laboral) {
                  correosAEnviar.push({ empleado, tipo: 4 });
                  nuevasAlertasAInsertar.push(
                    this.marcaRepository.manager.create(Alerta, {
                      tipo: 4,
                      empleado: { empleado_id: empleado.empleado_id } as Empleado,
                      fecha: ahora
                    })
                  );
                  empAlertasHoy.add(4);
                }
              }
            }
          }
        }
      }

      // --- INSERCIÓN Y ENVÍO EN LOTE ---
      if (nuevasAlertasAInsertar.length > 0) {
        await this.marcaRepository.manager.save(Alerta, nuevasAlertasAInsertar);
      }

      if (correosAEnviar.length > 0) {
        // Enviar correos en lotes (Promise.all) para no saturar SMTP
        const BATCH_SIZE = 10;
        for (let i = 0; i < correosAEnviar.length; i += BATCH_SIZE) {
          const chunk = correosAEnviar.slice(i, i + BATCH_SIZE);
          await Promise.all(
            chunk.map(c =>
              this.enviarCorreoAlerta(c.empleado, c.tipo)
                .catch(err => this.logger.error(`Error enviando correo a ${c.empleado.empleado_id}:`, err))
            )
          );
        }
      }
    } catch (error) {
      this.logger.error('Error al ejecutar cron de notificaciones de marcas:', error);
    }
  }
}
