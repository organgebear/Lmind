import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    if (body.type === "sqlite") {
      const BetterSqlite3 = nodeRequire("better-sqlite3");
      const db = new BetterSqlite3(body.path || "./data/lmind.db");
      db.close();
    } else {
      const mysqlPromiseModule = nodeRequire("mysql2/promise");
      const conn = await mysqlPromiseModule.createConnection({
        host: body.host || "localhost",
        port: Number(body.port) || 3306,
        database: body.database || "Lmind",
        user: body.user || "root",
        password: body.password || "",
        connectTimeout: 5000,
      });
      await conn.end();
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message || "数据库连接失败" },
      { status: 400 }
    );
  }
}
