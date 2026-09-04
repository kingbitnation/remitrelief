import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { loadConfig } from "../config.js";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;
let migrated = false;

export function getPool() {
  if (pool) return pool;
  const cfg = loadConfig();
  if (!cfg.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  pool = new Pool({
    connectionString: cfg.databaseUrl,
    ssl: cfg.isProduction ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

export async function migrate() {
  if (migrated) return;
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const client = await getPool().connect();
  try {
    await client.query(sql);
    migrated = true;
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  await migrate();
  return getPool().query(text, params);
}

export function resetPoolForTests() {
  pool = null;
  migrated = false;
}
