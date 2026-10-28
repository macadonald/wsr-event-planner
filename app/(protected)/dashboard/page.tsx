import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-brown-500">Dashboard</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-6 max-w-lg">
        <p className="text-brown-600">
          Welcome, <span className="font-semibold">{profile?.full_name || user?.email}</span>.
        </p>
        <p className="text-sm text-brown-300 mt-1 capitalize">Role: {profile?.role}</p>
        <p className="text-sm text-brown-300 mt-4">
          Events and assignments are coming in Phase 3 and 4.
        </p>
      </div>
    </div>
  )
}
