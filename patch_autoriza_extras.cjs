const fs = require('fs');
const file = 'C:/proyectos/femase-api/src/autoriza_horas_extras/autoriza_horas_extras.service.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Declare marcaColacion
content = content.replace(
    'let colacionTeoricaStr: string | null = null;',
    'let colacionTeoricaStr: string | null = null;\n    let marcaColacion: boolean = true;'
);

// 2. Assign for turnoNormal
content = content.replace(
    /horaSalidaTeorica = turnoNormal\.horario\.hora_salida;\s*colacionTeoricaStr = turnoNormal\.horario\.colacion;/,
    `horaSalidaTeorica = turnoNormal.horario.hora_salida;
      colacionTeoricaStr = turnoNormal.horario.colacion;
      marcaColacion = turnoNormal.horario.marca_colacion;`
);

// 3. Assign for turnoRotativo
content = content.replace(
    /horaSalidaTeorica = turnoRotativo\.horario\.hora_salida;\s*colacionTeoricaStr = turnoRotativo\.horario\.colacion;/,
    `horaSalidaTeorica = turnoRotativo.horario.hora_salida;
        colacionTeoricaStr = turnoRotativo.horario.colacion;
        marcaColacion = turnoRotativo.horario.marca_colacion;`
);

// 4. Subtract colacionDec if marcaColacion === false
content = content.replace(
    `horas_trabajadas -= totalGapsDec;`,
    `horas_trabajadas -= totalGapsDec;\n\n      if (marcaColacion === false) {\n        horas_trabajadas -= colacionDec;\n      }\n      if (horas_trabajadas < 0) horas_trabajadas = 0;`
);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched autoriza_horas_extras.service.ts");
