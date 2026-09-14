import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sport Tracker',
  description: 'Personal training plan and activity log',
}

const NAV_LINKS = [
  { href: '/calendar', label: 'Calendar' },
  { href: '/plan', label: 'Plan' },
  { href: '/history', label: 'History' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings/strava', label: 'Strava' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="flex items-center justify-between border-b px-4 py-3">
          <nav className="flex gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </a>
            ))}
          </nav>
          <form action="/logout" method="post">
            <button type="submit" className="text-sm text-gray-500 hover:underline">
              Sign out
            </button>
          </form>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  )
}
