import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim().toUpperCase();
    const type = String(body?.type ?? "Box").trim() || "Box";
    const notes = body?.notes ?? null;

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    await prisma.location.create({
      data: { code, type, notes },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}