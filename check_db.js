const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'femase',
  password: 'superadmin',
  port: 5432,
});
client.connect();
client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'horas_compensacion' AND table_schema = 'db_fmc'", (err, res) => {
  console.log('--- horas_compensacion ---');
  console.log(err ? err.stack : res.rows);
  
  client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'solicitud_horas_compensacion' AND table_schema = 'db_fmc'", (err2, res2) => {
    console.log('--- solicitud_horas_compensacion ---');
    console.log(err2 ? err2.stack : res2.rows);
    client.end();
  });
});
