import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const db = getDb();
    if (await db.findByEmail(email)) return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    if (await db.codeExists(code)) return NextResponse.json({ error: "该安全码已被使用" }, { status: 400 });
    await db.insert({ email, code, code_enabled: 1 });
    return NextResponse.json({ email, code, codeEnabled: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "注册失败" }, { status: 500 });
  }
}
