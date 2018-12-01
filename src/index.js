import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';

import { port } from '../config.json';

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

// TODO message validation middelware

app.get('/info', (req, res) => {
  res.json(getSwapConfig());
});

app.post('/swap', async (req, res) => {
  res.json(await createSwap(req.body));
});

app.get('/swap', async (req, res) => {
  res.json(await getSwapStatus(req.query));
});

app.server.listen(process.env.PORT || port, () => {
  console.log(`Started on port http://localhost:${app.server.address().port}`);
});
