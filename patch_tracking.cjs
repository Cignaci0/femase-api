const fs = require('fs');

// 1. firma.entity.ts
const firmaEntityPath = 'C:/proyectos/femase-api/src/firmas/entities/firma.entity.ts';
let firmaEntityContent = fs.readFileSync(firmaEntityPath, 'utf8');
if (!firmaEntityContent.includes('leido: boolean')) {
    firmaEntityContent = firmaEntityContent.replace(
        'motivo: string;', 
        "motivo: string;\n\n    @Column({ default: false })\n    leido: boolean;"
    );
    fs.writeFileSync(firmaEntityPath, firmaEntityContent, 'utf8');
    console.log("Patched firma.entity.ts");
}

// 2. firmas.controller.ts
const controllerPath = 'C:/proyectos/femase-api/src/firmas/firmas.controller.ts';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');
if (!controllerContent.includes('trackEmail')) {
    controllerContent = controllerContent.replace(
        "import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards } from '@nestjs/common';",
        "import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Ip, Headers, UseGuards, Res } from '@nestjs/common';\nimport { Response } from 'express';\nimport { join } from 'path';"
    );
    
    const trackEndpoint = `
  @Get('track/:id.avif')
  async trackEmail(@Param('id') id: string, @Res() res: Response) {
    await this.firmasService.marcarLeido(+id);
    const imagePath = join(process.cwd(), 'src', 'utils', 'img correo.avif');
    res.setHeader('Content-Type', 'image/avif');
    res.sendFile(imagePath);
  }

  @Post()`;
  
    controllerContent = controllerContent.replace('  @Post()', trackEndpoint);
    fs.writeFileSync(controllerPath, controllerContent, 'utf8');
    console.log("Patched firmas.controller.ts");
}

// 3. firmas.service.ts
const servicePath = 'C:/proyectos/femase-api/src/firmas/firmas.service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');
if (!serviceContent.includes('marcarLeido')) {
    const marcarLeidoFunc = `
  async marcarLeido(id: number) {
    await this.firmaRepository.update(id, { leido: true });
  }

  async create(createFirmaDto: CreateFirmaDto`;
  
    serviceContent = serviceContent.replace('  async create(createFirmaDto: CreateFirmaDto', marcarLeidoFunc);

    // Save before sending email
    serviceContent = serviceContent.replace(
        '    try {\n      await this.mailerService.sendMail({',
        '    const guardada = await this.firmaRepository.save(firma);\n\n    try {\n      await this.mailerService.sendMail({'
    );
    
    // Support Windows CRLF if any
    serviceContent = serviceContent.replace(
        '    try {\r\n      await this.mailerService.sendMail({',
        '    const guardada = await this.firmaRepository.save(firma);\r\n\r\n    try {\r\n      await this.mailerService.sendMail({'
    );

    // Remove the old save
    serviceContent = serviceContent.replace(
        '    } catch (error) {\n      console.error("Error enviando email:", error.message);\n    }\n    const guardada = await this.firmaRepository.save(firma);',
        '    } catch (error) {\n      console.error("Error enviando email:", error.message);\n    }'
    );
    
    serviceContent = serviceContent.replace(
        '    } catch (error) {\r\n      console.error("Error enviando email:", error.message);\r\n    }\r\n    const guardada = await this.firmaRepository.save(firma);',
        '    } catch (error) {\r\n      console.error("Error enviando email:", error.message);\r\n    }'
    );

    // Add img pixel to HTML
    serviceContent = serviceContent.replace(
        '        </div>`',
        '        </div>\n        <img src="http://localhost:3000/api/firmas/track/${guardada.id}.avif" width="1" height="1" style="display:none;" />`'
    );

    fs.writeFileSync(servicePath, serviceContent, 'utf8');
    console.log("Patched firmas.service.ts");
}
