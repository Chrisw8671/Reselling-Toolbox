import Link from "next/link";

export default async function HomePage() {

  const userName = "User";

  return (
    <div className="container">
      <div className="toolbar">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Welcome, {userName}
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Quick actions for reselling .
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href="/inventory/new">
            + Add inventory
          </Link>
          <Link className="btn" href="/sales/new">
            + Create sale
          </Link>
        </div>
      </div>
    </div>
  );
}
