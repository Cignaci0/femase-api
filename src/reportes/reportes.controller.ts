import { Controller, Get, Query, Res, HttpException, Req, Ip, Headers, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('reportes')
@UseGuards(AuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) { }

  @Get('asistencia/pdf')
  async generateAttendanceReport(
    @Query('numFicha') numFicha: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha || !fechaInicio || !fechaFin) {
      throw new HttpException('Faltan parámetros requeridos', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generateAttendancePdf(numFicha, fechaInicio, fechaFin, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="asistencia_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('asistencia-simple/pdf')
  async generateSimpleAttendanceReport(
    @Query('numFicha') numFicha: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha || !fechaInicio || !fechaFin) {
      throw new HttpException('Faltan parámetros requeridos', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generateSimpleAttendancePdf(numFicha, fechaInicio, fechaFin, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="asistencia_simple_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('vacaciones/pdf')
  async generateVacacionesReport(
    @Query('numFicha') numFicha: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha) {
      throw new HttpException('Faltan parámetros requeridos', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generarReporteVacaciones(numFicha, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vacaciones_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('ausencias/pdf')
  async generateAusenciasReport(
    @Query('numFicha') numFicha: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha) {
      throw new HttpException('Faltan parámetros requeridos', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generarReporteAusencias(numFicha, fechaInicio, fechaFin, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ausencias_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('domingos-festivos/pdf')
  async generateDomFestReport(
    @Query('numFicha') numFicha: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha || !fechaInicio || !fechaFin) {
      throw new HttpException('Faltan parámetros requeridos', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generateDomFestPdf(numFicha, fechaInicio, fechaFin, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="domingos_festivos_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('auditoria-turno/pdf')
  async generateAuditTurnoReport(
    @Query('numFicha') numFicha: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!numFicha || !fechaInicio || !fechaFin) {
      throw new HttpException('Faltan parámetros requeridos (numFicha, fechaInicio, fechaFin)', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generateAuditTurnoPdf(fechaInicio, fechaFin, numFicha, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="auditoria_turnos_${numFicha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }

  @Get('marcaciones-diarias/pdf')
  async generateDailyMarkingsReport(
    @Query('fecha') fecha: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response
  ) {
    if (!fecha) {
      throw new HttpException('Falta el parámetro requerido: fecha', 400);
    }

    try {
      const idUsuario = req.user?.sub;
      const pdfBuffer = await this.reportesService.generateDailyMarkingsPdf(fecha, idUsuario, ip, userAgent);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="marcaciones_diarias_${fecha}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (error) {
      throw new HttpException('Error generando reporte: ' + error.message, 500);
    }
  }
}
