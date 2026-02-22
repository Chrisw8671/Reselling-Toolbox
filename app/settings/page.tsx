import Link from "next/link";

function SettingsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SettingsRow({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-4 rounded-xl border p-4 hover:bg-gray-50 transition"
    >
      <div>
        <div className="font-medium">{title}</div>
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your account preferences and archived data.
        </p>
      </div>

      <div className="grid gap-4">
        <SettingsPanel title="Archive">
          <div className="grid gap-3">
            <SettingsRow
              href="/inventory/archive"
              title="Archived Items"
            />
            <SettingsRow
              href="/sales/archive"
              title="Archived Sales"
            />
          </div>
        </SettingsPanel>
      </div>
    </main>
  );
}