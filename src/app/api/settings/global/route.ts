import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/settings/global — public, returns global AI defaults
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const raw = await db.getAllSettings();

    const result: Record<string, unknown> = {};
    result["activeProvider"] = raw["ai.activeProvider"] || "deepseek";

    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith("ai.") && key !== "ai.activeProvider") {
        try {
          result[key.replace("ai.", "")] = JSON.parse(value);
        } catch {
          result[key.replace("ai.", "")] = value;
        }
      }
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "获取设置失败" }, { status: 500 });
  }
}
