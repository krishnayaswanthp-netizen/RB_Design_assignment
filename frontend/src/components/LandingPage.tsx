import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  FileText,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react'
import { supabase } from '../supabaseClient'

type LandingPageProps = {
  session?: Session | null
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function LandingPage({ session = null }: LandingPageProps) {
  const navigate = useNavigate()
  const [planTier, setPlanTier] = useState<'free' | 'pro' | string>('free')
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')

  const isLoggedIn = !!session?.user

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from('users')
        .select('plan_tier')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.plan_tier) {
            setPlanTier(data.plan_tier)
          }
        })
    }
  }, [session?.user?.id])

  async function handleProUpgrade() {
    if (!session?.user) {
      navigate('/auth')
      return
    }

    setError('')
    setUpgrading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        navigate('/auth')
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: session.user.id }),
      })

      const data = await response.json()

      if (!response.ok || !data.url) {
        setError(data.detail ?? 'Unable to start checkout. Please try again.')
        return
      }

      window.location.href = data.url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to start checkout session.',
      )
    } finally {
      setUpgrading(false)
    }
  }

  function handleHeroCta() {
    if (isLoggedIn) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  function handleFreePlanCta() {
    if (isLoggedIn) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              AI Resume Screener
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleHeroCta}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Login / Signup'}
            </button>
            <button
              type="button"
              onClick={handleHeroCta}
              className="hidden rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 sm:inline-block"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-40 right-10 -z-10 h-[400px] w-[400px] rounded-full bg-blue-600/15 blur-3xl" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            Next-Gen Candidate Screening
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-tight">
            AI-Powered Resume Screening &amp; Fit Analysis
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl leading-relaxed">
            Eliminate manual resume filtering. Evaluate candidate applications against job requirements with objective ATS-style scoring and recruiter reasoning in seconds.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleHeroCta}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-4 text-base font-bold text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:scale-105 hover:shadow-cyan-500/40"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started for Free'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="border-t border-white/10 bg-slate-900/50 py-20 px-6 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for Modern Recruiting
            </h2>
            <p className="mt-4 text-slate-400">
              Powerful tools designed to accelerate your talent evaluation pipeline.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-cyan-500/50 hover:bg-white/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white">Multi-Format Parsing</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Upload resumes seamlessly in <strong>PDF</strong>, <strong>DOCX</strong>, or <strong>TXT</strong> format with instant client-side text extraction.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-cyan-500/50 hover:bg-white/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white">LLM-Powered Reasoning</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Deep ATS match score breakdown powered by LangChain and Llama 3 models, identifying exact skill overlaps and gaps.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-cyan-500/50 hover:bg-white/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white">Instant Candidate Matching</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Objective criteria evaluation strictly mapped to your custom job descriptions without subjective recruiter bias.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Table (2 Tiers) */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-slate-400">
              Choose the plan that fits your screening volume.
            </p>
          </div>

          {error ? (
            <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-12 grid max-w-4xl mx-auto gap-8 lg:grid-cols-2">
            {/* Free Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl">
              <div>
                <h3 className="text-2xl font-bold text-white">Free Plan</h3>
                <p className="mt-2 text-sm text-slate-400">Great for trying out AI resume screening.</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-extrabold text-white">$0</span>
                  <span className="ml-2 text-slate-400">/month</span>
                </div>

                <ul className="mt-8 space-y-4 text-sm text-slate-300">
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>5 Resume Evaluations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>PDF, DOCX &amp; TXT Parsing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>Basic ATS Fit Score &amp; Feedback</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleFreePlanCta}
                className="mt-8 w-full rounded-2xl border border-white/20 bg-white/5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {isLoggedIn
                  ? planTier === 'free'
                    ? 'Current Plan'
                    : 'Go to Dashboard'
                  : 'Start Free'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col justify-between rounded-3xl border-2 border-cyan-500 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-900 p-8 shadow-2xl shadow-cyan-500/20">
              <div className="absolute -top-4 right-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
                Most Popular
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">Pro Plan</h3>
                <p className="mt-2 text-sm text-cyan-200/80">For high-volume hiring managers &amp; recruiters.</p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-extrabold text-white">$15</span>
                  <span className="ml-2 text-slate-400">/month</span>
                </div>

                <ul className="mt-8 space-y-4 text-sm text-slate-200">
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span className="font-semibold text-white">Unlimited Evaluations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>PDF, DOCX &amp; TXT Parsing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>Priority AI Processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span>Saved Review History</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={
                  isLoggedIn
                    ? planTier === 'pro'
                      ? () => navigate('/dashboard')
                      : handleProUpgrade
                    : () => navigate('/auth')
                }
                disabled={upgrading}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3.5 text-sm font-bold text-slate-950 transition hover:opacity-90 shadow-lg shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {upgrading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isLoggedIn ? (
                  planTier === 'pro' ? (
                    'Active Pro Plan'
                  ) : (
                    'Upgrade to Pro'
                  )
                ) : (
                  'Upgrade to Pro'
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} AI Resume Screener. All rights reserved.</p>
      </footer>
    </div>
  )
}
