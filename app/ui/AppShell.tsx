'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const NAV_LINKS = [
  { href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/plan', label: 'Training plan', icon: PlanIcon },
  { href: '/history', label: 'Activity log', icon: HistoryIcon },
  { href: '/progress', label: 'Progress', icon: ProgressIcon },
]

function CalendarIcon() { return <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /> }
function PlanIcon() { return <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /> }
function HistoryIcon() { return <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68M4 4v4.68h4.68M12 8v4l2.5 1.5" /> }
function ProgressIcon() { return <path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6" /> }
function SettingsIcon() { return <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /> }

function Icon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

function AppLink({ href, label, icon: NavIcon }: (typeof NAV_LINKS)[number]) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return <Link href={href} className="app-nav-link" data-active={active || undefined}><Icon><NavIcon /></Icon><span>{label}</span></Link>
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/login') return <>{children}</>

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/calendar" className="brand" aria-label="Pace home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span><strong>Pace</strong><small>Train with intention</small></span>
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {NAV_LINKS.map((link) => <AppLink key={link.href} {...link} />)}
        </nav>
        <div className="sidebar-footer">
          <Link href="/settings/strava" className="app-nav-link" data-active={pathname.startsWith('/settings') || undefined}><Icon><SettingsIcon /></Icon><span>Settings</span></Link>
          <form action="/logout" method="post"><button type="submit" className="sign-out">Sign out</button></form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{NAV_LINKS.map((link) => <AppLink key={link.href} {...link} />)}</nav>
    </div>
  )
}
