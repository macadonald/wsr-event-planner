import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsNav from '@/components/settings/settings-nav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brown-500 mb-4">Settings</h1>
        <SettingsNav />
      </div>
      {children}
    </div>
  )
}
