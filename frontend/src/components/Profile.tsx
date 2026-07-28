import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2, User as UserIcon } from 'lucide-react'
import { supabase } from '../supabaseClient'

type ProfileProps = {
  user: User
  onBack?: () => void
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function Profile({ user, onBack }: ProfileProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? All evaluation memory will be permanently lost.',
    )
    if (!confirmDelete) return

    setDeleting(true)
    setError('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const response = await fetch(
        `${apiBaseUrl}/api/user/delete?user_id=${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      )

      if (response.ok) {
        await supabase.auth.signOut()
        window.location.href = '/'
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.detail ?? 'Error deleting account. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to connect to backend server.')
    } finally {
      setDeleting(false)
    }
  }

  function handleBackClick() {
    if (onBack) {
      onBack()
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={handleBackClick}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Account Profile</h2>
              <p className="text-sm text-slate-400">Manage your user account settings</p>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </span>
              <p className="mt-1 text-lg font-semibold text-white">{user?.email}</p>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                User ID
              </span>
              <p className="mt-1 font-mono text-xs text-slate-300">{user?.id}</p>
            </div>
          </div>

          <div className="border-t border-red-500/20 pt-6">
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="mt-1 text-sm text-slate-400">
              Permanently remove your account and wipe all stored evaluation history.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete My Account
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
