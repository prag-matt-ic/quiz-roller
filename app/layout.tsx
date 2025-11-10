import './globals.css'

import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Nunito_Sans } from 'next/font/google'

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
})

const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Quizroller',
    default: 'Quizroller | 3D Quiz Game',
  },
  description:
    'A 3D quiz game built using React Three Fiber and Rapier physics. How far can you roll?',
  appleWebApp: {
    title: 'Quizroller',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
}

export const viewport: Viewport = {
  initialScale: 1,
  width: 'device-width, shrink-to-fit=no',
  height: 'device-height',
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#030b2a',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${nunitoSans.variable} overflow-hidden antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
