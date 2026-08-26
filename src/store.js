'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * In-memory data store for the flower shop.
 *
 * This module holds all application state in plain JavaScript Maps. The public
 * functions form a small data-access layer so that the persistence mechanism
 * could later be swapped for a real database without changing the route code.
 */

// Internal state.
let flowers = new Map();
let orders = new Map();

/**
 * Seed data used on startup and to reset state between tests.
 * @returns {Array<object>} freshly-built sample flowers
 */
function buildSeedFlowers() {
  return [
    { id: uuidv4(), name: 'Red Rose', color: 'red', priceCents: 350, stock: 120 },
    { id: uuidv4(), name: 'White Tulip', color: 'white', priceCents: 200, stock: 80 },
    { id: uuidv4(), name: 'Yellow Sunflower', color: 'yellow', priceCents: 500, stock: 40 },
    { id: uuidv4(), name: 'Pink Peony', color: 'pink', priceCents: 750, stock: 25 },
  ];
}

/**
 * Reset the store to its seeded initial state. Used by tests via beforeEach and
 * on server startup.
 */
function reset() {
  flowers = new Map();
  orders = new Map();
  for (const flower of buildSeedFlowers()) {
    flowers.set(flower.id, flower);
  }
}

// Alias so callers can use either name.
const seed = reset;

/* ----------------------------- Flowers ----------------------------- */

/**
 * List all flowers, optionally filtered.
 * @param {{ color?: string, inStock?: boolean }} [filters]
 * @returns {Array<object>}
 */
function listFlowers(filters = {}) {
  let result = Array.from(flowers.values());
  if (filters.color !== undefined) {
    const wanted = String(filters.color).toLowerCase();
    result = result.filter((f) => (f.color || '').toLowerCase() === wanted);
  }
  if (filters.inStock === true) {
    result = result.filter((f) => f.stock > 0);
  }
  return result;
}

/**
 * @param {string} id
 * @returns {object|undefined}
 */
function getFlower(id) {
  return flowers.get(id);
}

/**
 * Create a flower. The caller is responsible for validation.
 * @param {{ name: string, color?: string, priceCents: number, stock: number }} data
 * @returns {object} the created flower
 */
function createFlower(data) {
  const flower = {
    id: uuidv4(),
    name: data.name,
    color: data.color !== undefined ? data.color : null,
    priceCents: data.priceCents,
    stock: data.stock,
  };
  flowers.set(flower.id, flower);
  return flower;
}

/**
 * Apply a partial update to an existing flower.
 * @param {string} id
 * @param {object} updates
 * @returns {object|undefined} updated flower, or undefined if not found
 */
function updateFlower(id, updates) {
  const existing = flowers.get(id);
  if (!existing) return undefined;
  const allowed = ['name', 'color', 'priceCents', 'stock'];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      existing[key] = updates[key];
    }
  }
  flowers.set(id, existing);
  return existing;
}

/**
 * @param {string} id
 * @returns {boolean} true if a flower was deleted
 */
function deleteFlower(id) {
  return flowers.delete(id);
}

/* ----------------------------- Orders ----------------------------- */

/**
 * @returns {Array<object>}
 */
function listOrders() {
  return Array.from(orders.values());
}

/**
 * @param {string} id
 * @returns {object|undefined}
 */
function getOrder(id) {
  return orders.get(id);
}

/**
 * Persist an already-constructed order object.
 * @param {object} order
 * @returns {object}
 */
function saveOrder(order) {
  orders.set(order.id, order);
  return order;
}

// Seed on first load.
reset();

module.exports = {
  reset,
  seed,
  listFlowers,
  getFlower,
  createFlower,
  updateFlower,
  deleteFlower,
  listOrders,
  getOrder,
  saveOrder,
  // Exposed so orders logic can generate ids consistently.
  uuidv4,
};
