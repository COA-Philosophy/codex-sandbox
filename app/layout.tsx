// path: app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthSync from './providers/AuthSync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CodeBaton v2 - StructureBoard',
  description: 'AI協奏型開発システム - 構造管理統合版',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className={inter.className}>
        <AuthSync />
        {children}
      </body>
    </html>
  )
}