import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
const mysqlPromiseModule = require("mysql2/promise") as typeof import("mysql2/promise");

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    if (body.type === "sqlite") {
      const db = new BetterSqlite3(body.path);
      db.close();
    } else {
      const conn = await mysqlPromiseModule.createConnection({
        host: body.host, port: Number(body.port),
        database: body.database, user: body.user, password: body.password,
      });
      await conn.end();
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
