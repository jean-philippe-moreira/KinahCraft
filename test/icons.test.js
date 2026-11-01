import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createIconLookup } from '../lib/icons.js';

const ICON = 'https://cdn.example/odyle.png';
const searches = [];
let failing = false;

const mock = createServer((req, res) => {
  const url = new URL(req.url, 'http://mock');
  searches.push(url.searchParams.get('searchKeyword'));

  if (failing) {
    res.statusCode = 500;
    return res.end('{}');
  }

  res.end(JSON.stringify({
    contents: [
      { name: 'Fine Odyle', image: 'https://cdn.example/fine.png' },
      { name: 'Odyle', image: ICON },
    ],
  }));
});

let baseUrl;

before(async () => {
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${mock.address().port}`;
});

after(() => mock.close());

beforeEach(() => {
  searches.length = 0;
  failing = false;
});

test('usa só o nome exato e não repete a busca', async () => {
  const lookup = createIconLookup(baseUrl);

  assert.equal((await lookup.getIcons(['odyle'])).get('odyle'), ICON);
  await lookup.getIcons(['odyle']);
  assert.deepEqual(searches, ['odyle']);
});

test('devolve vazio quando o nome não existe', async () => {
  const icons = await createIconLookup(baseUrl).getIcons(['Inexistente']);

  assert.equal(icons.get('Inexistente'), null);
});

test('uma falha não quebra o cálculo e permite tentar de novo', async () => {
  const lookup = createIconLookup(baseUrl);

  failing = true;
  assert.equal((await lookup.getIcons(['Odyle'])).get('Odyle'), null);

  failing = false;
  assert.equal((await lookup.getIcons(['Odyle'])).get('Odyle'), ICON);
});
