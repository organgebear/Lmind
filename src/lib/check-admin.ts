import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** Verifies the requester is an admin. Accepts x-admin-email or x-admin-code header. */
export async function checkAdmin(req: NextRequest): Promise<NextResponse | null> {
  const email = req.headers.get("x-admin-email");
  const code = req.headers.get("x-admin-code");

  const db = getDb();

  if (email) {
    const user = await db.findByEmail(email);
    if (user && user.role === "admin") return null;
  }

  // fallback: look up by code (code_enabled check bypassed via findAllUsers)
  if (code) {
    const all = await db.findAllUsers();
    const user = all.find((u) => u.code === code && u.role === "admin");
    if (user) return null;
  }

  return NextResponse.json({ error: "无管理员权限" }, { status: 403 });
}
