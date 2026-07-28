import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen bg-[#F8F6F2] font-sans text-[#2F2F2F] selection:bg-[#707B63]/20 selection:text-[#2F2F2F]">
      {/* Editorial Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#E6E0D8] bg-[#F8F6F2]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-lg bg-[#2F2F2F] text-[#F8F6F2]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#2F2F2F] sm:text-3xl">
              AI Resume Screener
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleHeroCta}
              className="rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] px-4 py-2 text-xs sm:text-sm font-medium text-[#2F2F2F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Login / Signup'}
            </button>
            <button
              type="button"
              onClick={handleHeroCta}
              className="hidden rounded-xl bg-[#2F2F2F] px-5 py-2 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] sm:inline-block"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-24 md:pt-28 md:pb-36">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#E6E0D8] bg-[#F2EEE7] px-4 py-1.5 text-xs sm:text-sm font-medium tracking-wide text-[#66635F]">
              <Sparkles className="h-3.5 w-3.5 text-[#707B63]" />
              Tactile &amp; Objective Candidate Evaluation
            </div>

            {/* Dominant Hero Heading (Balanced Middle Ground) */}
            <h1 className="font-serif text-5xl font-normal leading-[1.12] tracking-tight text-[#2F2F2F] sm:text-6xl md:text-7xl">
              Objective Resume Screening &amp; Fit Analysis
            </h1>

            {/* Comfortable Reading Body Text (18-20px) */}
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[#66635F] sm:text-xl font-light">
              Replace subjective filtering with recruiter-level reasoning. Evaluate candidates directly against custom job requirements with calm, clear ATS scoring.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleHeroCta}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-[#2F2F2F] px-8 py-3.5 text-sm sm:text-base font-semibold text-[#F8F6F2] shadow-[0_6px_24px_rgba(47,47,47,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started for Free'}
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="border-t border-[#E6E0D8] bg-[#F2EEE7]/60 py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#2F2F2F] sm:text-4xl">
              Crafted for Thoughtful Recruiting
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-[#66635F] sm:text-base">
              Essential tools designed to bring clarity and accuracy to your hiring workflow.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2EEE7] text-[#707B63]">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2F2F2F] sm:text-2xl">Multi-Format Document Parsing</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#66635F]">
                Parse candidate files seamlessly in <strong>PDF</strong>, <strong>DOCX</strong>, or <strong>TXT</strong> format with instant client-side text extraction.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2EEE7] text-[#707B63]">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2F2F2F] sm:text-2xl">LLM Recruiter Reasoning</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#66635F]">
                Deep fit breakdown powered by LangChain and Llama 3 models, articulating candidate strengths and missing requirements.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2EEE7] text-[#707B63]">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2F2F2F] sm:text-2xl">Instant Candidate Matching</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#66635F]">
                Objective criteria evaluation strictly benchmarked against your role expectations without recruiter bias.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quiet Luxury Pricing Table (2 Tiers) */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#2F2F2F] sm:text-4xl">
              Simple, Transparent Membership
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed text-[#66635F] sm:text-base">
              Select the plan that aligns with your evaluation volume.
            </p>
          </div>

          {error ? (
            <div className="mx-auto mt-8 flex max-w-md items-center gap-2.5 rounded-xl border border-[#A85A48]/30 bg-[#A85A48]/10 px-4 py-3 text-xs font-medium text-[#A85A48]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#A85A48]" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-16 grid max-w-4xl mx-auto gap-8 lg:grid-cols-2">
            {/* Free Plan */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.03)] transition-all duration-300">
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#2F2F2F] sm:text-3xl">Free Plan</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#66635F]">Ideal for testing resume screening accuracy.</p>
                <div className="mt-6 flex items-baseline">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#2F2F2F]">$0</span>
                  <span className="ml-2 text-xs sm:text-sm text-[#66635F]">/month</span>
                </div>

                <ul className="mt-8 space-y-4 text-xs sm:text-sm text-[#66635F]">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>5 Resume Evaluations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>PDF, DOCX &amp; TXT Parsing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>Basic ATS Fit Score &amp; Feedback</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleFreePlanCta}
                className="mt-10 w-full rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] py-3.5 text-xs sm:text-sm font-semibold text-[#2F2F2F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
              >
                {isLoggedIn
                  ? planTier === 'free'
                    ? 'Current Plan'
                    : 'Go to Dashboard'
                  : 'Start Free'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-[#707B63] bg-[#FCFBF8] p-8 shadow-[0_6px_24px_rgba(47,47,47,0.05)] transition-all duration-300">
              <div className="absolute -top-3.5 right-6 rounded-full bg-[#707B63] px-3.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#F8F6F2]">
                Recommended
              </div>

              <div>
                <h3 className="font-serif text-2xl font-normal text-[#2F2F2F] sm:text-3xl">Pro Plan</h3>
                <p className="mt-2 text-xs sm:text-sm text-[#66635F]">For active recruiters &amp; hiring managers.</p>
                <div className="mt-6 flex items-baseline">
                  <span className="font-serif text-5xl sm:text-6xl font-normal text-[#2F2F2F]">$15</span>
                  <span className="ml-2 text-xs sm:text-sm text-[#66635F]">/month</span>
                </div>

                <ul className="mt-8 space-y-4 text-xs sm:text-sm text-[#2F2F2F]">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span className="font-semibold text-[#2F2F2F]">Unlimited Evaluations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>PDF, DOCX &amp; TXT Parsing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>Priority AI Processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-[#707B63]" />
                    <span>Saved Evaluation History</span>
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
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F2F2F] py-3.5 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-[0_4px_16px_rgba(47,47,47,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#F8F6F2]" />
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

      {/* Editorial Footer */}
      <footer className="border-t border-[#E6E0D8] py-10 text-center text-xs text-[#66635F]">
        <p>© {new Date().getFullYear()} AI Resume Screener. Thoughtful Recruitment Technology.</p>
      </footer>
    </div>
  )
}
