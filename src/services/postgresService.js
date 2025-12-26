const { Pool } = require('pg');

let pool;

function initPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set. Configure Postgres connection string in env var DATABASE_URL');

  pool = new Pool({ connectionString, ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false });
  pool.on('error', (err) => {
    console.error('Postgres pool error', err);
  });
  return pool;
}

async function query(text, params) {
  const p = initPool();
  return p.query(text, params);
}

module.exports = { initPool, query };
