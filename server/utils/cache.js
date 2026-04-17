const Redis = require('ioredis');

// ── Redis client with graceful fallback to in-memory ──────────────────────────
let redisClient = null;
const memoryStore = new Map(); // fallback when Redis is unavailable

function createRedisClient() {
  const client = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
  });

  client.on('connect', () => {
    console.log('[Cache] ✅ Redis connected on port 6379');
  });
  client.on('error', (err) => {
    console.warn(`[Cache] ⚠️  Redis unavailable — using in-memory fallback. (${err.message})`);
    redisClient = null;
  });
  client.on('close', () => {
    redisClient = null;
  });

  return client;
}

// Try to connect at startup
try {
  const client = createRedisClient();
  client.connect()
    .then(() => { redisClient = client; })
    .catch(() => { redisClient = null; });
} catch (_) {
  redisClient = null;
}

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || '300'); // 5 minutes

// ── Public API — same interface as NodeCache so controllers need no changes ───
const cache = {
  async get(key) {
    const start = Date.now();
    try {
      if (redisClient && redisClient.status === 'ready') {
        const val = await redisClient.get(key);
        if (val) {
          const duration = Date.now() - start;
          console.log(`[Cache] 🎯 CACHE HIT (Redis) — Key: ${key} | Time: ${duration}ms`);
          return JSON.parse(val);
        }
        return null;
      }
    } catch (_) {}
    // fallback
    const entry = memoryStore.get(key);
    if (entry && entry.expires > Date.now()) {
      const duration = Date.now() - start;
      console.log(`[Cache] 🎯 CACHE HIT (Memory) — Key: ${key} | Time: ${duration}ms`);
      return entry.value;
    }
    memoryStore.delete(key);
    return null;
  },

  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.setex(key, ttl, JSON.stringify(value));
        console.log(`[Cache] 💾 Redis SET: ${key} (TTL: ${ttl}s)`);
        return;
      }
    } catch (_) {}
    // fallback
    memoryStore.set(key, { value, expires: Date.now() + ttl * 1000 });
    console.log(`[Cache] 💾 Memory SET: ${key}`);
  },

  async del(key) {
    try {
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.del(key);
        console.log(`[Cache] 🗑️  Redis DEL: ${key}`);
        return;
      }
    } catch (_) {}
    memoryStore.delete(key);
    console.log(`[Cache] 🗑️  Memory DEL: ${key}`);
  },

  getClient() {
    return redisClient;
  }
};

module.exports = cache;
