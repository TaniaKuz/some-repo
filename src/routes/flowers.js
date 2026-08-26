'use strict';

const express = require('express');
const store = require('../store');
const { validationError, notFoundError } = require('../middleware/errors');

const router = express.Router();

/**
 * Validate a flower payload.
 * @param {object} body
 * @param {boolean} partial when true, only validate provided fields (for PUT)
 * @returns {Array<string>} list of validation error messages (empty if valid)
 */
function validateFlower(body, partial) {
  const details = [];
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }

  // name
  if (!partial || has('name')) {
    if (!has('name') || typeof body.name !== 'string' || body.name.trim() === '') {
      details.push('name is required and must be a non-empty string');
    }
  }

  // color (optional, but if present must be a string)
  if (has('color') && body.color !== null && typeof body.color !== 'string') {
    details.push('color must be a string');
  }

  // priceCents
  if (!partial || has('priceCents')) {
    if (!has('priceCents') || !Number.isInteger(body.priceCents) || body.priceCents < 0) {
      details.push('priceCents is required and must be an integer >= 0');
    }
  }

  // stock
  if (!partial || has('stock')) {
    if (!has('stock') || !Number.isInteger(body.stock) || body.stock < 0) {
      details.push('stock is required and must be an integer >= 0');
    }
  }

  return details;
}

// GET /api/flowers — list, with optional ?color= and ?inStock=true filters.
router.get('/', (req, res) => {
  const filters = {};
  if (req.query.color !== undefined) {
    filters.color = req.query.color;
  }
  if (req.query.inStock !== undefined) {
    filters.inStock = req.query.inStock === 'true';
  }
  res.json(store.listFlowers(filters));
});

// GET /api/flowers/:id
router.get('/:id', (req, res, next) => {
  const flower = store.getFlower(req.params.id);
  if (!flower) return next(notFoundError(`Flower not found: ${req.params.id}`));
  res.json(flower);
});

// POST /api/flowers
router.post('/', (req, res, next) => {
  const body = req.body || {};
  const details = validateFlower(body, false);
  if (details.length > 0) {
    return next(validationError('Invalid flower payload', details));
  }
  const flower = store.createFlower({
    name: body.name,
    color: body.color,
    priceCents: body.priceCents,
    stock: body.stock,
  });
  res.status(201).json(flower);
});

// PUT /api/flowers/:id — accepts a partial body.
router.put('/:id', (req, res, next) => {
  const body = req.body || {};
  const details = validateFlower(body, true);
  if (details.length > 0) {
    return next(validationError('Invalid flower payload', details));
  }
  const updated = store.updateFlower(req.params.id, body);
  if (!updated) return next(notFoundError(`Flower not found: ${req.params.id}`));
  res.json(updated);
});

// DELETE /api/flowers/:id
router.delete('/:id', (req, res, next) => {
  const deleted = store.deleteFlower(req.params.id);
  if (!deleted) return next(notFoundError(`Flower not found: ${req.params.id}`));
  res.status(204).send();
});

module.exports = router;
