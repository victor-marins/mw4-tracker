import { createClient } from 'redis';

export interface Store {
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, values: Record<string, string>): Promise<void>;
  hSetNx(key: string, field: string, value: string): Promise<void>;
  hDel(key: string, fields: string[]): Promise<void>;
  lPush(key: string, values: string[]): Promise<void>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
  lTrim(key: string, start: number, stop: number): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const cache = globalThis as unknown as { __mw4Store?: Store };

export function getStore(): Store {
  if (cache.__mw4Store) return cache.__mw4Store;
  const url = process.env.KV_URL || process.env.REDIS_URL;
  if (url) {
    cache.__mw4Store = redisStore(url);
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('REDIS_URL/KV_URL não configurada');
  } else {
    console.warn('[store] REDIS_URL ausente: usando armazenamento em memória (somente dev)');
    cache.__mw4Store = memoryStore();
  }
  return cache.__mw4Store;
}

export function setStoreForTests(store: Store | undefined) {
  cache.__mw4Store = store;
}

function redisStore(url: string): Store {
  type Client = ReturnType<typeof createClient>;
  let connecting: Promise<Client> | null = null;

  const client = (): Promise<Client> => {
    if (!connecting) {
      const c = createClient({ url });
      c.on('error', (error) => console.error('[store] erro no Redis', error));
      connecting = c.connect().catch((error) => {
        connecting = null;
        throw error;
      }) as Promise<Client>;
    }
    return connecting;
  };

  return {
    async hGetAll(key) {
      return (await (await client()).hGetAll(key)) as Record<string, string>;
    },
    async hSet(key, values) {
      if (Object.keys(values).length) await (await client()).hSet(key, values);
    },
    async hSetNx(key, field, value) {
      await (await client()).hSetNX(key, field, value);
    },
    async hDel(key, fields) {
      if (fields.length) await (await client()).hDel(key, fields);
    },
    async lPush(key, values) {
      if (values.length) await (await client()).lPush(key, values);
    },
    async lRange(key, start, stop) {
      return (await client()).lRange(key, start, stop);
    },
    async lTrim(key, start, stop) {
      await (await client()).lTrim(key, start, stop);
    },
    async get(key) {
      return (await client()).get(key);
    },
    async set(key, value) {
      await (await client()).set(key, value);
    },
  };
}

export function memoryStore(): Store {
  const hashes = new Map<string, Map<string, string>>();
  const lists = new Map<string, string[]>();
  const strings = new Map<string, string>();
  const hash = (key: string) => {
    if (!hashes.has(key)) hashes.set(key, new Map());
    return hashes.get(key)!;
  };
  const list = (key: string) => {
    if (!lists.has(key)) lists.set(key, []);
    return lists.get(key)!;
  };
  const slice = (items: string[], start: number, stop: number) =>
    items.slice(start, stop < 0 ? items.length + stop + 1 : stop + 1);

  return {
    async hGetAll(key) {
      return Object.fromEntries(hash(key));
    },
    async hSet(key, values) {
      for (const [field, value] of Object.entries(values)) hash(key).set(field, value);
    },
    async hSetNx(key, field, value) {
      if (!hash(key).has(field)) hash(key).set(field, value);
    },
    async hDel(key, fields) {
      for (const field of fields) hash(key).delete(field);
    },
    async lPush(key, values) {
      list(key).unshift(...[...values].reverse());
    },
    async lRange(key, start, stop) {
      return slice(list(key), start, stop);
    },
    async lTrim(key, start, stop) {
      lists.set(key, slice(list(key), start, stop));
    },
    async get(key) {
      return strings.get(key) ?? null;
    },
    async set(key, value) {
      strings.set(key, value);
    },
  };
}
