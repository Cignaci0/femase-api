const fs = require('fs');

// 2. Update backend (firmas.service.ts & firmas.controller.ts)
const servicePath = 'C:/proyectos/femase-api/src/firmas/firmas.service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');

const findAllAdminStr = `
  async findAllAdmin(empresa_id: number) {
    return await this.firmaRepository.find({
      where: {
        empresa: { empresa_id: empresa_id }
      },
      order: { id: 'DESC' },
      relations: ['empleado', 'empresa']
    });
  }

  async findAll(`;

if (!serviceContent.includes('findAllAdmin')) {
    serviceContent = serviceContent.replace('  async findAll(', findAllAdminStr);
    fs.writeFileSync(servicePath, serviceContent, 'utf8');
    console.log("Added findAllAdmin to firmas.service.ts");
}

const controllerPath = 'C:/proyectos/femase-api/src/firmas/firmas.controller.ts';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

const findAllAdminControllerStr = `
  @Get('admin/:empresa_id')
  @UseGuards(AuthGuard)
  findAllAdmin(@Param('empresa_id') empresa_id: string) {
    return this.firmasService.findAllAdmin(+empresa_id);
  }

  @Get()`;

if (!controllerContent.includes('admin/:empresa_id')) {
    controllerContent = controllerContent.replace('  @Get()', findAllAdminControllerStr);
    fs.writeFileSync(controllerPath, controllerContent, 'utf8');
    console.log("Added findAllAdmin to firmas.controller.ts");
}
