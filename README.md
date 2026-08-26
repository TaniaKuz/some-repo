# Flower Shop API

A small REST API for a flower shop, built with **Node.js + Express 4**. It manages
two resources — **flowers** and **orders** — using an in-memory data store, so it
runs with no external database. The store lives behind a small module
(`src/store.js`) so it could be swapped for a real database later.

## Requirements

- Node.js 18+ (developed against Node 22)

## Install

```bash
npm install
```

## Run

```bash
npm start          # starts on PORT (default 3000)
# or
npm run dev        # same as start
```

Then:

```bash
curl http://localhost:3000/health
```

## Test

```bash
npm test
```

Tests use Jest + Supertest and reset the in-memory store before each test.

## Data model

**Flower**

```json
{
  "id": "uuid",
  "name": "Red Rose",
  "color": "red",
  "priceCents": 350,
  "stock": 120
}
```

**Order**

```json
{
  "id": "uuid",
  "items": [{ "flowerId": "uuid", "quantity": 2 }],
  "status": "confirmed",
  "totalCents": 700,
  "createdAt": "2026-08-26T00:00:00.000Z"
}
```

## Endpoints

| Method | Path                       | Description                                            |
| ------ | -------------------------- | ------------------------------------------------------ |
| GET    | `/health`                  | Health check → `{ "status": "ok" }`                    |
| GET    | `/api/flowers`             | List flowers. Optional `?color=` and `?inStock=true`.  |
| GET    | `/api/flowers/:id`         | Get one flower (404 if missing).                       |
| POST   | `/api/flowers`             | Create a flower (201 / 400).                           |
| PUT    | `/api/flowers/:id`         | Update a flower, partial body accepted (200/400/404).  |
| DELETE | `/api/flowers/:id`         | Delete a flower (204 / 404).                           |
| GET    | `/api/orders`              | List orders.                                           |
| GET    | `/api/orders/:id`          | Get one order (404 if missing).                        |
| POST   | `/api/orders`              | Place an order (201 / 400). All-or-nothing stock check.|
| POST   | `/api/orders/:id/cancel`   | Cancel an order and restock (200/400/404).             |

### Error shape

All validation and error responses use a consistent shape:

```json
{ "error": { "message": "Invalid flower payload", "details": ["priceCents is required and must be an integer >= 0"] } }
```

## curl examples

List flowers (and note an id for the examples below):

```bash
curl http://localhost:3000/api/flowers
curl "http://localhost:3000/api/flowers?color=red&inStock=true"
```

Create a flower:

```bash
curl -X POST http://localhost:3000/api/flowers \
  -H 'Content-Type: application/json' \
  -d '{"name":"Orchid","color":"purple","priceCents":900,"stock":15}'
```

Update a flower:

```bash
curl -X PUT http://localhost:3000/api/flowers/<FLOWER_ID> \
  -H 'Content-Type: application/json' \
  -d '{"priceCents":999}'
```

Delete a flower:

```bash
curl -X DELETE http://localhost:3000/api/flowers/<FLOWER_ID>
```

Place an order:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"flowerId":"<FLOWER_ID>","quantity":2}]}'
```

Cancel an order:

```bash
curl -X POST http://localhost:3000/api/orders/<ORDER_ID>/cancel
```

## API specification & Postman

- `openapi.yaml` — OpenAPI 3.0 spec describing every endpoint and schema.
- `postman_collection.json` — Postman v2.1 collection with a request per endpoint,
  using a `{{baseUrl}}` variable (default `http://localhost:3000`).

## Project layout

```
some-repo/
├── package.json
├── src/
│   ├── app.js            # builds and returns the Express app (no listen)
│   ├── server.js         # requires app, listens on process.env.PORT || 3000
│   ├── store.js          # in-memory store with seed data
│   ├── routes/
│   │   ├── flowers.js
│   │   └── orders.js
│   └── middleware/
│       └── errors.js     # notFound + errorHandler + validation error helpers
├── tests/
│   ├── flowers.test.js
│   └── orders.test.js
├── openapi.yaml
├── postman_collection.json
└── .gitignore
```
