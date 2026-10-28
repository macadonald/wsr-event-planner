'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/settings/departments', label: 'Departments' },
  { href: '/settings/users', label: 'Users' },
]

export default function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b border-cream-300">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
            pathname.startsWith(tab.href)
              ? 'text-brown-600 border-brown-500'
              : 'text-brown-300 border-transparent hover:text-brown-500 hover:border-brown-300'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
