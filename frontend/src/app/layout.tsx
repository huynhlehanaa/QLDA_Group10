import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "KPI Noi Bo",
  description: "Ung dung KPI cho nhan vien",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
