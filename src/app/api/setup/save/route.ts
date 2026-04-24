import { NextRequest, NextResponse } from "next/server";
import { writeConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    writeConfig({ db: body });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
