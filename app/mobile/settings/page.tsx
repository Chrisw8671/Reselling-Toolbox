import Link from "next/link";

const shortcuts = [
  { href: "/settings", label: "Main settings", hint: "Full desktop settings page" },
  { href: "/locations", label: "Locations", hint: "Manage box and bay codes" },
  { href: "/inventory/archive", label: "Archived inventory", hint: "Restore or delete stock" },
  { href: "/sales/archive", label: "Archived sales", hint: "Review old orders" },
  { href: "/api/export/inventory", label: "Export inventory", hint: "Download Excel" },
  { href: "/api/export/sales", label: "Export sales", hint: "Download Excel" },
];

export default function MobileSettingsPage() {
  return (
    <div className="container" style={{ maxWidth: 560, paddingBottom: 24 }}>
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Settings</h1>
          <div className="muted" style={{ marginTop: 4 }}>Simple links for admin actions.</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="tableWrap"
            style={{ padding: 12, textDecoration: "none" }}
          >
            <div style={{ fontWeight: 700 }}>{item.label}</div>
            <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{item.hint}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
