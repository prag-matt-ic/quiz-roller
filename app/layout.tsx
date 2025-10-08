import './globals.css'

import type { Metadata } from 'next'
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
  title: 'Quiz Roller',
  description: 'How far will you roll?',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${nunitoSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
