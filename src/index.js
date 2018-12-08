import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';

import { port } from './config';

import {
  getSwapConfig,
  createSwap,
  getSwapStatus,
} from './controller';

const app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

// middleware
app.use(cors());
app.use(bodyParser.json());

app.get('/info', async (req, res) => {
  res.json(await getSwapConfig());
});

app.post('/swap', async (req, res, next) => {
  try {
    res.json(await createSwap(req.body));
  } catch (e) {
    next(e);
  }
});

app.get('/swap', async (req, res, next) => {
  try {
    res.json(await getSwapStatus(req.query));
  } catch (e) {
    next(e);
  }
});

// handle errors
app.use((err, req, res) => {
  res.status(err.statusCode || 500).send({ error: err.message });
});

app.server.listen(process.env.PORT || port, () => {
  console.log(`Started on port http://localhost:${app.server.address().port}`);
});
