const { Pool } = require('pg');
const { databaseUrl, nodeEnv } = require('./env');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
