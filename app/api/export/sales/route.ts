import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { saleDate: "desc" },
      select: {
        id: true,
        platform: true,
        saleDate: true,
        orderRef: true,
        shippingCharged: true,
        platformFees: true,
        shippingCost: true,
        otherCosts: true,
        notes: true,
        createdAt: true,
        archived: true,
        archivedAt: true,
        lines: {
          select: {
            id: true,
            salePrice: true,
            stockUnit: {
              select: {
                sku: true,
                titleOverride: true,
                purchaseCost: true,
                brand: true,
                size: true,
              },
            },
          },
        },
      },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "Reselling Toolbox";
    wb.created = new Date();

    const ws = wb.addWorksheet("Sales Lines");

    ws.columns = [
      { header: "Sale ID", key: "saleId", width: 36 },
      { header: "Sale Date", key: "saleDate", width: 14 },
      { header: "Platform", key: "platform", width: 16 },
      { header: "Order Ref", key: "orderRef", width: 18 },
      { header: "SKU", key: "sku", width: 16 },
      { header: "Title", key: "title", width: 32 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Size", key: "size", width: 12 },
      { header: "Sale Price", key: "salePrice", width: 12 },
      { header: "Purchase Cost", key: "purchaseCost", width: 14 },
      { header: "Line Profit", key: "lineProfit", width: 12 },
      { header: "Shipping Charged", key: "shippingCharged", width: 16 },
      { header: "Platform Fees", key: "platformFees", width: 14 },
      { header: "Shipping Cost", key: "shippingCost", width: 14 },
      { header: "Other Costs", key: "otherCosts", width: 12 },
      { header: "Sale Notes", key: "notes", width: 40 },
      { header: "Archived", key: "archived", width: 10 },
      { header: "Archived At", key: "archivedAt", width: 18 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const s of sales) {
      // If a sale has no lines, still output one row
      if (!s.lines.length) {
        ws.addRow({
          saleId: s.id,
          saleDate: s.saleDate.toISOString().slice(0, 10),
          platform: s.platform,
          orderRef: s.orderRef ?? "",
          sku: "",
          title: "",
          brand: "",
          size: "",
          salePrice: 0,
          purchaseCost: 0,
          lineProfit: 0,
          shippingCharged: Number(s.shippingCharged ?? 0),
          platformFees: Number(s.platformFees ?? 0),
          shippingCost: Number(s.shippingCost ?? 0),
          otherCosts: Number(s.otherCosts ?? 0),
          notes: s.notes ?? "",
          archived: s.archived ? "Yes" : "No",
          archivedAt: s.archivedAt
            ? s.archivedAt.toISOString().slice(0, 19).replace("T", " ")
            : "",
        });
        continue;
      }

      for (const line of s.lines) {
        const sell = Number(line.salePrice ?? 0);
        const buy = Number(line.stockUnit.purchaseCost ?? 0);
        ws.addRow({
          saleId: s.id,
          saleDate: s.saleDate.toISOString().slice(0, 10),
          platform: s.platform,
          orderRef: s.orderRef ?? "",
          sku: line.stockUnit.sku,
          title: line.stockUnit.titleOverride ?? "",
          brand: line.stockUnit.brand ?? "",
          size: line.stockUnit.size ?? "",
          salePrice: sell,
          purchaseCost: buy,
          lineProfit: sell - buy,
          shippingCharged: Number(s.shippingCharged ?? 0),
          platformFees: Number(s.platformFees ?? 0),
          shippingCost: Number(s.shippingCost ?? 0),
          otherCosts: Number(s.otherCosts ?? 0),
          notes: s.notes ?? "",
          archived: s.archived ? "Yes" : "No",
          archivedAt: s.archivedAt
            ? s.archivedAt.toISOString().slice(0, 19).replace("T", " ")
            : "",
        });
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`;

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
