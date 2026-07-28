const fs = require('fs');

// 1. firmas.controller.ts
const controllerPath = 'C:/proyectos/femase-api/src/firmas/firmas.controller.ts';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

if (!controllerContent.includes('trackEmail')) {
    controllerContent = controllerContent.replace(
        "import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';",
        "import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards, Res } from '@nestjs/common';\nimport { Response } from 'express';\nimport { join } from 'path';"
    );
    
    const endpoints = `
  @Get('track/:id.avif')
  async trackEmail(@Param('id') id: string, @Res() res: Response) {
    await this.firmasService.marcarLeido(+id);
    const imagePath = join(process.cwd(), 'src', 'utils', 'img correo.avif');
    res.setHeader('Content-Type', 'image/avif');
    res.sendFile(imagePath);
  }

  @Get('enviados')
  @UseGuards(AuthGuard)
  findAllEnviadosPorMi(@Req() req: any) {
    const idUsuario = req.user?.sub;
    return this.firmasService.findAllEnviadosPorMi(idUsuario);
  }

  @Post()`;
  
    controllerContent = controllerContent.replace('  @Post()', endpoints);
    fs.writeFileSync(controllerPath, controllerContent, 'utf8');
    console.log("Patched firmas.controller.ts");
}

// 2. firmas.service.ts
const servicePath = 'C:/proyectos/femase-api/src/firmas/firmas.service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');

if (!serviceContent.includes('findAllEnviadosPorMi')) {
    const newMethods = `
  async marcarLeido(id: number) {
    await this.firmaRepository.update(id, { leido: true });
  }

  async findAllEnviadosPorMi(idUsuario: number) {
    return await this.firmaRepository.find({
      where: { enviado_por: { usuario_id: idUsuario } },
      order: { id: 'DESC' },
      relations: ['empleado', 'empresa']
    });
  }

  async create(createFirmaDto: CreateFirmaDto`;
  
    serviceContent = serviceContent.replace('  async create(createFirmaDto: CreateFirmaDto', newMethods);

    // Add enviado_por
    serviceContent = serviceContent.replace(
        '...(createFirmaDto.usuario && { usuario: { usuario_id: createFirmaDto.usuario } })',
        '...(createFirmaDto.usuario && { usuario: { usuario_id: createFirmaDto.usuario } }),\n      ...(idUsuario && { enviado_por: { usuario_id: idUsuario } })'
    );

    // Save before sending email & conditional html
    const originalEmailBlock = `    try {
      await this.mailerService.sendMail({
        to: empleado.email_laboral,
        subject: "Nueva Solicitud de firma",
        html: \`
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Nueva Solicitud de Firma</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Se ha creado una nueva solicitud de firma.
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;">Favor de revisar la solicitud en su portal para aprobar o rechazar la solicitud.</p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar la solicitud en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aqu</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atencin y que tenga un buen da</p>
          </div>
        </div>\`

      });
    } catch (error) {
      console.error("Error enviando email:", error.message);
    }
    const guardada = await this.firmaRepository.save(firma);`;

    const originalEmailBlockRegex = /try\s*\{\s*await this\.mailerService\.sendMail\(\{[\s\S]*?\} catch \(error\) \{\s*console\.error\("Error enviando email:", error\.message\);\s*\}\s*const guardada = await this\.firmaRepository\.save\(firma\);/m;

    const newEmailBlock = `const guardada = await this.firmaRepository.save(firma);
    try {
      let htmlContent = \`
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0088cc; padding: 20px; color: white; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Nueva Solicitud de Firma</h2>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h3 style="color: #0088cc; margin-top: 0;">Estimado(a):</h3>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Se ha creado una nueva solicitud de firma.
            </p>
            <div style="text-align: center; margin: 0 auto; line-height: 1.6;">
              <p style="margin: 5px 0;">Favor de revisar la solicitud en su portal para aprobar o rechazar la solicitud.</p>
            </div>
            <div style="margin-top: 30px;">
              <p style="font-size: 14px; color: #0088cc;">Puede revisar la solicitud en el sistema:</p>
              <p><a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Presione aquí</a></p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #0088cc;">Gracias por su atención y que tenga un buen día</p>
          </div>
        </div>\`;
        
      if (createFirmaDto.tipo === "Anexos" || createFirmaDto.tipo === "Pactos") {
          htmlContent += \`\\n<img src="http://localhost:3000/api/firmas/track/\${guardada.id}.avif" width="1" height="1" style="display:none;" />\`;
      }

      await this.mailerService.sendMail({
        to: empleado.email_laboral,
        subject: "Nueva Solicitud de firma",
        html: htmlContent
      });
    } catch (error) {
      console.error("Error enviando email:", error.message);
    }`;

    serviceContent = serviceContent.replace(originalEmailBlockRegex, newEmailBlock);

    fs.writeFileSync(servicePath, serviceContent, 'utf8');
    console.log("Patched firmas.service.ts");
}
