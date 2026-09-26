import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'AI Chatbot',
  description: 'AI Chatbot Assistant',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
