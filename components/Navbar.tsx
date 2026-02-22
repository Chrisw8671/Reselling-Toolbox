"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/reports", label: "Reports" },
];

function AccountIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SettingsCogIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.5a3.5 3.5 0 1 0-3.5-3.5 3.5 3.5 0 0 0 3.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 13a7.7 7.7 0 0 0 .06-2l2-1.2-2-3.5-2.3.7a7.8 7.8 0 0 0-1.7-1L15 3h-6l-.4 3a7.8 7.8 0 0 0-1.7 1L4.6 6.3l-2 3.5 2 1.2a7.7 7.7 0 0 0 0 2l-2 1.2 2 3.5 2.3-.7a7.8 7.8 0 0 0 1.7 1l.4 3h6l.4-3a7.8 7.8 0 0 0 1.7-1l2.3.7 2-3.5-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <div className="navLeft">
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="logo"
        />
      </div>

      <nav className="navLinks">
        {links.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/"
              : pathname === l.href || pathname.startsWith(l.href + "/");

          return (
            <Link
              key={l.href}
              href={l.href}
              className={active ? "navActive" : ""}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side icons */}
      <div className="navRight">
        <Link
          href="/account"
          className={
            pathname.startsWith("/account") ? "navIcon navActive" : "navIcon"
          }
        >
          <AccountIcon />
        </Link>

        <Link
          href="/settings"
          className={
            pathname.startsWith("/settings") ? "navIcon navActive" : "navIcon"
          }
        >
          <SettingsCogIcon />
        </Link>
      </div>
    </header>
  );
}