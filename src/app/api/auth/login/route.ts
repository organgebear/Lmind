import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { type, value } = await req.json();
    const db = getDb();
    const user = type === "code"
      ? await db.findByCode(value)
      : await db.findByEmail(value);
    if (!user) return NextResponse.json({ error: "认证失败" }, { status: 401 });
    return NextResponse.json({ email: user.email, code: user.code, codeEnabled: !!user.code_enabled });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "登录失败" }, { status: 500 });
  }
}
