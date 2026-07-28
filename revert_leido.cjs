const fs = require('fs');

// 1. Remove leido from Documento.entity.ts
const docEntityPath = 'C:/proyectos/femase-api/src/documento/entities/documento.entity.ts';
if (fs.existsSync(docEntityPath)) {
    let docEntityContent = fs.readFileSync(docEntityPath, 'utf8');
    docEntityContent = docEntityContent.replace(/\s*@Column\(\)\s*leido:\s*boolean/g, '');
    fs.writeFileSync(docEntityPath, docEntityContent, 'utf8');
    console.log("Reverted leido from Documento.entity.ts");
}
