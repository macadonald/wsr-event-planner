'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, Role } from '@/lib/types'
import { inviteUser, updateUserRole, setUserActive } from '@/app/actions/users'

const ROLES: Role[] = ['admin', 'planner', 'viewer']

export default function UsersList({
  profiles,
  currentUserId,
}: {
  profiles: Profile[]
  currentUserId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('planner')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviting, setInviting] = useState(false)

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    if (!inviteEmail.trim()) return
    setInviting(true)
    const result = await inviteUser(inviteEmail.trim(), inviteName.trim(), inviteRole)
    setInviting(false)
    if (result.error) { setInviteError(result.error); return }
    setInviteSuccess(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviteName('')
    refresh()
  }

  async function handleRoleChange(userId: string, role: Role) {
    const result = await updateUserRole(userId, role)
    if (result.error) alert(result.error)
    else refresh()
  }

  async function handleToggleActive(profile: Profile) {
    const result = await setUserActive(profile.id, !profile.active)
    if (result.error) alert(result.error)
    else refresh()
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Invite form */}
      <form onSubmit={handleInvite} className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-brown-600">Invite new user</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-brown-400 mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="name@example.com"
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-brown-400 mb-1">Full name</label>
            <input
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brown-400 mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as Role)}
              className="border border-cream-300 rounded-lg px-3 py-2 text-sm bg-cream-50 focus:outline-none focus:ring-2 focus:ring-brown-300"
            >
              {ROLES.map(r => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={inviting}
              className="bg-brown-500 hover:bg-brown-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </div>
        {inviteError && <p className="text-red-600 text-sm">{inviteError}</p>}
        {inviteSuccess && <p className="text-green-700 text-sm">{inviteSuccess}</p>}
      </form>

      {/* Users table */}
      <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-brown-400 uppercase tracking-wide">Name / Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-brown-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-brown-400 uppercase tracking-wide">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => {
              const isMe = profile.id === currentUserId
              return (
                <tr key={profile.id} className={`border-b border-cream-100 last:border-0 ${!profile.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brown-700">{profile.full_name || '—'}</div>
                    <div className="text-xs text-brown-300">{profile.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isMe ? (
                      <span className="capitalize text-brown-500">{profile.role}</span>
                    ) : (
                      <select
                        value={profile.role}
                        onChange={e => handleRoleChange(profile.id, e.target.value as Role)}
                        disabled={!profile.active}
                        className="border border-cream-300 rounded px-2 py-1 text-xs bg-cream-50 focus:outline-none focus:ring-1 focus:ring-brown-300 capitalize"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r} className="capitalize">{r}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      profile.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-cream-200 text-brown-400'
                    }`}>
                      {profile.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && (
                      <button
                        onClick={() => handleToggleActive(profile)}
                        className={`text-xs px-2 py-1 transition-colors ${
                          profile.active
                            ? 'text-red-400 hover:text-red-600'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {profile.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                    {isMe && <span className="text-xs text-brown-200">you</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
