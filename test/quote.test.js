import test from 'node:test';
import assert from 'node:assert/strict';
import { parseList, buildQuote } from '../lib/quote.js';

test('lê o formato do Copy list', () => {
  const { materials, invalid } = parseList("Artisan's Stone x60\nFine Log x1152\nSandpaper (Bound) x2304");

  assert.deepEqual(invalid, []);
  assert.deepEqual(materials, [
    { name: "Artisan's Stone", quantity: 60 },
    { name: 'Fine Log', quantity: 1152 },
    { name: 'Sandpaper (Bound)', quantity: 2304 },
  ]);
});

test('não confunde nomes com x e aceita × e separador de milhar', () => {
  const { materials } = parseList('Box x Lux ×1,152\r\nOdyle x 4.608');

  assert.deepEqual(materials, [
    { name: 'Box x Lux', quantity: 1152 },
    { name: 'Odyle', quantity: 4608 },
  ]);
});

test('soma nomes repetidos e separa linhas inválidas', () => {
  const { materials, invalid } = parseList('Odyle x10\nodyle x5\n\nsem quantidade\nZero x0');

  assert.deepEqual(materials, [{ name: 'Odyle', quantity: 15 }]);
  assert.deepEqual(invalid, ['sem quantidade', 'Zero x0']);
});

test('calcula preço unitário, total por item e total geral', () => {
  const quote = buildQuote(
    [{ name: 'odyle', quantity: 10 }, { name: 'Fine Odyle', quantity: 2 }],
    [
      { name: 'Odyle', price: 100, listed: true, listings: 5, sold_avg_price: 90 },
      { name: 'Fine Odyle', price: 250, listed: true, listings: 1 },
    ],
  );

  assert.equal(quote.lines[0].name, 'Odyle');
  assert.equal(quote.lines[0].unitPrice, 100);
  assert.equal(quote.lines[0].total, 1000);
  assert.equal(quote.lines[0].avgSalePrice, 90);
  assert.equal(quote.total, 1500);
  assert.deepEqual(quote.unpriced, []);
});

test('usa o último preço sem ofertas e deixa de fora o que não tem preço', () => {
  const quote = buildQuote(
    [{ name: 'Odyle', quantity: 2 }, { name: 'Sandpaper (Bound)', quantity: 3 }],
    [{ name: 'Odyle', price: null, last_price: 40, listed: false, listings: 0 }],
  );

  assert.equal(quote.total, 80);
  assert.deepEqual(quote.lastPriceOnly, ['Odyle']);
  assert.deepEqual(quote.unpriced, ['Sandpaper (Bound)']);
  assert.equal(quote.lines[1].total, null);
});

test('ignora itens do catálogo sem nome', () => {
  const quote = buildQuote(
    [{ name: 'Odyle', quantity: 2 }],
    [{ name: null, price: 1, listed: true }, { name: 'Odyle', price: 100, listed: true }],
  );

  assert.equal(quote.total, 200);
});

test('em nomes repetidos no catálogo usa o mais barato', () => {
  const quote = buildQuote(
    [{ name: 'Odyle', quantity: 1 }],
    [
      { name: 'Odyle', price: 300, listed: true },
      { name: 'Odyle', price: 200, listed: true },
    ],
  );

  assert.equal(quote.total, 200);
});
