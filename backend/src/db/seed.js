#!/usr/bin/env node
/**
 * Database seeder.
 *
 * Creates default admin/trainer/student accounts.
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   node src/db/seed.js
 *
 * Default credentials (CHANGE IN PRODUCTION):
 *   admin@weldsim.local   / Admin@12345
 *   trainer@weldsim.local / Trainer@12345
 *   student@weldsim.local / Student@12345
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const config = require('../../config/env');

const USERS = [
  {
    email: 'admin@weldsim.local',
    password: 'Admin@12345',
    firstName: 'System',
    lastName: 'Admin',
    role: 'admin',
  },
  {
    email: 'trainer@weldsim.local',
    password: 'Trainer@12345',
    firstName: 'Default',
    lastName: 'Trainer',
    role: 'trainer',
    institution: 'TVET Demo',
  },
  {
    email: 'student@weldsim.local',
    password: 'Student@12345',
    firstName: 'Default',
    lastName: 'Student',
    role: 'student',
    institution: 'TVET Demo',
    studentId: 'STU-0001',
    cohort: '2025-A',
  },
];

async function main() {
  const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    console.log('🌱 Seeding users...');
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 12);

      const result = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, institution, student_id, cohort)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, role`,
        [
          u.email.toLowerCase(),
          hash,
          u.firstName,
          u.lastName,
          u.role,
          u.institution ?? null,
          u.studentId ?? null,
          u.cohort ?? null,
        ]
      );

      if (result.rowCount > 0) {
        console.log(`   ✅ Created: ${u.email} (${u.role})`);
      } else {
        console.log(`   ⏭️  Skipped (exists): ${u.email}`);
      }
    }
    console.log('✅ Seed complete.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
