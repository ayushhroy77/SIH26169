import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FSOC Virtual Camera Tracking System — ISRO / SIH 2024',
  description:
    'AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile Free Space Optical Communication (FSOC) Terminals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-[#5B8DEF]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
