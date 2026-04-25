import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!code?.trim()) return NextResponse.json({ error: "安全码不能为空" }, { status: 400 });
    const db = getDb();
    if (await db.codeExists(code, email)) return NextResponse.json({ error: "该安全码已被使用" }, { status: 400 });
    await db.updateCode(email, code);
    const user = await db.findByEmail(email);
    return NextResponse.json({ email: user!.email, code: user!.code, codeEnabled: !!user!.code_enabled, role: user!.role });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "更新失败" }, { status: 500 });
  }
}
