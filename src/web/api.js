import { version } from '../../package.json';
import { Router } from 'express';

export default ({ config, db }) => {
	let api = Router();

	api.get('/', (req, res) => {
		res.json({ version });
	});

	api.get('/hello', (req, res) => {
		res.json({ text: 'Hello World' });
	});

	// fill me out

	return api;
}
