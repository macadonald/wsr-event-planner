'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function Nav({ profile }: { profile: Profile }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/dashboard',  label: 'Dashboard' },
    { href: '/calendar',   label: 'Calendar' },
    { href: '/checklist',  label: 'Checklist' },
    { href: '/run-sheet',  label: 'Run Sheet' },
    { href: '/inventory',  label: 'Inventory' },
    ...(profile.role === 'admin' ? [{ href: '/settings', label: 'Settings' }] : []),
  ]

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
  }

  const displayName = profile.full_name || profile.email || 'User'

  return (
    <nav className="bg-brown-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <span className="font-serif text-lg font-bold tracking-wide shrink-0">WSR Events</span>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-6 ml-6">
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors ${
                isActive(l.href)
                  ? 'text-white font-semibold underline underline-offset-4 decoration-white/50'
                  : 'text-cream-200 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop: user + sign out */}
        <div className="hidden sm:flex items-center gap-4 ml-auto">
          <span className="text-sm text-cream-300">
            {displayName}
            <span className="ml-1 opacity-60 capitalize text-xs">({profile.role})</span>
          </span>
          <button onClick={handleSignOut} className="text-sm text-cream-200 hover:text-white transition-colors">
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="sm:hidden ml-auto w-10 h-10 flex flex-col items-center justify-center gap-[5px] shrink-0"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`block w-5 h-0.5 bg-white transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden bg-brown-600 border-t border-brown-400">
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center px-5 py-3.5 text-sm border-b border-brown-500/60 transition-colors ${
                isActive(l.href)
                  ? 'text-white font-semibold bg-brown-700'
                  : 'text-cream-200 hover:bg-brown-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs text-cream-400">
              {displayName}
              <span className="ml-1 opacity-70 capitalize">({profile.role})</span>
            </span>
            <button
              onClick={() => { setMenuOpen(false); handleSignOut() }}
              className="text-sm text-cream-200 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
