import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  await prisma.listing.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
