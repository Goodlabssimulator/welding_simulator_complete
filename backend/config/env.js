/**
 * Environment configuration loader.
 *
 * Supports two modes:
 *   1. DATABASE_URL — single connection string (Neon, Render, Railway, etc.)
 *   2. Individual DB_* vars — for local dev
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root, regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(key) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;

module.exports = {
  // Server
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV,
  IS_PRODUCTION,

  // Database
  // If DATABASE_URL is set, individual DB_* vars become optional.
  // Otherwise, DB_PASSWORD (and others) are required.
  DATABASE_URL: process.env.DATABASE_URL || null,

  DB_HOST: process.env.DB_HOST || (HAS_DATABASE_URL ? '' : 'localhost'),
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || (HAS_DATABASE_URL ? '' : 'welding_simulator'),
  DB_USER: process.env.DB_USER || (HAS_DATABASE_URL ? '' : 'welding_admin'),
  DB_PASSWORD: HAS_DATABASE_URL
    ? (process.env.DB_PASSWORD || '')
    : required('DB_PASSWORD'),

  // JWT
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 100,
};
