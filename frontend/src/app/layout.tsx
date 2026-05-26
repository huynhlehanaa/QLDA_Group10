import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'KPI Frontend',
  description: 'Frontend cho CEO và Manager'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f5f7fb' }}>
        {children}
      </body>
    </html>
  );
}
