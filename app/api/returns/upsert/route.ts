import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      saleId,
      stockUnitId,
      reason,
      refundAmount,
      returnShippingCost,
      restockable,
      closed,
    } = body as {
      id?: string;
      saleId: string;
      stockUnitId: string;
      reason?: string;
      refundAmount?: number;
      returnShippingCost?: number;
      restockable?: boolean;
      closed?: boolean;
    };

    if (!saleId || !stockUnitId) {
      return NextResponse.json(
        { error: "saleId and stockUnitId are required" },
        { status: 400 },
      );
    }

    const safeRestockable = restockable ?? true;
    const safeReason = reason?.trim() || "Not specified";

    const result = await prisma.$transaction(async (tx) => {
      const existing = id
        ? await tx.returnCase.findUnique({ where: { id } })
        : await tx.returnCase.findFirst({
            where: { saleId, stockUnitId, closedAt: null },
            orderBy: { openedAt: "desc" },
          });

      const returnCase = existing
        ? await tx.returnCase.update({
            where: { id: existing.id },
            data: {
              reason: safeReason,
              refundAmount: refundAmount ?? 0,
              returnShippingCost: returnShippingCost ?? 0,
              restockable: safeRestockable,
              closedAt: closed ? new Date() : null,
            },
          })
        : await tx.returnCase.create({
            data: {
              saleId,
              stockUnitId,
              reason: safeReason,
              refundAmount: refundAmount ?? 0,
              returnShippingCost: returnShippingCost ?? 0,
              restockable: safeRestockable,
              closedAt: closed ? new Date() : null,
            },
          });

      let nextStatus: "RETURNED" | "IN_STOCK" | "WRITTEN_OFF" = "RETURNED";

      if (returnCase.closedAt) {
        nextStatus = returnCase.restockable ? "IN_STOCK" : "WRITTEN_OFF";
      }

      await tx.stockUnit.update({
        where: { id: stockUnitId },
        data: { status: nextStatus },
      });

      return returnCase;
    });

    return NextResponse.json({ ok: true, returnCase: result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to save return" },
      { status: 500 },
    );
  }
}
