import "server-only";
import type { Db, DbUser } from "./db-sqlite";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mysqlPromiseModule = require("mysql2/promise") as typeof import("mysql2/promise");

export function createMysqlDb(config: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): Db {
  const pool = mysqlPromiseModule.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  const q = async (sql: string, params: unknown[]) => {
    const [rows] = await pool.query(sql, params);
    return rows as DbUser[];
  };

  pool.query(`CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    code_enabled TINYINT NOT NULL DEFAULT 1
  )`);

  return {
    findByEmail: async (email) => (await q("SELECT * FROM users WHERE email=?", [email]))[0] ?? null,
    findByCode: async (code) => (await q("SELECT * FROM users WHERE code=? AND code_enabled=1", [code]))[0] ?? null,
    insert: async (u) => { await q("INSERT INTO users (email,code,code_enabled) VALUES (?,?,?)", [u.email, u.code, u.code_enabled]); },
    codeExists: async (code, excludeEmail) => {
      const rows = excludeEmail
        ? await q("SELECT 1 FROM users WHERE code=? AND email!=?", [code, excludeEmail])
        : await q("SELECT 1 FROM users WHERE code=?", [code]);
      return rows.length > 0;
    },
    updateCode: async (email, code) => { await q("UPDATE users SET code=? WHERE email=?", [code, email]); },
    toggleCode: async (email, enabled) => { await q("UPDATE users SET code_enabled=? WHERE email=?", [enabled ? 1 : 0, email]); },
  } satisfies Db;
}
