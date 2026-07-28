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
    <main className="min-h-screen bg-[#F8F6F2] font-sans px-6 py-12 text-[#2F2F2F] selection:bg-[#707B63]/20 selection:text-[#2F2F2F]">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={handleBackClick}
          className="mb-8 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#707B63] transition-all hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <section className="rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.03)]">
          <div className="mb-8 flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2EEE7] text-[#707B63]">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2F2F2F]">Account Profile</h2>
              <p className="text-xs sm:text-sm text-[#66635F]">Manage your account identity and stored records</p>
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-xl border border-[#A85A48]/30 bg-[#A85A48]/10 p-4 text-xs font-medium text-[#A85A48]">
              {error}
            </div>
          ) : null}

          <div className="mb-8 space-y-4 rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] p-6">
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#66635F]">
                Email Address
              </span>
              <p className="mt-1 font-serif text-lg sm:text-xl font-semibold text-[#2F2F2F]">{user?.email}</p>
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#66635F]">
                User ID
              </span>
              <p className="mt-1 font-mono text-xs text-[#66635F]">{user?.id}</p>
            </div>
          </div>

          <div className="border-t border-[#A85A48]/20 pt-6">
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#A85A48]">Danger Zone</h3>
            <p className="mt-1 text-xs sm:text-sm text-[#66635F]">
              Permanently remove your user account and wipe all stored evaluation memory.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#A85A48] px-5 py-3 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-[0_4px_16px_rgba(168,90,72,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#8F4839] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A85A48] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#F8F6F2]" />
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
