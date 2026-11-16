import type { Metadata } from 'next'
import { Rajdhani, Inter } from 'next/font/google'
import './globals.css'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'AWTU — Automotriz Web Tool',
  description: 'Sistema de gestión para talleres automotrices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${rajdhani.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}