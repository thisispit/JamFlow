import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JamFlow — Synchronized Collaborative Listening Platform',
  description:
    'Listen together in real time. Create a room, invite friends, and experience synchronized YouTube music & videos with shared queues and reactions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-fuchsia-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
