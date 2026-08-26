'use strict';

const express = require('express');
const store = require('../store');
const { validationError, notFoundError } = require('../middleware/errors');

const router = express.Router();

/**
 * Validate the structural shape of an order's items array.
 * @param {any} items
 * @returns {Array<string>} validation messages
 */
function validateItemsShape(items) {
  const details = [];
  if (!Array.isArray(items) || items.length === 0) {
    return ['items is required and must be a non-empty array'];
  }
  items.forEach((item, i) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      details.push(`items[${i}] must be an object`);
      return;
    }
    if (typeof item.flowerId !== 'string' || item.flowerId.trim() === '') {
      details.push(`items[${i}].flowerId is required and must be a non-empty string`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      details.push(`items[${i}].quantity must be an integer >= 1`);
    }
  });
  return details;
}

// POST /api/orders — place an order (all-or-nothing).
router.post('/', (req, res, next) => {
  const body = req.body || {};
  const items = body.items;

  const shapeErrors = validateItemsShape(items);
  if (shapeErrors.length > 0) {
    return next(validationError('Invalid order payload', shapeErrors));
  }

  // Resolve flowers and check stock without mutating anything yet.
  const details = [];
  const resolved = [];
  for (let i = 0; i < items.length; i++) {
    const { flowerId, quantity } = items[i];
    const flower = store.getFlower(flowerId);
    if (!flower) {
      details.push(`items[${i}]: flower not found: ${flowerId}`);
      continue;
    }
    if (flower.stock < quantity) {
      details.push(
        `items[${i}]: insufficient stock for ${flower.name} (requested ${quantity}, available ${flower.stock})`
      );
      continue;
    }
    resolved.push({ flower, quantity });
  }

  if (details.length > 0) {
    // All-or-nothing: no stock has been changed.
    return next(validationError('Order could not be placed', details));
  }

  // Commit: decrement stock and compute total from current prices.
  let totalCents = 0;
  const orderItems = [];
  for (const { flower, quantity } of resolved) {
    flower.stock -= quantity;
    totalCents += flower.priceCents * quantity;
    orderItems.push({ flowerId: flower.id, quantity });
  }

  const order = {
    id: store.uuidv4(),
    items: orderItems,
    status: 'confirmed',
    totalCents,
    createdAt: new Date().toISOString(),
  };
  store.saveOrder(order);
  res.status(201).json(order);
});

// GET /api/orders
router.get('/', (req, res) => {
  res.json(store.listOrders());
});

// GET /api/orders/:id
router.get('/:id', (req, res, next) => {
  const order = store.getOrder(req.params.id);
  if (!order) return next(notFoundError(`Order not found: ${req.params.id}`));
  res.json(order);
});

// POST /api/orders/:id/cancel — cancel and restock.
router.post('/:id/cancel', (req, res, next) => {
  const order = store.getOrder(req.params.id);
  if (!order) return next(notFoundError(`Order not found: ${req.params.id}`));
  if (order.status === 'cancelled') {
    return next(validationError('Order is already cancelled'));
  }

  // Restock each item (skip flowers that may have been deleted since).
  for (const item of order.items) {
    const flower = store.getFlower(item.flowerId);
    if (flower) {
      flower.stock += item.quantity;
    }
  }
  order.status = 'cancelled';
  store.saveOrder(order);
  res.json(order);
});

module.exports = router;
