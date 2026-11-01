import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../server.js';
import { createExchange } from '../lib/exchange.js';

const SERVERS = [
  { server_id: 12306, name: 'Azphel', region_name: 'Europe', faction: 'Asmodian' },
];
const ITEMS = Array.from({ length: 450 }, (_, i) => ({ name: `Filler ${i}`, price: 1, listed: true }));
ITEMS[420] = { name: 'Odyle', price: 100, listed: true, listings: 7, sold_avg_price: 95 };

const calls = [];
const mock = createServer((req, res) => {
  const url = new URL(req.url, 'http://mock');
  calls.push({ path: url.pathname, query: url.searchParams, agent: req.headers['user-agent'] });
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/servers') return res.end(JSON.stringify({ servers: SERVERS }));

  const offset = Number(url.searchParams.get('offset'));
  const limit = Number(url.searchParams.get('limit'));
  res.end(JSON.stringify({ total: ITEMS.length, items: ITEMS.slice(offset, offset + limit) }));
});

let app;
let baseUrl;

before(async () => {
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  const iconLookup = {
    getIcons: async (names) => new Map(names.map((name) => [name, `https://cdn.example/${name}.png`])),
  };
  app = createApp(createExchange(`http://127.0.0.1:${mock.address().port}`), iconLookup);
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${app.address().port}`;
});

after(() => {
  app.close();
  mock.close();
});

const quote = (body) => fetch(`${baseUrl}/api/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('pagina o catálogo, calcula o total e usa o cache na segunda chamada', async () => {
  const response = await quote({ server: 12306, item: ' Arco ', list: 'Odyle x3\nSandpaper (Bound) x2' });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.total, 300);
  assert.deepEqual(body.unpriced, ['Sandpaper (Bound)']);
  assert.equal(body.lines[1].icon, 'https://cdn.example/Sandpaper (Bound).png');
  assert.deepEqual(body.item, { name: 'Arco', icon: 'https://cdn.example/Arco.png' });

  const pages = calls.filter((call) => call.path === '/api/items');
  assert.equal(pages.length, 3);
  assert.equal(pages[0].query.get('server'), '12306');
  assert.match(pages[0].agent, /^KinahCraft/);

  await quote({ server: 12306, list: 'Odyle x1' });
  assert.equal(calls.filter((call) => call.path === '/api/items').length, 3);
});

test('recusa servidor inválido e lista vazia', async () => {
  assert.equal((await quote({ server: 1, list: 'Odyle x1' })).status, 400);
  assert.equal((await quote({ server: 12306, list: 'nada aqui' })).status, 400);
});

test('entrega a página inicial', async () => {
  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /KinahCraft/);
});
