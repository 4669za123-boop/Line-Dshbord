import type { Metadata } from 'next'
import {
  Plus_Jakarta_Sans,
  Noto_Sans_Thai,
  JetBrains_Mono,
} from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const fontSansLatin = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans-latin',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const fontSansThai = Noto_Sans_Thai({
  subsets: ['latin', 'thai'],
  variable: '--font-sans-thai',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'LINE Management Dashboard',
  description: 'Manage your LINE accounts and websites',
  generator: 'v0.app',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="th"
      className={`dark bg-background ${fontSansLatin.variable} ${fontSansThai.variable} ${fontMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
