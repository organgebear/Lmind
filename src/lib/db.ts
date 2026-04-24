import "server-only";
import { readConfig } from "./config";
import { createSqliteDb, type Db } from "./db-sqlite";

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) {
    const cfg = readConfig();
    if (cfg.db.type === "sqlite") {
      _db = createSqliteDb(cfg.db.path);
    } else {
      throw new Error("当前环境暂不支持 MySQL，请先使用 SQLite 完成初始化");
    }
  }
  return _db;
}

export function resetDb() {
  _db = null;
}
