import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const { type, value, identifier, password } = await req.json();
    const db = getDb();

    // Unified password login: identifier can be email or username
    if (type === "password") {
      if (!identifier || !password) {
        return NextResponse.json({ error: "请输入邮箱/用户名和密码" }, { status: 400 });
      }
      const user = identifier.includes("@")
        ? await db.findByEmail(identifier)
        : await db.findByUsername(identifier);
      if (!user || !user.password) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }
      if (!verifyPassword(password, user.password)) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }
      return NextResponse.json({
        email: user.email,
        code: user.code,
        codeEnabled: !!user.code_enabled,
        role: user.role || "user",
        username: user.username,
      });
    }

    const user = type === "code"
      ? await db.findByCode(value)
      : await db.findByEmail(value);
    if (!user) return NextResponse.json({ error: "认证失败" }, { status: 401 });
    return NextResponse.json({
      email: user.email,
      code: user.code,
      codeEnabled: !!user.code_enabled,
      role: user.role || "user",
      username: user.username,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "登录失败" }, { status: 500 });
  }
}
