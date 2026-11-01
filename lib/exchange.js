const PAGE_SIZE = 200;
const PAGE_DELAY_MS = 300;
const CATALOG_TTL_MS = 15 * 60 * 1000;
const SERVERS_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = 'KinahCraft/1.0 (ferramenta pessoal)';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Cliente do aion2.exchange: é mantido por uma pessoa, então pede pouco e guarda em cache. */
export function createExchange(baseUrl) {
  const catalogs = new Map();
  let servers = null;

  async function getJson(path) {
    const response = await fetch(baseUrl + path, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`aion2.exchange respondeu ${response.status} em ${path}`);
    return response.json();
  }

  async function fetchCatalog(serverId) {
    const items = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      if (offset > 0) await wait(PAGE_DELAY_MS);
      const page = await getJson(
        `/api/items?server=${serverId}&limit=${PAGE_SIZE}&offset=${offset}&window=24h`,
      );
      items.push(...page.items);
      if (!page.items.length || items.length >= page.total) return items;
    }
  }

  return {
    async getServers() {
      if (servers && Date.now() < servers.expires) return servers.list;
      const { servers: list } = await getJson('/api/servers');
      servers = { list, expires: Date.now() + SERVERS_TTL_MS };
      return list;
    },

    /** Requisições simultâneas ao mesmo servidor compartilham a mesma busca. */
    getCatalog(serverId) {
      const cached = catalogs.get(serverId);
      if (cached && Date.now() < cached.expires) return cached.promise;

      const promise = fetchCatalog(serverId);
      catalogs.set(serverId, { promise, expires: Date.now() + CATALOG_TTL_MS });
      promise.catch(() => catalogs.delete(serverId));
      return promise;
    },
  };
}
