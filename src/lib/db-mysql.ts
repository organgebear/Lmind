import "server-only";
import type { Db, DbUser } from "./db-sqlite";
import { createRequire } from "node:module";
import { hashPassword } from "./password";

const require = createRequire(import.meta.url);
const mysqlPromiseModule = require("mysql2/promise") as typeof import("mysql2/promise");

const ADMIN_SEED = {
  email: "admin@lmind.local",
  username: "admin",
  password: "admin123",
};

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
    return rows as Record<string, unknown>[];
  };

  pool.query(`CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    code_enabled TINYINT NOT NULL DEFAULT 1
  )`);

  // migrations
  pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'").catch(() => {});
  pool.query("ALTER TABLE users ADD COLUMN username VARCHAR(255)").catch(() => {});
  pool.query("ALTER TABLE users ADD COLUMN password VARCHAR(255)").catch(() => {});

  pool.query(`CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(255) PRIMARY KEY,
    \`value\` TEXT NOT NULL
  )`);

  // seed super admin
  (async () => {
    try {
      const rows = await q("SELECT 1 FROM users WHERE username=?", [ADMIN_SEED.username]);
      if (rows.length === 0) {
        const hashed = hashPassword(ADMIN_SEED.password);
        await q("INSERT INTO users (email,code,code_enabled,role,username,password) VALUES (?,?,?,?,?,?)", [
          ADMIN_SEED.email, "000000", 0, "admin", ADMIN_SEED.username, hashed,
        ]);
      }
    } catch { /* ok */ }
  })();

  return {
    findByEmail: async (email) => {
      const rows = await q("SELECT * FROM users WHERE email=?", [email]);
      return (rows[0] as unknown as DbUser) ?? null;
    },
    findByCode: async (code) => {
      const rows = await q("SELECT * FROM users WHERE code=? AND code_enabled=1", [code]);
      return (rows[0] as unknown as DbUser) ?? null;
    },
    findByUsername: async (username) => {
      const rows = await q("SELECT * FROM users WHERE username=?", [username]);
      return (rows[0] as unknown as DbUser) ?? null;
    },
    insert: async (u) => {
      await q("INSERT INTO users (email,code,code_enabled,role,username,password) VALUES (?,?,?,?,?,?)", [
        u.email, u.code, u.code_enabled, u.role, u.username ?? null, u.password ?? null,
      ]);
    },
    codeExists: async (code, excludeEmail) => {
      const rows = excludeEmail
        ? await q("SELECT 1 FROM users WHERE code=? AND email!=?", [code, excludeEmail])
        : await q("SELECT 1 FROM users WHERE code=?", [code]);
      return rows.length > 0;
    },
    updateCode: async (email, code) => {
      await q("UPDATE users SET code=? WHERE email=?", [code, email]);
    },
    toggleCode: async (email, enabled) => {
      await q("UPDATE users SET code_enabled=? WHERE email=?", [enabled ? 1 : 0, email]);
    },
    findAllUsers: async () => {
      const rows = await q("SELECT * FROM users ORDER BY email", []);
      return rows as unknown as DbUser[];
    },
    deleteUser: async (email) => {
      await q("DELETE FROM users WHERE email=? AND username != 'admin'", [email]);
    },
    updateUserRole: async (email, role) => {
      await q("UPDATE users SET role=? WHERE email=?", [role, email]);
    },
    updatePassword: async (email, hashedPassword) => {
      await q("UPDATE users SET password=? WHERE email=?", [hashedPassword, email]);
    },
    updateUsername: async (email, username) => {
      await q("UPDATE users SET username=? WHERE email=?", [username, email]);
    },
    getSetting: async (key) => {
      const rows = await q("SELECT \`value\` FROM settings WHERE \`key\`=?", [key]);
      return rows.length > 0 ? (rows[0] as Record<string, string>).value : null;
    },
    setSetting: async (key, value) => {
      await q("INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`)", [key, value]);
    },
    getAllSettings: async () => {
      const rows = await q("SELECT * FROM settings", []);
      const result: Record<string, string> = {};
      for (const r of rows as Record<string, string>[]) result[r.key] = r.value;
      return result;
    },
  } satisfies Db;
}
