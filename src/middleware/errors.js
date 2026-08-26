'use strict';

/**
 * A typed error carrying an HTTP status code plus optional structured details.
 * Thrown by route handlers and rendered by the central error handler into the
 * consistent `{ error: { message, details? } }` response shape.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Array<any>} [details]
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Helper to build a 400 validation error.
 * @param {string} message
 * @param {Array<any>} [details] per-field messages
 * @returns {ApiError}
 */
function validationError(message, details) {
  return new ApiError(400, message, details);
}

/**
 * Helper to build a 404 not-found error.
 * @param {string} message
 * @returns {ApiError}
 */
function notFoundError(message) {
  return new ApiError(404, message);
}

/**
 * Express middleware for unmatched routes.
 */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error-handling middleware. Must keep the 4-arg signature so Express
 * treats it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;

  // Handle malformed JSON bodies from express.json().
  let message = err.message || 'Internal Server Error';
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON in request body' } });
  }

  const body = { error: { message } };
  if (err.details !== undefined) {
    body.error.details = err.details;
  }
  if (statusCode === 500) {
    body.error.message = 'Internal Server Error';
  }
  res.status(statusCode).json(body);
}

module.exports = {
  ApiError,
  validationError,
  notFoundError,
  notFound,
  errorHandler,
};
