import Link from "next/link";

const sections = [
  {
    title: "Data",
    items: [
      { href: "/api/export/inventory", label: "Export inventory", hint: "Download as Excel", icon: "📥" },
      { href: "/api/export/sales", label: "Export sales", hint: "Download as Excel", icon: "📥" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/locations", label: "Locations", hint: "Manage box and bay codes", icon: "📍" },
      { href: "/inventory/archive", label: "Archived inventory", hint: "Restore or permanently delete stock", icon: "🗃️" },
      { href: "/sales/archive", label: "Archived sales", hint: "Review old completed orders", icon: "🗃️" },
    ],
  },
  {
    title: "Desktop",
    items: [
      { href: "/settings", label: "Full settings", hint: "Open the desktop settings page", icon: "⚙️" },
      { href: "/", label: "Desktop app", hint: "Switch to the full desktop view", icon: "🖥️" },
    ],
  },
];

export default function MobileSettingsPage() {
  return (
    <div className="mobilePg">
      <div style={{ paddingTop: 10, paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
          More
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
          Tools and settings
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, paddingBottom: 8 }}>
        {sections.map((section) => (
          <div key={section.title}>
            <div className="sectionLabel">{section.title}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    background: "var(--panel)",
                    textDecoration: "none",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {item.hint}
                    </div>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 18, fontWeight: 300 }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
