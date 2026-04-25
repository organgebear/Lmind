import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkAdmin } from "@/lib/check-admin";
import { hashPassword } from "@/lib/password";

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const db = getDb();
    const users = await db.findAllUsers();
    return NextResponse.json(users);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "获取用户列表失败" }, { status: 500 });
  }
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const { email, code, role, username, password } = await req.json();
    if (!email) return NextResponse.json({ error: "缺少 email 参数" }, { status: 400 });

    const db = getDb();
    if (await db.findByEmail(email)) return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });

    if (username) {
      const existing = await db.findByUsername(username);
      if (existing) return NextResponse.json({ error: "该用户名已被使用" }, { status: 400 });
    }

    if (code && code !== "" && (await db.codeExists(code))) return NextResponse.json({ error: "该安全码已被使用" }, { status: 400 });

    const userCode = code || Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = password ? hashPassword(password) : null;

    await db.insert({
      email,
      code: userCode,
      code_enabled: code ? 1 : 0,
      role: role || "user",
      username: username || null,
      password: hashedPassword,
    });

    return NextResponse.json({ email, code: userCode, username: username || null, role: role || "user" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "创建用户失败" }, { status: 500 });
  }
}

// DELETE /api/admin/users — delete a user
export async function DELETE(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "缺少 email 参数" }, { status: 400 });

    const db = getDb();
    const user = await db.findByEmail(email);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    if (user.role === "admin") {
      const all = await db.findAllUsers();
      const adminCount = all.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) return NextResponse.json({ error: "不能删除最后一个管理员" }, { status: 400 });
    }

    await db.deleteUser(email);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "删除用户失败" }, { status: 500 });
  }
}

// PUT /api/admin/users — update user (role, code, codeEnabled, password, username)
export async function PUT(req: NextRequest) {
  const err = await checkAdmin(req);
  if (err) return err;

  try {
    const { email, role, code, codeEnabled, password, username } = await req.json();
    if (!email) return NextResponse.json({ error: "缺少 email 参数" }, { status: 400 });

    const db = getDb();
    const user = await db.findByEmail(email);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    if (role !== undefined) {
      if (role !== "admin" && user.role === "admin") {
        const all = await db.findAllUsers();
        const adminCount = all.filter((u) => u.role === "admin").length;
        if (adminCount <= 1) return NextResponse.json({ error: "不能移除最后一个管理员的角色" }, { status: 400 });
      }
      await db.updateUserRole(email, role);
    }

    if (username !== undefined) {
      const existing = await db.findByUsername(username);
      if (existing && existing.email !== email) return NextResponse.json({ error: "该用户名已被使用" }, { status: 400 });
      await db.updateUsername(email, username);
    }

    if (code !== undefined) {
      if (code && (await db.codeExists(code, email))) return NextResponse.json({ error: "该安全码已被使用" }, { status: 400 });
      await db.updateCode(email, code);
    }

    if (codeEnabled !== undefined) {
      await db.toggleCode(email, codeEnabled);
    }

    if (password !== undefined && password) {
      const hashed = hashPassword(password);
      await db.updatePassword(email, hashed);
    }

    const updated = await db.findByEmail(email);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message || "更新用户失败" }, { status: 500 });
  }
}
