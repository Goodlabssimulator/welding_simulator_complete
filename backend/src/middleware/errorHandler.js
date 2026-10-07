/**
 * Global Error Handler Middleware
 * 
 * Centralizes error handling with consistent response format.
 * Includes error logging and development vs production details.
 */

const config = require('../../config/env');

/**
 * Custom application error with HTTP status code
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  
  // PostgreSQL errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this data already exists';
    code = 'DUPLICATE';
  }
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record not found';
    code = 'FK_VIOLATION';
  }
  
  // Joi validation errors
  if (err.isJoi) {
    statusCode = 400;
    message = err.details.map(d => d.message).join('; ');
    code = 'VALIDATION_ERROR';
  }
  
  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      code,
      message,
      stack: err.stack,
    });
  }
  
  // Response
  res.status(statusCode).json({
    error: message,
    code,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler, AppError };
