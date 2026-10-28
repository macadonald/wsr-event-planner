import { createClient } from '@/lib/supabase/server'
import DepartmentsList from '@/components/settings/departments-list'
import type { DepartmentWithRecipients } from '@/lib/types'

export default async function DepartmentsPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('departments')
    .select('*, department_recipients(*)')
    .order('sort_order', { ascending: true })

  // Double-cast needed: Supabase infers SelectQueryError for nested selects without Relationships
  const departments = (data ?? []) as unknown as DepartmentWithRecipients[]

  return (
    <div>
      <p className="text-sm text-brown-400 mb-4">
        Manage departments. Deactivated departments remain on existing events but won&apos;t appear for new assignments.
      </p>
      <DepartmentsList departments={departments} />
    </div>
  )
}
