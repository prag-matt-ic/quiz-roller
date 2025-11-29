import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Nunito_Sans, Unbounded } from 'next/font/google'

import './globals.css'

const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  weight: ['400', '600', '900'],
  display: 'swap',
})

const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin'],
  weight: ['400', '700', '900'],
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
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunitoSans.variable} ${unbounded.variable} overflow-hidden antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
