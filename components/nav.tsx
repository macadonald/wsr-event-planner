'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface NavProps {
  profile: Profile
}

export default function Nav({ profile }: NavProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile.full_name || profile.email || 'User'

  return (
    <nav className="bg-brown-500 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-serif text-lg font-bold tracking-wide">WSR Events</span>
          <Link
            href="/dashboard"
            className="text-sm text-cream-200 hover:text-white transition-colors hidden sm:block"
          >
            Dashboard
          </Link>
          <Link
            href="/run-sheet"
            className="text-sm text-cream-200 hover:text-white transition-colors hidden sm:block"
          >
            Run Sheet
          </Link>
          {profile.role === 'admin' && (
            <Link
              href="/settings"
              className="text-sm text-cream-200 hover:text-white transition-colors hidden sm:block"
            >
              Settings
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-cream-300 hidden sm:block">
            {displayName}
            <span className="ml-1 opacity-60 capitalize text-xs">({profile.role})</span>
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm text-cream-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
