import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const items = await prisma.stockUnit.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        sku: true,
        titleOverride: true,
        condition: true,
        status: true,
        purchaseCost: true,
        extraCost: true,
        purchasedAt: true,
        purchasedFrom: true,
        purchaseRef: true,
        purchaseUrl: true,
        brand: true,
        size: true,
        notes: true,
        createdAt: true,
        archived: true,
        archivedAt: true,
        location: { select: { code: true } },
      },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Reselling Toolbox";
    wb.created = new Date();

    const ws = wb.addWorksheet("Inventory");

    ws.columns = [
      { header: "SKU", key: "sku", width: 16 },
      { header: "Title", key: "title", width: 36 },
      { header: "Condition", key: "condition", width: 20 },
      { header: "Status", key: "status", width: 14 },
      { header: "Purchase Cost", key: "purchaseCost", width: 14 },
      { header: "Extra Cost", key: "extraCost", width: 12 },
      { header: "Purchased At", key: "purchasedAt", width: 14 },
      { header: "Purchased From", key: "purchasedFrom", width: 18 },
      { header: "Purchase Ref", key: "purchaseRef", width: 18 },
      { header: "Purchase URL", key: "purchaseUrl", width: 32 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Size", key: "size", width: 12 },
      { header: "Location", key: "location", width: 12 },
      { header: "Notes", key: "notes", width: 40 },
      { header: "Created At", key: "createdAt", width: 18 },
      { header: "Archived", key: "archived", width: 10 },
      { header: "Archived At", key: "archivedAt", width: 18 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const it of items) {
      ws.addRow({
        sku: it.sku,
        title: it.titleOverride ?? "",
        condition: it.condition ?? "",
        status: it.status,
        purchaseCost: Number(it.purchaseCost ?? 0),
        extraCost: Number(it.extraCost ?? 0),
        purchasedAt: it.purchasedAt ? it.purchasedAt.toISOString().slice(0, 10) : "",
        purchasedFrom: it.purchasedFrom ?? "",
        purchaseRef: it.purchaseRef ?? "",
        purchaseUrl: it.purchaseUrl ?? "",
        brand: it.brand ?? "",
        size: it.size ?? "",
        location: it.location?.code ?? "",
        notes: it.notes ?? "",
        createdAt: it.createdAt.toISOString().slice(0, 19).replace("T", " "),
        archived: it.archived ? "Yes" : "No",
        archivedAt: it.archivedAt
          ? it.archivedAt.toISOString().slice(0, 19).replace("T", " ")
          : "",
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `inventory_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Export failed" }, { status: 500 });
  }
}
