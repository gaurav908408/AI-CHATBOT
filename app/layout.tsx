import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: ' chatboat',
  description: 'WhatsApp Pink Theme GF Companion AI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
