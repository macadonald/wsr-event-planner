export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { RunSheetPDF } from '@/lib/pdf/run-sheet'
import type { RunSheetAssignment } from '@/lib/pdf/run-sheet'
import type { Assignment, Department } from '@/lib/types'
import { sortDeptsByPdfOrder } from '@/lib/pdf/shared'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('active').eq('id', user.id).single()
  if (!profile?.active) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const deptParam = searchParams.get('dept') ?? 'all'
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  if (!fromDate || !toDate) return new Response('Missing from/to params', { status: 400 })

  type AssignmentWithEvent = Assignment & {
    events: { name: string; location: string | null; pax: number | null } | null
  }

  let query = supabase
    .from('assignments')
    .select('*, events!inner(name, location, pax)')
    .gte('task_date', fromDate)
    .lte('task_date', toDate)
    .order('department_id')
    .order('task_date')
    .order('task_time')

  if (deptParam !== 'all') {
    query = query.eq('department_id', deptParam)
  }

  const [{ data: rawAssignments }, { data: allDepts }] = await Promise.all([
    query,
    supabase.from('departments').select('*').order('sort_order'),
  ])

  const departments = sortDeptsByPdfOrder(
    deptParam === 'all'
      ? (allDepts ?? []) as Department[]
      : ((allDepts ?? []) as Department[]).filter(d => d.id === deptParam)
  )

  const assignments: RunSheetAssignment[] = ((rawAssignments ?? []) as unknown as AssignmentWithEvent[]).map(a => ({
    ...a,
    event_name: a.events?.name ?? '',
    event_location: a.events?.location ?? null,
    event_pax: a.events?.pax ?? null,
  }))

  const assignmentsByDept = new Map<string, RunSheetAssignment[]>()
  for (const a of assignments) {
    if (!assignmentsByDept.has(a.department_id)) assignmentsByDept.set(a.department_id, [])
    assignmentsByDept.get(a.department_id)!.push(a)
  }

  type PdfArg = Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(<RunSheetPDF
    departments={departments}
    assignmentsByDept={assignmentsByDept}
    fromDate={fromDate}
    toDate={toDate}
  /> as unknown as PdfArg)

  const deptLabel = deptParam === 'all'
    ? 'all-depts'
    : (departments[0]?.name.toLowerCase().replace(/\s+/g, '-') ?? deptParam)
  const filename = `run-sheet-${deptLabel}-${fromDate}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
