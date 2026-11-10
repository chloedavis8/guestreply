// Database connection (Neon Postgres) and table setup.
const { Pool } = require("pg");
const { hashPassword } = require("./auth");

const DEMO_EMAIL = "demo@demo.com";
const DEMO_PASSWORD = "password123!";

let pool;
let ready;

function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

function getPool() {
  if (!pool) {
    const url = connectionString();
    if (!url) throw new Error("No database connected. Add a Neon database to this Vercel project.");
    const local = /localhost|127\.0\.0\.1/.test(url);
    pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
}

// Creates the tables the first time the app runs, and makes sure the
// demo account exists with full paid access.
async function setup() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS business_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT,
      business_type TEXT,
      tone TEXT,
      details TEXT,
      signoff TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      review TEXT NOT NULL,
      reply TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.query(
    `INSERT INTO users (name, email, password_hash, is_paid)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (email) DO UPDATE SET is_paid = TRUE`,
    ["Demo Account", DEMO_EMAIL, hashPassword(DEMO_PASSWORD)]
  );
  await db.query(
    `INSERT INTO business_profiles (user_id, business_name, business_type, tone, details, signoff)
     SELECT id, 'The Corner Bistro', 'Restaurant', 'Warm and friendly',
            'Family-owned bistro open for lunch and dinner. Known for homemade pasta and our patio. Reservations recommended on weekends.',
            'The Corner Bistro Team'
     FROM users WHERE email = $1
     ON CONFLICT (user_id) DO NOTHING`,
    [DEMO_EMAIL]
  );
}

async function query(text, params) {
  if (!ready) ready = setup().catch((e) => { ready = null; throw e; });
  await ready;
  return getPool().query(text, params);
}

module.exports = { query };
