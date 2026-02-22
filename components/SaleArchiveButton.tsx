"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SaleArchiveButton({
  saleId,
  archived,
}: {
  saleId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleArchive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${saleId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed to update archive state");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn"
      type="button"
      disabled={busy}
      onClick={toggleArchive}
      style={{ opacity: busy ? 0.6 : 1 }}
      title={archived ? "Unarchive this sale" : "Archive this sale"}
    >
      {busy ? "Working..." : archived ? "Unarchive" : "Archive"}
    </button>
  );
}