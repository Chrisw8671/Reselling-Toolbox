"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/reports", label: "Reports" },
  { href: "/watchlist", label: "Watchlist" },
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

function HamburgerIcon({ open, size = 22 }: { open: boolean; size?: number }) {
  // simple animated-ish swap between hamburger and X
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <path
            d="M6 6L18 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M4 7H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 12H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 17H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="navbar">
      <div className="navLeft">
        <Link href="/" className="logoLink" aria-label="Go to dashboard">
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="logo"
            priority
          />
        </Link>
      </div>

      {/* Desktop nav */}
      <nav className="navLinks navDesktop">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={isActive(l.href) ? "navActive" : ""}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Right side icons */}
      <div className="navRight">
        <Link
          href="/account"
          className={pathname.startsWith("/account") ? "navIcon navActive" : "navIcon"}
          aria-label="Account"
        >
          <AccountIcon />
        </Link>

        <Link
          href="/settings"
          className={pathname.startsWith("/settings") ? "navIcon navActive" : "navIcon"}
          aria-label="Settings"
        >
          <SettingsCogIcon />
        </Link>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="navIcon navHamburger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <HamburgerIcon open={open} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="mobileMenuOverlay" onClick={() => setOpen(false)}>
          <div className="mobileMenu" onClick={(e) => e.stopPropagation()}>
            <div className="mobileMenuTitle">Menu</div>

            <div className="mobileMenuLinks">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={isActive(l.href) ? "mobileLink active" : "mobileLink"}
                >
                  {l.label}
                </Link>
              ))}

              <div className="mobileDivider" />

              <Link
                href="/settings"
                className={
                  pathname.startsWith("/settings") ? "mobileLink active" : "mobileLink"
                }
              >
                Settings
              </Link>

              <Link
                href="/account"
                className={
                  pathname.startsWith("/account") ? "mobileLink active" : "mobileLink"
                }
              >
                Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
