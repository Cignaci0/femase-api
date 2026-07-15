const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'femase',
  password: 'superadmin',
  port: 5432,
});

async function checkData() {
  await client.connect();
  const res = await client.query("SELECT * FROM db_fmc.horas_compensacion");
  console.log(res.rows);
  await client.end();
}
checkData();
