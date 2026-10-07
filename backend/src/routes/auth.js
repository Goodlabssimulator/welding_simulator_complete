/**
 * Authentication Routes
 * 
 * Handles user registration, login, token refresh, and logout.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../utils/database');
const { generateAccessToken, generateRefreshToken, authenticate } = require('../middleware/authMiddleware');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, institution, studentId, cohort } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Missing required fields: email, password, firstName, lastName', 400, 'VALIDATION_ERROR');
    }
    
    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new AppError('An account with this email already exists', 409, 'DUPLICATE');
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, institution, student_id, cohort)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), passwordHash, firstName, lastName, role || 'student', institution, studentId, cohort]
    );
    
    const user = result.rows[0];
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );
    
    res.status(201).json({
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }
    
    // Find user
    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DISABLED');
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    
    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshTokenHash]
    );
    
    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    
    res.json({
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token required', 400, 'NO_TOKEN');
    }
    
    // Verify refresh token
    const jwt = require('jsonwebtoken');
    const config = require('../../config/env');
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    
    // Find valid refresh token in DB
    const result = await query(
      'SELECT id, user_id FROM refresh_tokens WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH');
    }
    
    // Get user
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    const user = userResult.rows[0];
    
    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.role);
    
    res.json({
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
      tokens: { accessToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/logout
 * Revoke refresh token
 */
router.delete('/logout', authenticate, async (req, res, next) => {
  try {
    await query(
      'UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});
/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, institution, student_id, cohort, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        institution: user.institution,
        studentId: user.student_id,
        cohort: user.cohort,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
