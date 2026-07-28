import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../supabaseClient'

type AuthMode = 'login' | 'signup'

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const authCall =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })

    const { error } = await authCall
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      mode === 'login'
        ? 'Signed in successfully.'
        : 'Account created. Check your email if confirmation is enabled.',
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F6F2] font-sans px-6 py-12 text-[#2F2F2F] selection:bg-[#707B63]/20 selection:text-[#2F2F2F]">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#707B63] transition-all hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
          <section className="grid w-full overflow-hidden rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] shadow-[0_6px_24px_rgba(47,47,47,0.04)] md:grid-cols-[1.1fr_0.9fr]">
            {/* Left Hero Panel */}
            <div className="flex flex-col justify-between border-b border-[#E6E0D8] bg-[#F2EEE7] p-8 sm:p-10 md:border-r md:border-b-0">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#707B63]">
                  AI Resume Screener
                </p>
                <h1 className="mt-6 font-serif text-3xl sm:text-4xl font-normal leading-snug text-[#2F2F2F]">
                  Evaluate candidates against real job requirements.
                </h1>
                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[#66635F]">
                  Get an objective ATS match score, recruiter reasoning, and candidate memory in one quiet workspace.
                </p>
              </div>

              <div className="mt-12 text-xs text-[#66635F]">
                <p>© {new Date().getFullYear()} Thoughtful Recruitment Technology.</p>
              </div>
            </div>

            {/* Right Auth Form Sheet */}
            <div className="bg-[#FCFBF8] p-8 sm:p-10">
              <div className="mb-8 flex rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                    mode === 'login'
                      ? 'bg-[#FCFBF8] text-[#2F2F2F] shadow-sm'
                      : 'text-[#66635F] hover:text-[#2F2F2F]'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                    mode === 'signup'
                      ? 'bg-[#FCFBF8] text-[#2F2F2F] shadow-sm'
                      : 'text-[#66635F] hover:text-[#2F2F2F]'
                  }`}
                >
                  Signup
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#66635F]">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] px-4 py-3 text-xs sm:text-sm text-[#2F2F2F] outline-none transition focus:border-[#707B63] focus:bg-[#FCFBF8] focus-visible:ring-2 focus-visible:ring-[#707B63]"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#66635F]">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] px-4 py-3 text-xs sm:text-sm text-[#2F2F2F] outline-none transition focus:border-[#707B63] focus:bg-[#FCFBF8] focus-visible:ring-2 focus-visible:ring-[#707B63]"
                    placeholder="Minimum 6 characters"
                  />
                </label>

                {message ? (
                  <p className="rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] px-4 py-3 text-xs font-medium text-[#2F2F2F]">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F2F2F] px-5 py-3 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-[0_4px_16px_rgba(47,47,47,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#F8F6F2]" />
                  ) : mode === 'login' ? (
                    <LogIn className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {mode === 'login' ? 'Login' : 'Create account'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
