/**
 * SplitBuddy – Error Handler Middleware
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details    = details;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${statusCode}`, err.message);

  res.status(statusCode).json({
    error:   err.message || 'Internal server error',
    details: isDev ? err.details || err.stack : undefined,
    code:    err.code || undefined,
  });
};

// Wraps async route handlers so errors propagate to errorHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validation helper
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map(d => d.message);
    return res.status(400).json({ error: 'Validation failed', details });
  }
  next();
};

module.exports = { AppError, errorHandler, asyncHandler, validate };
