import { HttpException, Injectable } from '@nestjs/common';
import { CreateVacacioneDto } from './dto/create-vacacione.dto';
import { UpdateVacacioneDto } from './dto/update-vacacione.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vacaciones } from './entities/vacaciones.entity';
import { Between, Repository } from 'typeorm';
import { Empleado } from '../empleado/entities/empleado.entity';
import { User } from '../users/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { RegistroEvento } from '../registro_evento/entities/registro_evento.entity';
const UAParser = require('ua-parser-js');

@Injectable()
export class VacacionesService {
  constructor(
    @InjectRepository(Vacaciones)
    private readonly vacacionesRepository: Repository<Vacaciones>,
    @InjectRepository(Empleado)
    private readonly empleadoRepository: Repository<Empleado>,
    @InjectRepository(User)
    private readonly usuarioRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) { }

  private formatDate(date: Date): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  create(createVacacioneDto: CreateVacacioneDto) {
    return 'This action adds a new vacacione';
  }

  async aprobarRechazarSolicitud(idSolicitud: number, estado: string, usuario: string, idUsuario?: number, ip?: string, userAgent?: string) {
    const busquedaSolicitud = await this.vacacionesRepository.findOne({
      where: {
        id_vacaciones: idSolicitud
      }, relations: ['empleado']
    });

    if (!busquedaSolicitud) {
      throw new HttpException('Solicitud no encontrada', 404);
    }

    const autorizador = await this.usuarioRepository.findOne({
      where: {
        username: usuario
      }
    })

    if (!autorizador) {
      throw new HttpException('Autorizador no encontrado', 404);
    }

    busquedaSolicitud.estado = estado;
    busquedaSolicitud.autorizador = autorizador.username;

    const { diasDisponibles } = await this.getDiasDisponibles(busquedaSolicitud.empleado.num_ficha);

    busquedaSolicitud.saldo_vba_previo = busquedaSolicitud.saldo_vacaciones;

    // Calcular en rango fecha inicio y fin dias que hay entre medio sin contar fines de semana 
    const startDate = new Date(busquedaSolicitud.fecha_inicio);
    const endDate = new Date(busquedaSolicitud.fecha_fin);

    let diasUtilizados = 0;
    const current = new Date(startDate.getTime());

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        diasUtilizados++;
      }
      current.setDate(current.getDate() + 1);
    }

    busquedaSolicitud.dias_efectivos = diasUtilizados;

    if (estado === 'A' && diasDisponibles < busquedaSolicitud.dias_efectivos) {
      throw new HttpException('El empleado no tiene suficientes días disponibles para aprobar esta solicitud', 400);
    }

    busquedaSolicitud.saldo_vacaciones = estado === 'A'
      ? diasDisponibles - busquedaSolicitud.dias_efectivos
      : diasDisponibles;

    const guardar = await this.vacacionesRepository.save(busquedaSolicitud);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.vacacionesRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.vacacionesRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;
        const accionTxt = estado === 'A' ? 'APROBADO' : 'RECHAZADO';

        const registroEvento = this.vacacionesRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha ${accionTxt} la solicitud de vacaciones del empleado "${busquedaSolicitud.empleado.nombres} ${busquedaSolicitud.empleado.apellido_paterno}" (Ficha: ${busquedaSolicitud.empleado.num_ficha}) desde el dia ${this.formatDate(busquedaSolicitud.fecha_inicio)} hasta el dia ${this.formatDate(busquedaSolicitud.fecha_fin)}.`,
          tipo_evento: `Resolución Vacaciones (${accionTxt})`,
          ip: ip || 'Desconocida',
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.vacacionesRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardar;
  }

  async getDiasDisponibles(numFicha: string) {
    const busquedaEmpleado = await this.empleadoRepository.findOne({
      where: {
        num_ficha: numFicha
      }, relations: ['cenco']
    });

    if (!busquedaEmpleado) {
      throw new HttpException('Empleado no encontrado', 404);
    }

    const busquedaVacaciones = await this.vacacionesRepository.find({
      where: {
        empleado: {
          num_ficha: busquedaEmpleado?.num_ficha
        },
        estado: 'A'
      },
      relations: ['empleado'],
      select: {
        id_vacaciones: true,
        fecha_ingreso: true,
        fecha_inicio: true,
        fecha_fin: true,
        dias_acumulados: true,
        dias_efectivos: true,
        saldo_vacaciones: true,
        saldo_vba_previo: true,
        zona_extrema: true,
        autorizador: true,
        estado: true,
        empleado: {
          num_ficha: true,
          fecha_ini_contrato: true,
          fecha_fin_contrato: true,
        }
      },
      order: {
        fecha_ingreso: 'DESC'
      }
    });

    const fechaInicioContrato = new Date(busquedaEmpleado.fecha_ini_contrato);
    fechaInicioContrato.setHours(0, 0, 0, 0);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    let mesesTrabajados = (fechaActual.getFullYear() - fechaInicioContrato.getFullYear()) * 12 + (fechaActual.getMonth() - fechaInicioContrato.getMonth());

    if (fechaActual.getDate() < fechaInicioContrato.getDate()) {
      mesesTrabajados--;
    }
    if (mesesTrabajados < 0) mesesTrabajados = 0;

    const diasDelMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
    let fechaUltimoCumpleMes = new Date(fechaInicioContrato);
    fechaUltimoCumpleMes.setMonth(fechaInicioContrato.getMonth() + mesesTrabajados);

    const diffTime = fechaActual.getTime() - fechaUltimoCumpleMes.getTime();
    const diasSueltos = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const proporcionalesNormales = (1.25 / diasDelMesActual) * diasSueltos;
    const totalNormales = (mesesTrabajados * 1.25) + proporcionalesNormales;

    let totalZonaExtrema = 0;
    if (busquedaEmpleado.cenco?.zona_extrema) {
      const proporcionalesZE = (0.42 / diasDelMesActual) * diasSueltos;
      totalZonaExtrema = (mesesTrabajados * 0.42) + proporcionalesZE;
    }

    const diasAcumulados = parseFloat((totalNormales + totalZonaExtrema).toFixed(2));

    const diasUtilizados = busquedaVacaciones.reduce((acc, curr) => acc + Number(curr.dias_efectivos || 0), 0);
    const diasDisponibles = parseFloat((diasAcumulados - diasUtilizados).toFixed(2));

    return {
      diasDisponibles,
      totalNormales: parseFloat(totalNormales.toFixed(2)),
      totalZonaExtrema: parseFloat(totalZonaExtrema.toFixed(2)),
      totalAcumulados: diasAcumulados,
      diasUtilizados: parseFloat(diasUtilizados.toFixed(2))
    };
  }

  async createSolicitudVacaciones(createVacacioneDto: CreateVacacioneDto, numFicha: string, autorizador: string, idUsuario?: number, ip?: string, userAgent?: string) {
    const { fechaInicio, fechaFin, estadoId } = createVacacioneDto;

    const empleado = await this.empleadoRepository.findOne({
      where: { num_ficha: numFicha }
      , relations: ['cenco']
    });

    if (!empleado) {
      throw new HttpException('Empleado no encontrado', 404);
    }

    const solicitudesPrevias = await this.vacacionesRepository.find({
      where: {
        empleado: { num_ficha: numFicha }
      }
    });

    const newStart = new Date(fechaInicio);
    const newEnd = new Date(fechaFin);
    newStart.setHours(0, 0, 0, 0);
    newEnd.setHours(0, 0, 0, 0);

    const hasOverlap = solicitudesPrevias.some(solicitud => {
      if (solicitud.estado === 'R') return false;
      const existingStart = new Date(solicitud.fecha_inicio);
      const existingEnd = new Date(solicitud.fecha_fin);
      existingStart.setHours(0, 0, 0, 0);
      existingEnd.setHours(0, 0, 0, 0);

      return existingStart <= newEnd && newStart <= existingEnd;
    });

    if (hasOverlap) {
      throw new HttpException('Ya existe una solicitud de vacaciones en las fechas seleccionadas', 400);
    }

    // Pasar a cantidad dias entre medio sin fin de semanas
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    let diasATomar = 0;
    const current = new Date(startDate.getTime());

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        diasATomar++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Obtener dias disponibles (ultimo registro del usuario)
    const { diasDisponibles } = await this.getDiasDisponibles(numFicha);

    if (diasDisponibles < diasATomar) {
      throw new HttpException('No tienes suficientes dias disponibles', 400);
    }

    let multiplicadorDias: number;

    if (empleado.cenco.zona_extrema) {
      multiplicadorDias = 1.67;
    } else {
      multiplicadorDias = 1.25;
    }

    // Se debe calcular en base a la fecha de inicio de contrato y fecha de inicio de vacaciones.
    const fechaInicioContrato = new Date(empleado.fecha_ini_contrato);
    fechaInicioContrato.setHours(0, 0, 0, 0);
    const fechaActual = new Date(fechaInicio);
    fechaActual.setHours(0, 0, 0, 0);

    let mesesTrabajados = (fechaActual.getFullYear() - fechaInicioContrato.getFullYear()) * 12 + (fechaActual.getMonth() - fechaInicioContrato.getMonth());

    if (fechaActual.getDate() < fechaInicioContrato.getDate()) {
      mesesTrabajados--;
    }

    if (mesesTrabajados < 0) mesesTrabajados = 0;

    const diasDelMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();

    let fechaUltimoCumpleMes = new Date(fechaInicioContrato);
    fechaUltimoCumpleMes.setMonth(fechaInicioContrato.getMonth() + mesesTrabajados);

    const diffTime = fechaActual.getTime() - fechaUltimoCumpleMes.getTime();
    const diasSueltos = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const diasProporcionales = (multiplicadorDias / diasDelMesActual) * diasSueltos;
    let diasAcumulados = (mesesTrabajados * multiplicadorDias) + diasProporcionales;

    diasAcumulados = parseFloat(diasAcumulados.toFixed(2));

    const vacaciones = this.vacacionesRepository.create({
      empleado: empleado,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: estadoId ? estadoId : 'P',
      dias_acumulados: diasAcumulados,
      zona_extrema: empleado.cenco.zona_extrema,
      saldo_vba_previo: 0,
      autorizador: estadoId == 'A' || estadoId == 'R' ? autorizador : '',
    });

    await this.mailerService.sendMail({
      to: empleado.email, // CAMBIAR A CORREO LABORAL SI ES NECESARIO
      cc: empleado.email_noti,
      subject: 'Solicitud de Vacaciones',
      html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hola, ${empleado.nombres}</h2>
            <p>Se ha creado una solicitud de vacaciones en el sistema. Los detalles son los siguientes:</p>
            <ul>
              <li><strong>Fecha de Inicio:</strong> ${fechaInicio}</li>
              <li><strong>Fecha de Fin:</strong> ${fechaFin}</li>
              <li><strong>Dias a Tomar:</strong> ${diasATomar}</li>
              <li><strong>Dias Disponibles:</strong> ${diasDisponibles}</li>
              <li><strong>Dias Acumulados:</strong> ${diasAcumulados}</li>
              <li><strong>Zona Extrema:</strong> ${empleado.cenco.zona_extrema}</li>
              <li><strong>Autorizador:</strong> ${autorizador}</li>
            </ul>
            <p>Si tienes dudas, puedes contactar al administrador.</p>
          </div>`,
    });

    const guardar = await this.vacacionesRepository.save(vacaciones);

    // --- AUDITORÍA ---
    if (idUsuario && !isNaN(idUsuario)) {
      const autor = await this.vacacionesRepository.manager.findOne(User, {
        where: { usuario_id: idUsuario },
        relations: ['empleado', 'empresa']
      });

      if (autor) {
        let empleadoAutor: Empleado | null = null;
        if (autor?.empleado?.empleado_id) {
          empleadoAutor = await this.vacacionesRepository.manager.findOne(Empleado, {
            where: { empleado_id: autor.empleado.empleado_id },
            relations: ['empresa', 'cenco', 'cenco.departamento']
          });
        }

        const parser = new UAParser(userAgent || '');
        const navegador = `${parser.getBrowser().name}-${parser.getBrowser().version}`;

        const registroEvento = this.vacacionesRepository.manager.create(RegistroEvento, {
          usuario: autor?.username,
          evento: `El usuario ${autor?.username} de la empresa ${autor?.empresa?.nombre_empresa || 'Sin Empresa'} ha creado una solicitud de vacaciones para el empleado "${empleado.nombres} ${empleado.apellido_paterno}" (Ficha: ${empleado.num_ficha}) desde el ${this.formatDate(new Date(fechaInicio))} al ${this.formatDate(new Date(fechaFin))}.`,
          tipo_evento: 'Solicitud Vacaciones',
          ip: ip || 'Desconocida',
          fecha: new Date(),
          hora: new Date().toTimeString().split(' ')[0],
          sistema_operativo: parser.getOS().name || 'Desconocido',
          browser: navegador,
          empresa: empleadoAutor?.empresa?.nombre_empresa || autor?.empresa?.nombre_empresa,
          depto: empleadoAutor?.cenco?.departamento?.nombre_departamento || "Sin Depto",
          cenco: empleadoAutor?.cenco?.nombre_cenco || "Sin Cenco",
          rut: autor?.run_usuario
        });

        await this.vacacionesRepository.manager.save(registroEvento);
      }
    }
    // -----------------

    return guardar;
  }

  async findAll(numFicha: string, fechaInicio?: Date, fechaFin?: Date) {
    let whereConditions: any = {
      empleado: { num_ficha: numFicha }
    };

    if (fechaInicio && fechaFin) {
      whereConditions = [
        { empleado: { num_ficha: numFicha }, fecha_inicio: Between(fechaInicio, fechaFin) },
        { empleado: { num_ficha: numFicha }, fecha_fin: Between(fechaInicio, fechaFin) }
      ];
    }

    const busqueda = await this.vacacionesRepository.find({
      where: whereConditions,
      relations: ['empleado'],
      order: {
        id_vacaciones: 'ASC'
      },
      select: {
        id_vacaciones: true,
        fecha_ingreso: true,
        fecha_inicio: true,
        fecha_fin: true,
        dias_acumulados: true,
        dias_efectivos: true,
        saldo_vacaciones: true,
        zona_extrema: true,
        autorizador: true,
        estado: true,
        empleado: {
          num_ficha: true,
          fecha_ini_contrato: true,
          fecha_fin_contrato: true,
        }
      }
    });

    if (busqueda.length === 0) {
      throw new HttpException('No se encontraron vacaciones para el número de ficha proporcionado o en el rango de fechas seleccionado', 404);
    }

    if (busqueda[0].empleado.fecha_fin_contrato) {
      const fechaFinContrato = new Date(busqueda[0].empleado.fecha_fin_contrato);
      if (fechaFinContrato < new Date()) {
        throw new HttpException('El empleado tiene contrato vencido', 400);
      }
    }

    let multiplicadorDias: number;

    if (busqueda[0].zona_extrema) {
      multiplicadorDias = 1.67;
    } else {
      multiplicadorDias = 1.25;
    }

    const fechaInicioContrato = new Date(busqueda[0].empleado.fecha_ini_contrato);
    fechaInicioContrato.setHours(0, 0, 0, 0);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    let mesesTrabajados = (fechaActual.getFullYear() - fechaInicioContrato.getFullYear()) * 12 + (fechaActual.getMonth() - fechaInicioContrato.getMonth());

    if (fechaActual.getDate() < fechaInicioContrato.getDate()) {
      mesesTrabajados--;
    }

    if (mesesTrabajados < 0) mesesTrabajados = 0;

    const diasDelMesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate();
    let fechaUltimoCumpleMes = new Date(fechaInicioContrato);
    fechaUltimoCumpleMes.setMonth(fechaInicioContrato.getMonth() + mesesTrabajados);

    const diffTime = fechaActual.getTime() - fechaUltimoCumpleMes.getTime();
    const diasSueltos = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const proporcionalesNormales = (1.25 / diasDelMesActual) * diasSueltos;
    const totalNormales = (mesesTrabajados * 1.25) + proporcionalesNormales;

    let totalZonaExtrema = 0;
    if (busqueda[0].zona_extrema) {
      const proporcionalesZE = (0.42 / diasDelMesActual) * diasSueltos;
      totalZonaExtrema = (mesesTrabajados * 0.42) + proporcionalesZE;
    }

    const diasAcumulados = totalNormales + totalZonaExtrema;

    busqueda.forEach(b => {
      b.dias_acumulados = parseFloat(diasAcumulados.toFixed(2));

      if (b.fecha_inicio && b.fecha_fin) {
        const startDate = new Date(b.fecha_inicio);
        const endDate = new Date(b.fecha_fin);

        let diasEfectivos = 0;
        const current = new Date(startDate.getTime());

        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            diasEfectivos++;
          }
          current.setDate(current.getDate() + 1);
        }

        b.dias_efectivos = diasEfectivos;
        b.saldo_vacaciones = parseFloat((b.dias_acumulados - b.dias_efectivos).toFixed(2));
      }
    });

    let diasUtilizados = 0;
    for (const v of busqueda) {
      diasUtilizados += Number(v.dias_efectivos || 0);
    }
    const diasDisponibles = parseFloat((diasAcumulados - diasUtilizados).toFixed(2));

    return {
      vacaciones: busqueda,
      resumen: {
        totalNormales: parseFloat(totalNormales.toFixed(2)),
        totalZonaExtrema: parseFloat(totalZonaExtrema.toFixed(2)),
        totalAcumulados: parseFloat(diasAcumulados.toFixed(2)),
        diasUtilizados: parseFloat(diasUtilizados.toFixed(2)),
        diasDisponibles: diasDisponibles
      }
    };
  }

  update(id: number, updateVacacioneDto: UpdateVacacioneDto) {
    return `This action updates a #${id} vacacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} vacacione`;
  }
}
