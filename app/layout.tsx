import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WSR Event Planner',
  description: 'White Stallion Ranch — internal event planning tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
