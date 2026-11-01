import { normalize } from './quote.js';

const SEARCH_PATH = '/aion2_tw/v2.0/dict/search/item';
const SEARCH_SIZE = 100;
const REQUEST_DELAY_MS = 200;
const USER_AGENT = 'KinahCraft/1.0 (ferramenta pessoal)';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Busca a imagem pelo nome no dicionário oficial; serve também para itens fora do mercado. */
export function createIconLookup(baseUrl) {
  const icons = new Map();

  async function fetchIcon(name) {
    const query = new URLSearchParams({
      searchKeyword: name,
      page: 1,
      size: SEARCH_SIZE,
      locale: 'en-US',
    });
    const response = await fetch(`${baseUrl}${SEARCH_PATH}?${query}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`dicionário respondeu ${response.status}`);

    const { contents } = await response.json();
    const match = contents.find((item) => normalize(item.name) === normalize(name));
    return match?.image ?? null;
  }

  return {
    /** Sem imagem o orçamento continua válido, então uma falha aqui nunca derruba o cálculo. */
    async getIcons(names) {
      const missing = names.filter((name) => !icons.has(normalize(name)));

      for (const [position, name] of missing.entries()) {
        if (position > 0) await wait(REQUEST_DELAY_MS);
        try {
          icons.set(normalize(name), await fetchIcon(name));
        } catch (error) {
          console.warn(`Imagem de "${name}" indisponível: ${error.message}`);
        }
      }

      return new Map(names.map((name) => [name, icons.get(normalize(name)) ?? null]));
    },
  };
}
