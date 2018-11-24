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

  api.get('/invoice', async (req, res) => {
    // REST endpoint accepts full amount and RSK address
    // Respond with LN invoice for small gas amount and
    // respond with RSK signature

    res.json(
      await getInvoice(req.query.amount, req.query.address),
    );
  });


  return api;
};
