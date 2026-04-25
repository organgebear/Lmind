import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, enabled } = await req.json();
    const db = getDb();
    await db.toggleCode(email, enabled);
    const user = await db.findByEmail(email);
    return NextResponse.json({ email: user!.email, code: user!.code, codeEnabled: !!user!.code_enabled, role: user!.role });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "操作失败" }, { status: 500 });
  }
}
