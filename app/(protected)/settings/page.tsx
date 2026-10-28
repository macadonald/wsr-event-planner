import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brown-500 mb-8">Settings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-6 max-w-lg">
        <p className="text-brown-600">
          Departments and Users management are coming in Phase 2.
        </p>
      </div>
    </div>
  )
}
