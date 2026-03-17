import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });



export const metadata: Metadata = {
  title: 'Quizo',
  description: 'Secure Quiz Platform',
  generator: 'Next.js',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

// 1. Initialize the font
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono', // This links it to Tailwind's font-mono class
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 2. Add the variable to your HTML tag
    <html lang="en" className={`${jetbrainsMono.variable}`}>
      {/* 3. Ensure the body uses font-mono */}
      <body className="font-mono bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}