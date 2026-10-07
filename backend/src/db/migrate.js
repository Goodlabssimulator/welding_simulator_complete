#!/usr/bin/env node
/**
 * Database migration runner.
 *
 * Usage:
 *   node src/db/migrate.js            # apply schema
 *   node src/db/migrate.js --reset    # DROP all tables first, then apply
 */

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const config = require('../../config/env');

const SCHEMA_PATH = path.resolve(__dirname, '../../../database/schema.sql');
const RESET_SQL = `
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO public;
`;

async function main() {
  const reset = process.argv.includes('--reset');

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    if (reset) {
      console.log('⚠️  --reset: dropping public schema...');
      await client.query(RESET_SQL);
    }

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log(`📄 Applying schema from: ${path.relative(process.cwd(), SCHEMA_PATH)}`);
    await client.query(schema);
    console.log('✅ Schema applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
