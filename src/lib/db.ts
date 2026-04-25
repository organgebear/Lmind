import "server-only";
import { readConfig } from "./config";
import { createSqliteDb, type Db } from "./db-sqlite";
import { createMysqlDb } from "./db-mysql";

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) {
    const cfg = readConfig();
    if (cfg.db.type === "sqlite") {
      _db = createSqliteDb(cfg.db.path);
    } else if (cfg.db.type === "mysql") {
      _db = createMysqlDb({
        host: cfg.db.host,
        port: cfg.db.port,
        database: cfg.db.database,
        user: cfg.db.user,
        password: cfg.db.password,
      });
    } else {
      throw new Error("不支持的数据库类型");
    }
  }
  return _db;
}

export function resetDb() {
  _db = null;
}
