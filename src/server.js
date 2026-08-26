'use strict';

const createApp = require('./app');

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Flower shop API listening on port ${port}`);
});
