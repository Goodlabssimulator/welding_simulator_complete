/**
 * Database Connection Pool Manager
 * 
 * Uses pg (node-postgres) to manage PostgreSQL connections.
 * Provides connection pooling and query helpers.
 */

const { Pool } = require('pg');
const config = require('../../config/env');

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,                  // Maximum pool connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

// Handle pool-level errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a parameterized SQL query
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function receiving a client
 * @returns {Promise} Transaction result
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for manual control
 * @returns {Promise} Pool client
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, transaction, getClient };
