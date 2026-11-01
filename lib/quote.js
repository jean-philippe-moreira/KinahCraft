const LINE = /^(.+?)\s*[x×]\s*(\d[\d.,]*)$/i;

export const normalize = (name) => name.trim().toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ');

/** Lê linhas "Nome x60" (formato do "Copy list" do gamers4) e soma nomes repetidos. */
export function parseList(text) {
  const materials = new Map();
  const invalid = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(LINE);
    const quantity = match ? Number(match[2].replace(/[.,]/g, '')) : 0;
    if (!quantity) {
      invalid.push(line);
      continue;
    }

    const key = normalize(match[1]);
    const current = materials.get(key);
    if (current) current.quantity += quantity;
    else materials.set(key, { name: match[1].trim(), quantity });
  }

  return { materials: [...materials.values()], invalid };
}

/** Indexa o catálogo por nome; em nomes repetidos, fica a entrada com preço mais baixo. */
export function indexCatalog(items) {
  const index = new Map();
  for (const item of items) {
    if (!item.name) continue;
    const key = normalize(item.name);
    const current = index.get(key);
    if (!current || unitPrice(item).price < unitPrice(current).price) index.set(key, item);
  }
  return index;
}

function unitPrice(item) {
  if (item.listed !== false && item.price != null) return { price: item.price, source: 'listing' };
  if (item.last_price != null) return { price: item.last_price, source: 'last' };
  return { price: Infinity, source: 'none' };
}

/** Calcula preço unitário, total por material e total geral. */
export function buildQuote(materials, catalog) {
  const index = indexCatalog(catalog);

  const lines = materials.map(({ name, quantity }) => {
    const item = index.get(normalize(name));
    const { price, source } = item ? unitPrice(item) : { price: Infinity, source: 'none' };
    const priced = source !== 'none';

    return {
      name: item?.name ?? name,
      quantity,
      unitPrice: priced ? price : null,
      total: priced ? price * quantity : null,
      source,
      listings: item?.listings ?? null,
      avgSalePrice: item?.sold_avg_price ?? null,
    };
  });

  return {
    lines,
    total: lines.reduce((sum, line) => sum + (line.total ?? 0), 0),
    unpriced: lines.filter((line) => line.total == null).map((line) => line.name),
    lastPriceOnly: lines.filter((line) => line.source === 'last').map((line) => line.name),
  };
}
