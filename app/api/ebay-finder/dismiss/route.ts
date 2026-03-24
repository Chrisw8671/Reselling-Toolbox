import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.ebaySearchResult.update({
    where: { id },
    data: { status: "dismissed" },
  });

  return NextResponse.json({ ok: true });
}
