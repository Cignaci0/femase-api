const fs = require('fs');
const glob = require('glob');
const path = require('path');

const auditUtilsPath = 'c:/proyectos/api-femase-fmc/src/utils/audit.utils.ts';
let auditContent = fs.readFileSync(auditUtilsPath, 'utf8');
if (!auditContent.includes('cloneEntity')) {
  auditContent += '\nexport const cloneEntity = (entity: any) => {\n  if (!entity) return entity;\n  const clone = { ...entity };\n  for (const key in clone) {\n    if (clone[key] && typeof clone[key] === \'object\' && !(clone[key] instanceof Date)) {\n      clone[key] = { ...clone[key] };\n    }\n  }\n  return clone;\n};\n';
  fs.writeFileSync(auditUtilsPath, auditContent);
}

const files = glob.sync('c:/proyectos/api-femase-fmc/src/**/*.service.ts');
let updated = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('generarTextoCambios')) {
    let original = content;
    
    // Add import if needed
    if (content.includes('audit.utils') && !content.includes('cloneEntity')) {
      content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]src\/utils\/audit\.utils['"];/, (match, p1) => {
        return `import { ${p1.trim()}, cloneEntity } from 'src/utils/audit.utils';`;
      });
    }

    // Replace the shallow copies
    // Pattern: const variableAntiguo = { ...variable };
    content = content.replace(/const\s+(\w+Antigu[oa])\s*=\s*\{\s*\.\.\.(\w+)\s*\};/g, 'const $1 = cloneEntity($2);');

    if (content !== original) {
      fs.writeFileSync(file, content);
      updated++;
      console.log('Updated', path.basename(file));
    }
  }
});
console.log('Total files updated:', updated);
