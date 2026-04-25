import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkAdmin } from "@/lib/check-admin";

// GET /api/admin/settings — get all global settings
export async function GET(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const db = getDb();
    const settings = await db.getAllSettings();
    return NextResponse.json(settings);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "获取设置失败" }, { status: 500 });
  }
}

// PUT /api/admin/settings — update global AI settings
export async function PUT(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const body = await req.json();
    const db = getDb();

    if (body.activeProvider) {
      await db.setSetting("ai.activeProvider", body.activeProvider);
    }

    if (body.providers) {
      for (const [provider, config] of Object.entries(body.providers)) {
        const cfg = config as Record<string, string>;
        await db.setSetting(`ai.${provider}`, JSON.stringify({
          apiKey: cfg.apiKey || "",
          model: cfg.model || "",
          baseUrl: cfg.baseUrl || "",
        }));
      }
    }

    const settings = await db.getAllSettings();
    return NextResponse.json({ success: true, settings });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "保存设置失败" }, { status: 500 });
  }
}
