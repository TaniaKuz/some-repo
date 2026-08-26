'use strict';

const express = require('express');
const flowersRouter = require('./routes/flowers');
const ordersRouter = require('./routes/orders');
const { notFound, errorHandler } = require('./middleware/errors');

/**
 * Build and return the Express application. Does not call listen(), so the same
 * app instance can be used by the HTTP server and by Supertest in tests.
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/flowers', flowersRouter);
  app.use('/api/orders', ordersRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
