import { Router } from 'express';
import { version } from '../../package.json';

import { getInvoice } from '../lnd/index';

export default () => {
  const api = Router();

  api.get('/', (req, res) => {
    res.json({ version });
  });

  api.get('/hello', (req, res) => {
    res.json({ text: 'Hello World' });
  });

  api.get('/invoice', (req, res) => {
    console.log(getInvoice());

    res.json({ text: 'invoice' });
  });

  // fill me out

  return api;
};
