import { Router } from 'express';
import { version } from '../../package.json';

export default () => {
  const api = Router();

  api.get('/', (req, res) => {
    res.json({ version });
  });

  api.get('/hello', (req, res) => {
    res.json({ text: 'Hello World' });
  });

  // fill me out

  return api;
};
