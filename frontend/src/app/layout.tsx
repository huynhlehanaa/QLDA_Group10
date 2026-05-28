import type { Metadata } from "next";
import PwaRegister from "../components/PwaRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: "KPI Noi Bo",
  description: "Ung dung KPI cho nhan vien",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
