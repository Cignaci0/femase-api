export const parseValue = (val: any): string => {
  if (val === null || val === undefined || val === '') return 'vacío';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'object') {
    const idField = Object.keys(val).find(k => k.endsWith('_id') || k === 'id');
    if (idField) return String(val[idField]);
    return JSON.stringify(val);
  }
  const strVal = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(strVal)) return strVal.split('T')[0];
  return strVal;
};

export const generarTextoCambios = (objetoAntiguo: any, objetoNuevo: any): string => {
  const cambiosAuditoria: string[] = [];
  
  for (const key of Object.keys(objetoNuevo)) {
    const valorAntiguo = parseValue(objetoAntiguo[key]);
    const valorNuevo = parseValue(objetoNuevo[key]);
    
    if (objetoNuevo[key] !== undefined && valorAntiguo !== valorNuevo) {
      cambiosAuditoria.push(`${key} (de '${valorAntiguo}' a '${valorNuevo}')`);
    }
  }

  return cambiosAuditoria.length > 0
    ? `Cambios realizados: ${cambiosAuditoria.join(', ')}.`
    : `No se registraron cambios en los datos.`;
};

export const cloneEntity = (entity: any) => {
  if (!entity) return entity;
  const clone = { ...entity };
  for (const key in clone) {
    if (clone[key] && typeof clone[key] === 'object' && !(clone[key] instanceof Date)) {
      clone[key] = { ...clone[key] };
    }
  }
  return clone;
};
