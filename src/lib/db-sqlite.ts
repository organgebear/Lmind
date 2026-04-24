import "server-only";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import { createRequire } from "node:module";

export interface DbUser {
  email: string;
  code: string;
  code_enabled: number;
}

export interface Db {
  findByEmail(email: string): Promise<DbUser | null>;
  findByCode(code: string): Promise<DbUser | null>;
  insert(user: DbUser): Promise<void>;
  codeExists(code: string, excludeEmail?: string): Promise<boolean>;
  updateCode(email: string, code: string): Promise<void>;
  toggleCode(email: string, enabled: boolean): Promise<void>;
}

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");

export function createSqliteDb(filePath: string): Db {
  const db = new BetterSqlite3(filePath) as BetterSqlite3Database;
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    code_enabled INTEGER NOT NULL DEFAULT 1
  )`);

  return {
    findByEmail: async (email) => db.prepare("SELECT * FROM users WHERE email=?").get(email) ?? null,
    findByCode: async (code) => db.prepare("SELECT * FROM users WHERE code=? AND code_enabled=1").get(code) ?? null,
    insert: async (u) => db.prepare("INSERT INTO users (email,code,code_enabled) VALUES (?,?,?)").run(u.email, u.code, u.code_enabled),
    codeExists: async (code, excludeEmail) => {
      const row = excludeEmail
        ? db.prepare("SELECT 1 FROM users WHERE code=? AND email!=?").get(code, excludeEmail)
        : db.prepare("SELECT 1 FROM users WHERE code=?").get(code);
      return !!row;
    },
    updateCode: async (email, code) => db.prepare("UPDATE users SET code=? WHERE email=?").run(code, email),
    toggleCode: async (email, enabled) => db.prepare("UPDATE users SET code_enabled=? WHERE email=?").run(enabled ? 1 : 0, email),
  };
}
