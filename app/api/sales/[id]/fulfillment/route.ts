import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FulfillmentStatus, isFulfillmentStatus } from "@/lib/fulfillment";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // ignore bad json
  }

  const updateData: {
    fulfillmentStatus?: FulfillmentStatus;
    trackingNumber?: string | null;
    carrier?: string | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } = {};

  const statusInput =
    typeof body.fulfillmentStatus === "string" ? body.fulfillmentStatus : "";
  if (statusInput) {
    if (!isFulfillmentStatus(statusInput)) {
      return NextResponse.json({ error: "Invalid fulfillmentStatus" }, { status: 400 });
    }
    updateData.fulfillmentStatus = statusInput as FulfillmentStatus;

    if (statusInput === "SHIPPED" && !body.shippedAt) {
      updateData.shippedAt = new Date();
    }

    if (statusInput === "DELIVERED" && !body.deliveredAt) {
      updateData.deliveredAt = new Date();
      if (!body.shippedAt) {
        updateData.shippedAt = new Date();
      }
    }
  }

  if ("trackingNumber" in body) {
    updateData.trackingNumber =
      typeof body.trackingNumber === "string" ? body.trackingNumber || null : null;
  }

  if ("carrier" in body) {
    updateData.carrier = typeof body.carrier === "string" ? body.carrier || null : null;
  }

  if ("shippedAt" in body) {
    updateData.shippedAt =
      typeof body.shippedAt === "string" && body.shippedAt
        ? new Date(body.shippedAt)
        : null;
  }

  if ("deliveredAt" in body) {
    updateData.deliveredAt =
      typeof body.deliveredAt === "string" && body.deliveredAt
        ? new Date(body.deliveredAt)
        : null;
  }

  try {
    const sale = await prisma.sale.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fulfillmentStatus: true,
        trackingNumber: true,
        carrier: true,
        shippedAt: true,
        deliveredAt: true,
      },
    });

    return NextResponse.json({ ok: true, sale });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update fulfillment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
