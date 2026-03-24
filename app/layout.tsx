import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ui } from "@/lib/ui";

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
      <body>
        <Navbar />
        <main className={ui.mainContent}>{children}</main>
      </body>
    </html>
  );
}
