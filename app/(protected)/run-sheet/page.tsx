import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Department } from '@/lib/types'
import RunSheetForm from './run-sheet-form'

export default async function RunSheetPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('active').eq('id', user.id).single()
  if (!profile?.active) redirect('/login')

  const { data: deptData } = await supabase
    .from('departments').select('*').eq('active', true).order('sort_order')

  const departments = (deptData ?? []) as Department[]

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brown-800 font-serif">Department Run Sheet</h1>
        <p className="text-sm text-brown-400 mt-1">Generate a printable task list for one or all departments across a date range.</p>
      </div>
      <RunSheetForm departments={departments} />
    </div>
  )
}
