const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'femase',
  password: 'superadmin',
  port: 5432,
});

async function syncDb() {
  await client.connect();
  try {
    // 1. Rename column in horas_compensacion
    await client.query(`ALTER TABLE db_fmc.horas_compensacion RENAME COLUMN id_empelado TO empleado_id;`);
    console.log("Renamed id_empelado to empleado_id");
  } catch(e) { console.log(e.message); }

  try {
    // Alter periodo to varchar
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ALTER COLUMN periodo TYPE varchar(7);`);
    console.log("Altered periodo to varchar");
  } catch(e) { console.log(e.message); }

  try {
    // Alter time columns to varchar to match entity
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ALTER COLUMN horas_extras TYPE varchar(10);`);
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ALTER COLUMN horas_pagas TYPE varchar(10);`);
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ALTER COLUMN horas_compensacion TYPE varchar(10);`);
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ALTER COLUMN horas_compensacion_consumidas TYPE varchar(10);`);
    console.log("Altered time columns to varchar");
  } catch(e) { console.log(e.message); }

  try {
    // Add new columns to horas_compensacion
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ADD COLUMN IF NOT EXISTS notificado_vencimiento boolean DEFAULT false;`);
    await client.query(`ALTER TABLE db_fmc.horas_compensacion ADD COLUMN IF NOT EXISTS procesado_pago_vencido boolean DEFAULT false;`);
    console.log("Added notification and payment columns to horas_compensacion");
  } catch(e) { console.log(e.message); }

  try {
    // 2. Create solicitud_horas_compensacion
    await client.query(`
      CREATE TABLE IF NOT EXISTS db_fmc.solicitud_horas_compensacion (
        id SERIAL PRIMARY KEY,
        empleado_id INT NOT NULL,
        fecha_solicitada DATE NOT NULL,
        horas_solicitadas VARCHAR(10) DEFAULT '00:00:00',
        hora_inicio TIME,
        hora_fin TIME,
        estado VARCHAR(1) DEFAULT 'P',
        observacion VARCHAR(255),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_empleado FOREIGN KEY (empleado_id) REFERENCES db_fmc.empleado(empleado_id)
      );
    `);
    console.log("Created solicitud_horas_compensacion");
  } catch(e) { console.log(e.message); }
  
  await client.end();
}

syncDb();
