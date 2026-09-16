import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from './ui/AppShell'

export const metadata: Metadata = {
  title: 'Sport Tracker',
  description: 'Personal training plan and activity log',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
