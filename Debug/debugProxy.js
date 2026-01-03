// debugProxy.js – MongoDB debug proxy for GPT Actions
//
// This standalone Express server exposes a small set of read‑only endpoints
// that allow a Custom GPT Action to inspect MongoDB collections safely.
// It implements API‑key authentication, CORS, rate limiting, and
// sanitizes all filters to prevent unsafe operators.  See server.js for
// the main API; run this proxy separately with `npm run debug:proxy`.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient, ObjectId } = require('mongodb');
const { z } = require('zod');
const pino = require('pino');

const log = pino({ transport: { target: 'pino-pretty' } });

// Environment variables used by the proxy.  ACTIONS_API_KEY is required
// because ChatGPT Actions use it for Bearer authentication.  MONGODB_DB
// should specify the database name for the reads.  Port defaults to 8787.
const {
  PORT = 8787,
  MONGODB_URI,
  MONGODB_DB,
  ACTIONS_API_KEY,
  ALLOWED_ORIGINS = '*',
} = process.env;

if (!MONGODB_URI || !MONGODB_DB || !ACTIONS_API_KEY) {
  throw new Error('Missing env vars: MONGODB_URI, MONGODB_DB, ACTIONS_API_KEY');
}

const app = express();
const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5 });

// Allowlist of collections that the proxy will permit reads on.  Add
// additional collections here if you want to expose them to the GPT.
const ALLOWED_COLLECTIONS = new Set([
  'players',
  'teams',
  'games',
  'standings',
  'injuries',
]);

// Operators permitted in filters.  All other operators (including
// $where, $function, regex, etc.) are rejected to prevent injection.
const SAFE_FIND_OPS = new Set(['$eq', '$in', '$gt', '$gte', '$lt', '$lte']);

// Middleware
app.use(helmet());
app.use(
  cors({ origin: ALLOWED_ORIGINS === '*' ? true : ALLOWED_ORIGINS.split(',') })
);
app.use(express.json({ limit: '200kb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Simple API‑key auth.  ChatGPT Actions will set
// `Authorization: Bearer <key>` on each request.
app.use((req, res, next) => {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== ACTIONS_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// Helper to walk a filter and ensure only safe operators are used.
function sanitizeFilter(filter) {
  const isPlainObject = (o) => o && typeof o === 'object' && !Array.isArray(o);
  if (!isPlainObject(filter)) throw new Error('filter must be an object');
  const walk = (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$where' || k === '$function') throw new Error('Operator not allowed');
      if (k.startsWith('$') && !SAFE_FIND_OPS.has(k)) throw new Error(`Operator not allowed: ${k}`);
      if (isPlainObject(v)) walk(v);
      if (Array.isArray(v)) v.forEach((x) => isPlainObject(x) && walk(x));
    }
  };
  walk(filter);
  return filter;
}

// zod schema for the findOne request body
const findOneSchema = z.object({
  collection: z.string(),
  filter: z.record(z.any()),
  projection: z.record(z.union([z.literal(0), z.literal(1)])).optional(),
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// List the allowlisted collections
app.get('/mongo/collections', (req, res) => {
  res.json({ allowed: [...ALLOWED_COLLECTIONS] });
});

// Perform a read‑only findOne with safe filtering and optional projection
app.post('/mongo/findOne', async (req, res) => {
  try {
    const { collection, filter, projection } = findOneSchema.parse(req.body);
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(400).json({ error: 'Collection not allowed' });
    }
    const db = client.db(MONGODB_DB);
    // Convert string _id to ObjectId if valid
    if (typeof filter?._id === 'string' && ObjectId.isValid(filter._id)) {
      filter._id = new ObjectId(filter._id);
    }
    const safeFilter = sanitizeFilter(filter);
    const doc = await db.collection(collection).findOne(safeFilter, { projection });
    res.json({ doc });
  } catch (err) {
    console.error('findOne error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Return recent errors from an optional errors collection (if allowlisted)
app.get('/debug/errors', async (req, res) => {
  const sinceMinutes = Math.min(parseInt(req.query.sinceMinutes ?? '60', 10), 24 * 60);
  if (!ALLOWED_COLLECTIONS.has('errors')) {
    return res.json({ errors: [], note: 'No errors collection allowlisted.' });
  }
  const since = new Date(Date.now() - sinceMinutes * 60_000);
  const db = client.db(MONGODB_DB);
  const errors = await db
    .collection('errors')
    .find({ ts: { $gte: since } }, { limit: 50 })
    .sort({ ts: -1 })
    .toArray();
  res.json({ errors });
});

async function start() {
  await client.connect();
  app.listen(PORT, () => log.info(`Mongo debug proxy running on :${PORT}`));
}

start().catch((e) => {
  log.error(e);
  process.exit(1);
});