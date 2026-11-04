export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { RunSheetPDF } from '@/lib/pdf/run-sheet'
import { RanchLedgerRunSheetPDF } from '@/lib/pdf/ranch-ledger-run'
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
  const deptsParam = searchParams.get('depts') ?? 'all'
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''
  const style = searchParams.get('style') === 'classic' ? 'classic' : 'ledger'
  const layout = searchParams.get('layout') === 'combined' ? 'combined' : 'paged'

  if (!fromDate || !toDate) return new Response('Missing from/to params', { status: 400 })

  const deptIds = deptsParam === 'all' ? null : deptsParam.split(',').filter(Boolean)

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

  if (deptIds) {
    query = query.in('department_id', deptIds)
  }

  const [{ data: rawAssignments }, { data: allDepts }] = await Promise.all([
    query,
    supabase.from('departments').select('*').order('sort_order'),
  ])

  const departments = sortDeptsByPdfOrder(
    deptIds
      ? ((allDepts ?? []) as Department[]).filter(d => deptIds.includes(d.id))
      : (allDepts ?? []) as Department[]
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

  const sharedProps = { departments, assignmentsByDept, fromDate, toDate, layout: layout as 'paged' | 'combined' }

  type PdfArg = Parameters<typeof renderToBuffer>[0]
  const element = style === 'classic'
    ? <RunSheetPDF {...sharedProps} />
    : <RanchLedgerRunSheetPDF {...sharedProps} />

  const buffer = await renderToBuffer(element as unknown as PdfArg)

  const deptLabel = deptIds && deptIds.length === 1
    ? (departments[0]?.name.toLowerCase().replace(/\s+/g, '-') ?? deptIds[0])
    : 'all-depts'
  const filename = `run-sheet-${deptLabel}-${fromDate}.pdf`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
