import Link from "next/link";

function SettingsCard({
  href,
  title,
  description,
  icon,
  external,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  external?: boolean;
}) {
  // external=true lets us use <a> for file downloads
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--panel2)",
            border: "1px solid var(--border)",
            fontSize: 18,
            flex: "0 0 auto",
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {description}
          </div>
        </div>
      </div>

      <div className="muted" style={{ fontSize: 18, flex: "0 0 auto" }}>
        →
      </div>
    </>
  );

  const commonProps = {
    className: "tableWrap",
    style: {
      padding: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      textDecoration: "none",
    } as React.CSSProperties,
  };

  if (external) {
    return (
      <a href={href} {...commonProps}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} {...commonProps}>
      {inner}
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Settings</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Manage reference data, exports, and archived records.
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Export</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Download your database data as Excel spreadsheets.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <SettingsCard
            href="/api/export/inventory"
            title="Export Inventory (Excel)"
            description="Downloads an .xlsx of all stock units (including archived)."
            icon="📦"
            external
          />

          <SettingsCard
            href="/api/export/sales"
            title="Export Sales (Excel)"
            description="Downloads an .xlsx of all sales + lines (including archived)."
            icon="🧾"
            external
          />
        </div>
      </div>

      {/* Reference Data */}
      <div className="tableWrap" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
          Reference Data
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Manage reusable lists used across the app.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <SettingsCard
            href="/locations"
            title="Locations (Bay / Box codes)"
            description="Add, edit or remove storage locations."
            icon="📍"
          />
        </div>
      </div>

      {/* Archive */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Archive</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          View and manage archived records.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <SettingsCard
            href="/inventory/archive"
            title="Archived Items"
            description="See inventory items you’ve archived."
            icon="🗃️"
          />

          <SettingsCard
            href="/sales/archive"
            title="Archived Sales"
            description="See sales you’ve archived."
            icon="🧾"
          />
        </div>
      </div>
    </div>
  );
}
