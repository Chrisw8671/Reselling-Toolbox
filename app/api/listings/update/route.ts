import { NextResponse } from "next/server";
import { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function asString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function asOptionalDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;

  const id = asString(body.id);
  if (!id) {
    return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
  }

  const platform = asString(body.platform);
  const listingId = asString(body.listingId);
  const url = asString(body.url);
  const askPrice = Number(body.askPrice ?? 0);
  const status = asString(body.status);

  if (!platform || !listingId) {
    return NextResponse.json(
      { error: "platform and listingId are required" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(askPrice) || askPrice < 0) {
    return NextResponse.json({ error: "askPrice must be >= 0" }, { status: 400 });
  }

  const parsedListedAt = asOptionalDate(body.listedAt);
  if (parsedListedAt === null) {
    return NextResponse.json({ error: "Invalid listedAt date" }, { status: 400 });
  }

  const parsedEndedAt = asOptionalDate(body.endedAt);
  if (parsedEndedAt === null) {
    return NextResponse.json({ error: "Invalid endedAt date" }, { status: 400 });
  }

  await prisma.listing.update({
    where: { id },
    data: {
      platform,
      listingId,
      url: url || null,
      askPrice,
      status: Object.values(ListingStatus).includes(status as ListingStatus)
        ? (status as ListingStatus)
        : ListingStatus.ACTIVE,
      listedAt: parsedListedAt,
      endedAt: parsedEndedAt,
    },
  });

  return NextResponse.json({ ok: true });
}
