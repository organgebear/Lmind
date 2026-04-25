import { NextRequest, NextResponse } from "next/server";
import { writeEnvFile } from "@/lib/config";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Test the connection before saving
    if (body.type === "sqlite") {
      try {
        const BetterSqlite3 = nodeRequire("better-sqlite3");
        const db = new BetterSqlite3(body.path || "./data/lmind.db");
        db.close();
      } catch (e: unknown) {
        return NextResponse.json(
          { ok: false, error: `SQLite 连接失败：${(e as Error).message}` },
          { status: 400 }
        );
      }
    } else {
      try {
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
      } catch (e: unknown) {
        return NextResponse.json(
          { ok: false, error: `MySQL 连接失败：${(e as Error).message}` },
          { status: 400 }
        );
      }
    }

    const envValues: Record<string, string> = { INITIALIZED: "true" };

    if (body.type === "sqlite") {
      envValues.DB_TYPE = "sqlite";
      envValues.DB_PATH = body.path || "./data/lmind.db";
    } else {
      envValues.DB_TYPE = "mysql";
      envValues.DB_HOST = body.host || "localhost";
      envValues.DB_PORT = String(body.port || 3306);
      envValues.DB_NAME = body.database || "Lmind";
      envValues.DB_USER = body.user || "root";
      envValues.DB_PASS = body.password || "";
    }

    if (body.redisUrl) {
      envValues.REDIS_URL = body.redisUrl;
    }

    writeEnvFile(envValues);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message || "保存配置失败" },
      { status: 500 }
    );
  }
}
