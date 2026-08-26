'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const store = require('../src/store');

const app = createApp();

beforeEach(() => {
  store.reset();
});

describe('Flowers API', () => {
  describe('GET /api/flowers', () => {
    it('lists all seeded flowers', async () => {
      const res = await request(app).get('/api/flowers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('priceCents');
    });

    it('filters by color', async () => {
      const res = await request(app).get('/api/flowers?color=red');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Red Rose');
    });

    it('filters by inStock=true', async () => {
      // Set one flower's stock to 0, then confirm it is excluded.
      const all = (await request(app).get('/api/flowers')).body;
      await request(app).put(`/api/flowers/${all[0].id}`).send({ stock: 0 });
      const res = await request(app).get('/api/flowers?inStock=true');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
      expect(res.body.every((f) => f.stock > 0)).toBe(true);
    });
  });

  describe('GET /api/flowers/:id', () => {
    it('returns a single flower', async () => {
      const all = (await request(app).get('/api/flowers')).body;
      const res = await request(app).get(`/api/flowers/${all[0].id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(all[0].id);
    });

    it('returns 404 for a missing flower', async () => {
      const res = await request(app).get('/api/flowers/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty('message');
    });
  });

  describe('POST /api/flowers', () => {
    it('creates a flower and returns 201', async () => {
      const payload = { name: 'Orchid', color: 'purple', priceCents: 900, stock: 15 };
      const res = await request(app).post('/api/flowers').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(payload);
      expect(res.body).toHaveProperty('id');

      const list = (await request(app).get('/api/flowers')).body;
      expect(list.length).toBe(5);
    });

    it('rejects missing required fields with 400 and details', async () => {
      const res = await request(app).post('/api/flowers').send({ color: 'blue' });
      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('message');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('rejects invalid types with 400', async () => {
      const res = await request(app)
        .post('/api/flowers')
        .send({ name: 'Bad', priceCents: -5, stock: 1.5 });
      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d) => d.includes('priceCents'))).toBe(true);
      expect(res.body.error.details.some((d) => d.includes('stock'))).toBe(true);
    });
  });

  describe('PUT /api/flowers/:id', () => {
    it('applies a partial update', async () => {
      const all = (await request(app).get('/api/flowers')).body;
      const res = await request(app)
        .put(`/api/flowers/${all[0].id}`)
        .send({ priceCents: 999 });
      expect(res.status).toBe(200);
      expect(res.body.priceCents).toBe(999);
      // Untouched fields are preserved.
      expect(res.body.name).toBe(all[0].name);
    });

    it('returns 404 for a missing flower', async () => {
      const res = await request(app).put('/api/flowers/nope').send({ priceCents: 100 });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid fields', async () => {
      const all = (await request(app).get('/api/flowers')).body;
      const res = await request(app)
        .put(`/api/flowers/${all[0].id}`)
        .send({ stock: -1 });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/flowers/:id', () => {
    it('deletes and returns 204', async () => {
      const all = (await request(app).get('/api/flowers')).body;
      const res = await request(app).delete(`/api/flowers/${all[0].id}`);
      expect(res.status).toBe(204);

      const after = (await request(app).get('/api/flowers')).body;
      expect(after.length).toBe(3);
    });

    it('returns 404 for a missing flower', async () => {
      const res = await request(app).delete('/api/flowers/nope');
      expect(res.status).toBe(404);
    });
  });
});
