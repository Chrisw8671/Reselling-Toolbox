import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Inter } from "next/font/google";
import { AccountIcon, SettingsCogIcon } from "@/components/Icons";



const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reselling Toolbox",
  description: "Tracking Stock and Sales",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="mainContent">{children}</main>
      </body>
    </html>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white hover:bg-gray-50 transition
                 text-gray-700 hover:text-gray-900"
    >
      {children}
    </Link>
  );
}
<div className="ml-auto flex items-center gap-2">
  <IconLink href="/account" label="Account">
    <AccountIcon />
  </IconLink>

  <IconLink href="/settings" label="Settings">
    <SettingsCogIcon />
  </IconLink>
</div>