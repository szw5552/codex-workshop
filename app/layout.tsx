import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talk Archive',
  description: '演講照片、重點與完整逐字稿整理。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
