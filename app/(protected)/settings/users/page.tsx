import { createClient } from '@/lib/supabase/server'
import UsersList from '@/components/settings/users-list'

export default async function UsersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div>
      <p className="text-sm text-brown-400 mb-4">
        Invite users by email. Only invited users can sign in — public sign-up is disabled.
      </p>
      <UsersList profiles={profiles ?? []} currentUserId={user!.id} />
    </div>
  )
}
