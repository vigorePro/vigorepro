import type { Metadata } from 'next'
import { Oswald, Jost, Dancing_Script } from 'next/font/google'
import './globals.css'

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
})
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
})
const dancing = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dancing',
})

export const metadata: Metadata = {
  title: 'VigorePro',
  description: 'SaaS de atendimento por IA para food service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${jost.variable} ${oswald.variable} ${dancing.variable} font-jost`}>{children}</body>
    </html>
  )
}
