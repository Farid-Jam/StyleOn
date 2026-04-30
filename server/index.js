import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import snowflake from 'snowflake-sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const REQUIRED_ENV = [
  'SNOWFLAKE_ACCOUNT',
  'SNOWFLAKE_USER',
  'SNOWFLAKE_PASSWORD',
  'SNOWFLAKE_DATABASE',
  'SNOWFLAKE_SCHEMA',
  'SNOWFLAKE_WAREHOUSE',
];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[server] Missing env: ${missing.join(', ')}. See server/.env.example.`);
  process.exit(1);
}

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  ...(process.env.SNOWFLAKE_ROLE ? { role: process.env.SNOWFLAKE_ROLE } : {}),
});

await new Promise((resolve, reject) => {
  connection.connect((err) => (err ? reject(err) : resolve()));
}).catch((err) => {
  console.error('[server] Snowflake connect failed:', err.message);
  process.exit(1);
});

console.log('[server] Connected to Snowflake.');

function query(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve(rows ?? [])),
    });
  });
}

// Snowflake returns column names in uppercase by default; flatten to lowercase keys
// so the React layer can use familiar field names (item_id, image_url, etc.).
function lowerKeys(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k.toLowerCase()] = v;
    return out;
  });
}

const VALID_CATEGORIES = new Set([
  'tops', 'bottoms', 'outerwear', 'underwear', 'shoes', 'accessories',
]);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// List all products, optionally filtered by ?category=tops&search=jacket etc.
app.get('/api/products', async (req, res) => {
  try {
    const clauses = ['in_stock = TRUE'];
    const binds = [];

    if (req.query.category && VALID_CATEGORIES.has(req.query.category)) {
      clauses.push('category = ?');
      binds.push(req.query.category);
    }
    if (req.query.search) {
      clauses.push(
        "(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(subcategory) LIKE ?)",
      );
      const term = `%${req.query.search.toLowerCase()}%`;
      binds.push(term, term, term);
    }

    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, 2000)
      : 100;

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await query(
      `SELECT id, name, brand, category, subcategory, gender_fit,
              colors, season_palette, aesthetic_tags, available_sizes,
              material, price, currency, image_url, try_on_ready_image_url,
              product_url, source, description, in_stock
       FROM products ${where} ORDER BY category, name LIMIT ${limit}`,
      binds,
    );
    res.json(lowerKeys(rows));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, brand, category, subcategory, gender_fit,
              colors, season_palette, aesthetic_tags, available_sizes,
              material, price, currency, image_url, try_on_ready_image_url,
              product_url, source, description, in_stock
       FROM products WHERE id = ?`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(lowerKeys(rows)[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List distinct categories present in the database
app.get('/api/categories', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT DISTINCT category FROM products WHERE in_stock = TRUE ORDER BY category',
    );
    res.json(rows.map((r) => r.CATEGORY ?? r.category));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`[server] API listening on http://localhost:${port}`);
});
