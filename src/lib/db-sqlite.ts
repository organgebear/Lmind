import "server-only";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import { createRequire } from "node:module";
import { hashPassword } from "./password";

export interface DbUser {
  email: string;
  code: string;
  code_enabled: number;
  role: string;
  username: string | null;
  password: string | null;
}

export interface Db {
  findByEmail(email: string): Promise<DbUser | null>;
  findByCode(code: string): Promise<DbUser | null>;
  findByUsername(username: string): Promise<DbUser | null>;
  insert(user: Omit<DbUser, "username" | "password"> & { username?: string | null; password?: string | null }): Promise<void>;
  codeExists(code: string, excludeEmail?: string): Promise<boolean>;
  updateCode(email: string, code: string): Promise<void>;
  toggleCode(email: string, enabled: boolean): Promise<void>;
  findAllUsers(): Promise<DbUser[]>;
  deleteUser(email: string): Promise<void>;
  updateUserRole(email: string, role: string): Promise<void>;
  updatePassword(email: string, hashedPassword: string): Promise<void>;
  updateUsername(email: string, username: string): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;
}

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");

const ADMIN_SEED = {
  email: "admin@lmind.local",
  username: "admin",
  password: "admin123",
};

export function createSqliteDb(filePath: string): Db {
  const db = new BetterSqlite3(filePath) as BetterSqlite3Database;

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    code_enabled INTEGER NOT NULL DEFAULT 1
  )`);

  // migration: add role column if missing
  try { db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"); } catch { /* ok */ }
  // migration: add username column if missing
  try { db.exec("ALTER TABLE users ADD COLUMN username TEXT"); } catch { /* ok */ }
  // migration: add password column if missing
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT"); } catch { /* ok */ }

  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  // seed super admin if not exists
  const existingAdmin = db.prepare("SELECT 1 FROM users WHERE username=?").get(ADMIN_SEED.username) as unknown;
  if (!existingAdmin) {
    const hashed = hashPassword(ADMIN_SEED.password);
    db.prepare("INSERT INTO users (email,code,code_enabled,role,username,password) VALUES (?,?,?,?,?,?)").run(
      ADMIN_SEED.email, "000000", 0, "admin", ADMIN_SEED.username, hashed
    );
  }

  return {
    findByEmail: async (email) => {
      const row = db.prepare("SELECT * FROM users WHERE email=?").get(email) as DbUser | undefined;
      return row ?? null;
    },
    findByCode: async (code) => {
      const row = db.prepare("SELECT * FROM users WHERE code=? AND code_enabled=1").get(code) as DbUser | undefined;
      return row ?? null;
    },
    findByUsername: async (username) => {
      const row = db.prepare("SELECT * FROM users WHERE username=?").get(username) as DbUser | undefined;
      return row ?? null;
    },
    insert: async (u) => {
      db.prepare("INSERT INTO users (email,code,code_enabled,role,username,password) VALUES (?,?,?,?,?,?)").run(
        u.email, u.code, u.code_enabled, u.role, u.username ?? null, u.password ?? null
      );
    },
    codeExists: async (code, excludeEmail) => {
      const row = excludeEmail
        ? (db.prepare("SELECT 1 FROM users WHERE code=? AND email!=?").get(code, excludeEmail) as unknown)
        : (db.prepare("SELECT 1 FROM users WHERE code=?").get(code) as unknown);
      return !!row;
    },
    updateCode: async (email, code) => {
      db.prepare("UPDATE users SET code=? WHERE email=?").run(code, email);
    },
    toggleCode: async (email, enabled) => {
      db.prepare("UPDATE users SET code_enabled=? WHERE email=?").run(enabled ? 1 : 0, email);
    },
    findAllUsers: async () => db.prepare("SELECT * FROM users ORDER BY email").all() as DbUser[],
    deleteUser: async (email) => {
      db.prepare("DELETE FROM users WHERE email=? AND username != 'admin'").run(email);
    },
    updateUserRole: async (email, role) => {
      db.prepare("UPDATE users SET role=? WHERE email=?").run(role, email);
    },
    updatePassword: async (email, hashedPassword) => {
      db.prepare("UPDATE users SET password=? WHERE email=?").run(hashedPassword, email);
    },
    updateUsername: async (email, username) => {
      db.prepare("UPDATE users SET username=? WHERE email=?").run(username, email);
    },
    getSetting: async (key) => {
      const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key) as { value: string } | undefined;
      return row?.value ?? null;
    },
    setSetting: async (key, value) => {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)").run(key, value);
    },
    getAllSettings: async () => {
      const rows = db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
      const result: Record<string, string> = {};
      for (const r of rows) result[r.key] = r.value;
      return result;
    },
  };
}
