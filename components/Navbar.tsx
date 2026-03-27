"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { bottomNavLinkClass, navIconClass, navLinkClass, ui } from "@/lib/ui";

const links = [
  { href: "/inventory", label: "Inventory"},
  { href: "/sales", label: "Sales"},
  { href: "/reports", label: "Reports"},
  { href: "/ebay-finder", label: "eBay Finder"},
];

function HomeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5 12 4l7.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 9.5V19a1 1 0 0 0 1 1h3.75v-5h1.5v5h3.75a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const mobilelinks = [
  { href: "/mobile", label: "Home", icon: "⌂", exact: true },
  { href: "/mobile/inventory", label: "Stock", icon: "📦" },
  { href: "/mobile/sales", label: "Sales", icon: "🧾" },
  { href: "/mobile/report", label: "Report", icon: "📊" },
  { href: "/mobile/settings", label: "More", icon: "⋯" },
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

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  }

  const isMobilePath = pathname.startsWith('/mobile');

  return (
    <>
      {!isMobilePath && (
        <header className={ui.navHeader}>
          <div className={ui.navDesktopGroup}>
            <Link href="/" className={ui.logoLink} aria-label="Go to dashboard">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className={ui.logo}
                priority
              />
            </Link>
          </div>
          <div className={ui.navMobileGroup}>
            <Link href="/mobile/" className={ui.logoLink} aria-label="Go to dashboard">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className={ui.logo}
                priority
              />
            </Link>
          </div>

          <nav className={ui.navDesktopLinks}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkClass(isActive(l.href))}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className={ui.navRight}>
            <Link
              href="/account"
              className={navIconClass(pathname.startsWith("/account"))}
              aria-label="Account"
            >
              <AccountIcon />
            </Link>

            <Link
              href="/settings"
              className={navIconClass(pathname.startsWith("/settings"))}
              aria-label="Settings"
            >
              <SettingsCogIcon />
            </Link>
          </div>
        </header>
      )}

      <nav className={ui.mobileBottomNav} aria-label="Primary">
        {mobilelinks.map((l) => {
          const active = l.exact ? pathname === l.href : isActive(l.href);
          return (
            <Link key={l.href} href={l.href} className={bottomNavLinkClass(active)}>
              <span className={ui.navTabIcon}>{l.href === "/mobile" ? <HomeIcon /> : l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
