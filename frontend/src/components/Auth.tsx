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
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        {/* Navigation Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <section className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-slate-950 p-8 md:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
                AI Resume Screener
              </p>
              <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Screen resumes against real job requirements.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-cyan-50/85">
                Get an ATS-style match score and direct recruiter feedback in one
                workflow.
              </p>
            </div>

            <div className="bg-slate-950/80 p-6 md:p-10">
              <div className="mb-8 flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    mode === 'login'
                      ? 'bg-white text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    mode === 'signup'
                      ? 'bg-white text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Signup
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-200">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-200">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                    placeholder="Minimum 6 characters"
                  />
                </label>

                {message ? (
                  <p className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : mode === 'login' ? (
                    <LogIn className="h-5 w-5" />
                  ) : (
                    <UserPlus className="h-5 w-5" />
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
