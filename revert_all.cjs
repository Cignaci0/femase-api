const fs = require('fs');

// 1. Revert Documento.entity.ts
const docEntityPath = 'C:/proyectos/femase-api/src/documento/entities/documento.entity.ts';
if (fs.existsSync(docEntityPath)) {
    let docContent = fs.readFileSync(docEntityPath, 'utf8');
    if (!docContent.includes('leido: boolean')) {
        docContent = docContent.replace(
            '    empresa: Empresa;\n\n}',
            '    empresa: Empresa;\n\n    @Column()\n    leido: boolean\n}'
        );
        fs.writeFileSync(docEntityPath, docContent, 'utf8');
        console.log("Reverted Documento.entity.ts (added leido back)");
    }
}

// 2. Revert Firma.entity.ts
const firmaEntityPath = 'C:/proyectos/femase-api/src/firmas/entities/firma.entity.ts';
if (fs.existsSync(firmaEntityPath)) {
    let firmaContent = fs.readFileSync(firmaEntityPath, 'utf8');
    firmaContent = firmaContent.replace(/\s*@Column\(\{ default: false \}\)\s*leido:\s*boolean;/g, '');
    fs.writeFileSync(firmaEntityPath, firmaContent, 'utf8');
    console.log("Reverted Firma.entity.ts (removed leido)");
}

// 3. Revert firmas.controller.ts
const controllerPath = 'C:/proyectos/femase-api/src/firmas/firmas.controller.ts';
if (fs.existsSync(controllerPath)) {
    let ctrlContent = fs.readFileSync(controllerPath, 'utf8');
    
    // Remove trackEmail
    const trackRegex = /^\s*@Get\('track\/:id\.avif'\)[\s\S]*?res\.sendFile\(imagePath\);\s*\}/m;
    ctrlContent = ctrlContent.replace(trackRegex, '');
    
    // Remove findAllAdmin
    const adminRegex = /^\s*@Get\('admin\/:empresa_id'\)[\s\S]*?findAllAdmin\(\+empresa_id\);\s*\}/m;
    ctrlContent = ctrlContent.replace(adminRegex, '');
    
    // Remove imports Res, Response, join
    ctrlContent = ctrlContent.replace(/, Res/g, '');
    ctrlContent = ctrlContent.replace(/import \{ Response \} from 'express';\r?\n/g, '');
    ctrlContent = ctrlContent.replace(/import \{ join \} from 'path';\r?\n/g, '');
    
    fs.writeFileSync(controllerPath, ctrlContent, 'utf8');
    console.log("Reverted firmas.controller.ts");
}

// 4. Revert firmas.service.ts
const servicePath = 'C:/proyectos/femase-api/src/firmas/firmas.service.ts';
if (fs.existsSync(servicePath)) {
    let srvContent = fs.readFileSync(servicePath, 'utf8');
    
    // Remove marcarLeido
    const marcarRegex = /^\s*async marcarLeido\(id: number\) \{[\s\S]*?leido: true \}\);\s*\}/m;
    srvContent = srvContent.replace(marcarRegex, '');
    
    // Remove findAllAdmin
    const findAllAdminRegex = /^\s*async findAllAdmin\(empresa_id: number\) \{[\s\S]*?relations: \['empleado', 'empresa'\]\r?\n\s*\}\);\s*\}/m;
    srvContent = srvContent.replace(findAllAdminRegex, '');
    
    // Remove img tag
    srvContent = srvContent.replace(/\s*<img src="http:\/\/localhost:3000\/api\/firmas\/track\/\$\{guardada\.id\}\.avif"[^>]*>`/g, '`');
    
    // Revert save order
    srvContent = srvContent.replace(
        /const guardada = await this\.firmaRepository\.save\(firma\);\s*try \{/g,
        'try {'
    );
    srvContent = srvContent.replace(
        /\} catch \(error\) \{\s*console\.error\("Error enviando email:", error\.message\);\s*\}/g,
        '} catch (error) {\n      console.error("Error enviando email:", error.message);\n    }\n    const guardada = await this.firmaRepository.save(firma);'
    );
    
    fs.writeFileSync(servicePath, srvContent, 'utf8');
    console.log("Reverted firmas.service.ts");
}

// 5. Revert documentosYFirmas.js
const frontServicePath = 'C:/proyectos/pagina-femase/src/services/documentosYFirmas.js';
if (fs.existsSync(frontServicePath)) {
    let frontSrvContent = fs.readFileSync(frontServicePath, 'utf8');
    const funcRegex = /\/\/Obtener firmas admin[\s\S]*?\}\s*\};\s*/;
    frontSrvContent = frontSrvContent.replace(funcRegex, '');
    fs.writeFileSync(frontServicePath, frontSrvContent, 'utf8');
    console.log("Reverted documentosYFirmas.js");
}

// 6. Delete AdminFirmasEnviadas.jsx
const adminFirmasPath = 'C:/proyectos/pagina-femase/src/pages/DASHBOARD/Documentos y Firmas/AdminFirmasEnviadas.jsx';
if (fs.existsSync(adminFirmasPath)) {
    fs.unlinkSync(adminFirmasPath);
    console.log("Deleted AdminFirmasEnviadas.jsx");
}

