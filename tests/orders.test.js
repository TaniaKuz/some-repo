'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const store = require('../src/store');

const app = createApp();

beforeEach(() => {
  store.reset();
});

/** Helper to fetch the current flower list. */
async function getFlowers() {
  return (await request(app).get('/api/flowers')).body;
}

describe('Orders API', () => {
  describe('POST /api/orders', () => {
    it('places an order, decrements stock, and computes the total', async () => {
      const flowers = await getFlowers();
      const rose = flowers.find((f) => f.name === 'Red Rose');
      const tulip = flowers.find((f) => f.name === 'White Tulip');

      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            { flowerId: rose.id, quantity: 2 },
            { flowerId: tulip.id, quantity: 3 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('confirmed');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('id');
      // 2 * 350 + 3 * 200 = 1300
      expect(res.body.totalCents).toBe(2 * rose.priceCents + 3 * tulip.priceCents);

      const after = await getFlowers();
      expect(after.find((f) => f.id === rose.id).stock).toBe(rose.stock - 2);
      expect(after.find((f) => f.id === tulip.id).stock).toBe(tulip.stock - 3);
    });

    it('rejects insufficient stock with 400 and leaves stock unchanged', async () => {
      const flowers = await getFlowers();
      const peony = flowers.find((f) => f.name === 'Pink Peony'); // stock 25
      const rose = flowers.find((f) => f.name === 'Red Rose');

      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            { flowerId: rose.id, quantity: 1 },
            { flowerId: peony.id, quantity: peony.stock + 100 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.details.some((d) => d.includes('insufficient stock'))).toBe(true);

      // All-or-nothing: even the valid rose item did not decrement.
      const after = await getFlowers();
      expect(after.find((f) => f.id === rose.id).stock).toBe(rose.stock);
      expect(after.find((f) => f.id === peony.id).stock).toBe(peony.stock);
      // No order was created.
      const orders = (await request(app).get('/api/orders')).body;
      expect(orders.length).toBe(0);
    });

    it('rejects an item referencing an unknown flower with 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ flowerId: 'ghost', quantity: 1 }] });
      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d) => d.includes('not found'))).toBe(true);
    });

    it('rejects an empty or missing items array with 400', async () => {
      const res1 = await request(app).post('/api/orders').send({ items: [] });
      expect(res1.status).toBe(400);
      const res2 = await request(app).post('/api/orders').send({});
      expect(res2.status).toBe(400);
    });

    it('rejects invalid quantity with 400', async () => {
      const flowers = await getFlowers();
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ flowerId: flowers[0].id, quantity: 0 }] });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('lists orders', async () => {
      const flowers = await getFlowers();
      await request(app)
        .post('/api/orders')
        .send({ items: [{ flowerId: flowers[0].id, quantity: 1 }] });
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('returns a single order', async () => {
      const flowers = await getFlowers();
      const created = (
        await request(app)
          .post('/api/orders')
          .send({ items: [{ flowerId: flowers[0].id, quantity: 1 }] })
      ).body;
      const res = await request(app).get(`/api/orders/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
    });

    it('returns 404 for a missing order', async () => {
      const res = await request(app).get('/api/orders/nope');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('cancels an order and restocks flowers', async () => {
      const flowers = await getFlowers();
      const rose = flowers.find((f) => f.name === 'Red Rose');

      const created = (
        await request(app)
          .post('/api/orders')
          .send({ items: [{ flowerId: rose.id, quantity: 5 }] })
      ).body;

      // Stock decremented.
      let after = await getFlowers();
      expect(after.find((f) => f.id === rose.id).stock).toBe(rose.stock - 5);

      const res = await request(app).post(`/api/orders/${created.id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');

      // Stock restored.
      after = await getFlowers();
      expect(after.find((f) => f.id === rose.id).stock).toBe(rose.stock);
    });

    it('returns 400 when cancelling an already-cancelled order', async () => {
      const flowers = await getFlowers();
      const created = (
        await request(app)
          .post('/api/orders')
          .send({ items: [{ flowerId: flowers[0].id, quantity: 1 }] })
      ).body;
      await request(app).post(`/api/orders/${created.id}/cancel`);
      const res = await request(app).post(`/api/orders/${created.id}/cancel`);
      expect(res.status).toBe(400);
    });

    it('returns 404 when cancelling a missing order', async () => {
      const res = await request(app).post('/api/orders/nope/cancel');
      expect(res.status).toBe(404);
    });
  });
});
