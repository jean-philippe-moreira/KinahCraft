import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createExchange } from './lib/exchange.js';
import { createIconLookup } from './lib/icons.js';
import { parseList, buildQuote } from './lib/quote.js';

const MAX_BODY_BYTES = 64 * 1024;
const INDEX_PATH = new URL('./public/index.html', import.meta.url);

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) throw new Error('Lista grande demais');
  }
  return JSON.parse(body);
}

export function createApp(exchange, iconLookup) {
  return createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(await readFile(INDEX_PATH));
      }

      if (req.method === 'GET' && req.url === '/api/servers') {
        return sendJson(res, 200, await exchange.getServers());
      }

      if (req.method === 'POST' && req.url === '/api/quote') {
        const { server, list, item } = await readBody(req);
        const servers = await exchange.getServers();
        if (!servers.some((item) => item.server_id === server)) {
          return sendJson(res, 400, { error: 'Servidor inválido' });
        }

        const { materials, invalid } = parseList(String(list ?? ''));
        if (!materials.length) {
          return sendJson(res, 400, { error: 'Nenhum material encontrado na lista', invalid });
        }

        const itemName = String(item ?? '').trim();
        const names = materials.map((material) => material.name);
        const [catalog, icons] = await Promise.all([
          exchange.getCatalog(server),
          iconLookup.getIcons(itemName ? [...names, itemName] : names),
        ]);
        const quote = buildQuote(materials, catalog);
        const lines = quote.lines.map((line, position) => ({
          ...line,
          icon: icons.get(materials[position].name),
        }));
        const summary = itemName ? { name: itemName, icon: icons.get(itemName) } : null;
        return sendJson(res, 200, { ...quote, lines, invalid, item: summary });
      }

      sendJson(res, 404, { error: 'Não encontrado' });
    } catch (error) {
      console.error(error);
      sendJson(res, 502, { error: error.message });
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const exchange = createExchange(process.env.EXCHANGE_URL ?? 'https://aion2.exchange');
  const iconLookup = createIconLookup(process.env.DICTIONARY_URL ?? 'https://tw.ncsoft.com');
  createApp(exchange, iconLookup).listen(port, '127.0.0.1', () => {
    console.log(`Abra http://localhost:${port}`);
  });
}
