import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import mammoth from 'mammoth/mammoth.browser'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { Header } from './Header'
import { supabase } from '../supabaseClient'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type DashboardProps = {
  user: User
}

type ReviewResult = {
  success: boolean
  score: number
  feedback: string
  usage_count: number
  plan_tier: string
}

type EvaluationHistoryItem = {
  id: string
  created_at?: string
  job_description: string
  match_score?: number
  score?: number
  feedback: string
}

type ResumeMode = 'upload' | 'paste'

type UploadedResume = {
  name: string
  size: number
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const acceptedResumeTypes = '.pdf,.docx,.txt'

function CopyableItem({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-between items-center p-3 rounded-xl bg-[#FCFBF8] border border-[#E6E0D8] mb-2 group hover:border-[#707B63]/40 transition-colors">
      <span className="text-sm text-[#2F2F2F] font-medium leading-normal">{text}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="no-print ml-3 text-xs px-2.5 py-1 bg-[#F2EEE7] border border-[#E6E0D8] rounded-lg hover:bg-[#E6E0D8]/60 transition-all font-semibold text-[#2F2F2F] shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
      >
        {copied ? '✓ Copied!' : label ? `📋 ${label}` : '📋 Copy'}
      </button>
    </div>
  )
}

function parseFeedbackItems(feedback: string): string[] {
  if (!feedback) return []
  const lines = feedback.split('\n')
  const items: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const isBullet = /^[-*•\d+.]+\s+/.test(trimmed)
    const cleaned = trimmed.replace(/^[-*•\d+.]+\s*/, '').trim()

    if (
      cleaned.length > 5 &&
      !cleaned.endsWith(':') &&
      !cleaned.toLowerCase().startsWith('score:') &&
      !cleaned.toLowerCase().startsWith('suggested resume')
    ) {
      if (isBullet || items.length > 0) {
        items.push(cleaned)
      }
    }
  }
  return items
}

export function Dashboard({ user }: DashboardProps) {
  const [planTier, setPlanTier] = useState('free')
  const [usageCount, setUsageCount] = useState(0)
  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeMode, setResumeMode] = useState<ResumeMode>('upload')
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsingFile, setParsingFile] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)
  const [history, setHistory] = useState<EvaluationHistoryItem[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const remaining = useMemo(() => Math.max(5 - usageCount, 0), [usageCount])
  const canAnalyze = jobDescription.trim().length > 0 && resumeText.trim().length > 0

  useEffect(() => {
    async function fetchPersistentUsage() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        const res = await fetch(`${apiBaseUrl}/api/user/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (typeof data.credits_used === 'number') {
            setUsageCount((prev) => Math.max(prev, data.credits_used))
          }
        }
      } catch (err) {
        console.error('Failed to fetch persistent usage:', err)
      }
    }

    loadProfile()
    fetchPersistentUsage()
    showPaymentNotice()
    if (user?.id) {
      fetchHistory()
    }
  }, [user?.id])

  async function loadProfile() {
    const { data } = await supabase
      .from('users')
      .select('plan_tier, usage_count')
      .eq('id', user.id)
      .maybeSingle()

    if (data?.plan_tier) {
      setPlanTier(data.plan_tier)
    }

    const tableUsage = data?.usage_count ?? 0

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (accessToken) {
        const res = await fetch(`${apiBaseUrl}/api/user/usage`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const usageData = await res.json()
          const trackerUsage = typeof usageData.credits_used === 'number' ? usageData.credits_used : 0
          setUsageCount(Math.max(tableUsage, trackerUsage))
          return
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user usage from backend:', err)
    }

    setUsageCount((prev) => Math.max(prev, tableUsage))
  }

  async function fetchHistory() {
    try {
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (evalData && evalData.length > 0) {
        setHistory(evalData)
        return
      }

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (reviewData) {
        const formatted = reviewData.map((item) => ({
          id: item.id,
          created_at: item.created_at,
          job_description: item.job_description,
          score: extractScoreFromFeedback(item.feedback),
          match_score: extractScoreFromFeedback(item.feedback),
          feedback: item.feedback,
        }))
        setHistory(formatted)
      }
    } catch (err) {
      console.warn('Failed to fetch history:', err)
    }
  }

  function extractScoreFromFeedback(fb: string): number {
    if (!fb) return 0
    const match = fb.match(/Score:\s*(\d+)\/100/)
    return match ? parseInt(match[1], 10) : 70
  }

  function showPaymentNotice() {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')

    if (payment === 'success') {
      setNotice('Payment successful. Your Pro access will update shortly.')
    }

    if (payment === 'cancelled') {
      setNotice('Checkout cancelled. Your plan was not changed.')
    }

    if (payment) {
      window.history.replaceState({}, '', '/dashboard')
      window.setTimeout(() => setNotice(''), 5000)
    }
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function parseResumeFile(file: File) {
    setError('')
    setResult(null)
    setParsingFile(true)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let parsedText = ''

      if (extension === 'txt') {
        parsedText = await file.text()
      } else if (extension === 'pdf') {
        parsedText = await extractPdfText(file)
      } else if (extension === 'docx') {
        parsedText = await extractDocxText(file)
      } else {
        throw new Error('Unsupported file type. Upload a PDF, DOCX, or TXT file.')
      }

      if (!parsedText.trim()) {
        throw new Error('No readable text found in this file.')
      }

      setResumeText(parsedText.trim())
      setUploadedResume({ name: file.name, size: file.size })
      setResumeMode('upload')
    } catch (fileError) {
      removeUploadedFile()
      setError(
        fileError instanceof Error
          ? fileError.message
          : 'Unable to parse resume file.',
      )
    } finally {
      setParsingFile(false)
    }
  }

  async function extractPdfText(file: File) {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1)
        const content = await page.getTextContent()
        return content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      }),
    )

    return pageTexts.join('\n\n')
  }

  async function extractDocxText(file: File) {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      parseResumeFile(file)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) {
      parseResumeFile(file)
    }
  }

  function removeUploadedFile() {
    setUploadedResume(null)
    setResumeText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canAnalyze) {
      setError('Add a job description and parsed resume content before analyzing.')
      return
    }

    setError('')
    setResult(null)
    setLoading(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setError('Session expired. Please log in again.')
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          job_description: jobDescription,
          resume_text: resumeText,
        }),
      })

      const data = await response.json()

      if (response.status === 403 || response.status === 429) {
        setError(data.detail ?? 'Credit limit reached! Upgrade to Pro to continue.')
        return
      }

      if (!response.ok) {
        setError(data.detail ?? 'Review failed. Please try again.')
        return
      }

      setResult(data)
      setUsageCount(data.usage_count)
      setPlanTier(data.plan_tier)

      try {
        await supabase.from('evaluations').insert([
          {
            user_id: user.id,
            job_description: jobDescription,
            match_score: data.score,
            feedback: data.feedback,
          },
        ])
      } catch (saveErr) {
        console.warn('Failed to save evaluation memory:', saveErr)
      }

      fetchHistory()
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Review failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    setError('')
    setUpgrading(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setError('Session expired. Please log in again.')
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        setError(data.detail ?? 'Unable to start checkout.')
        return
      }

      window.location.href = data.url
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Unable to start checkout.',
      )
    } finally {
      setUpgrading(false)
    }
  }

  async function handleManageBilling() {
    setError('')
    setManagingBilling(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setError('Session expired. Please log in again.')
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        setError(data.detail ?? 'Unable to open billing portal.')
        return
      }

      window.location.href = data.url
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : 'Unable to open billing portal.',
      )
    } finally {
      setManagingBilling(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function loadHistoryItem(item: EvaluationHistoryItem) {
    const scoreVal = item.match_score ?? item.score ?? 0
    const feedbackStr =
      typeof item.feedback === 'string'
        ? item.feedback
        : JSON.stringify(item.feedback, null, 2)

    setJobDescription(item.job_description || '')
    setResult({
      success: true,
      score: scoreVal,
      feedback: feedbackStr,
      usage_count: usageCount,
      plan_tier: planTier,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const feedbackItems = useMemo(() => {
    return result ? parseFeedbackItems(result.feedback) : []
  }, [result])

  return (
    <main className="min-h-screen bg-[#F8F6F2] font-sans text-[#2F2F2F] selection:bg-[#707B63]/20 selection:text-[#2F2F2F]">
      <Header
        planTier={planTier}
        usageCount={usageCount}
        onLogout={handleLogout}
        onManageBilling={handleManageBilling}
        managingBilling={managingBilling}
      />

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Payment Notice Banner */}
        {notice ? (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-[#4A6B53]/30 bg-[#4A6B53]/10 px-4 py-3 text-xs font-medium text-[#4A6B53]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4A6B53]" />
            {notice}
          </div>
        ) : null}

        {/* Upgrade Banner for Free Users */}
        {planTier === 'free' ? (
          <section className="upgrade-banner mb-8 flex flex-col gap-4 rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-6 shadow-[0_6px_24px_rgba(47,47,47,0.03)] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#2F2F2F] sm:text-2xl">
                Upgrade to Pro Membership ($15/mo)
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#66635F]">
                {remaining} free evaluations remaining. Pro unlocks unlimited evaluations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F2F2F] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#F8F6F2]" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Upgrade Now
            </button>
          </section>
        ) : null}

        {/* Error Alert */}
        {error ? (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-[#A85A48]/30 bg-[#A85A48]/10 px-4 py-3 text-xs font-medium text-[#A85A48]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#A85A48]" />
            {error}
          </div>
        ) : null}

        {/* Workspace Form and ATS Results Grid */}
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Resume & Job Description Input Form */}
          <form
            onSubmit={handleReview}
            className="no-print rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-7 shadow-[0_6px_24px_rgba(47,47,47,0.03)]"
          >
            <div className="mb-6 flex items-center gap-2.5">
              <Sparkles className="h-4.5 w-4.5 text-[#707B63]" />
              <h2 className="font-serif text-2xl font-semibold text-[#2F2F2F] sm:text-3xl">Resume Analysis</h2>
            </div>

            <div className="space-y-6">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-[#66635F]">
                  Job Description &amp; Role Requirements
                </span>
                <textarea
                  required
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  className="mt-2 min-h-52 w-full resize-y rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] px-4 py-3 text-sm sm:text-base leading-relaxed text-[#2F2F2F] outline-none transition duration-200 placeholder:text-[#66635F]/60 focus:border-[#707B63] focus:bg-[#FCFBF8] focus-visible:ring-2 focus-visible:ring-[#707B63]"
                  placeholder="Paste the role requirements, required skills, and candidate background expectations."
                />
              </label>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#66635F]">
                    Resume Content
                  </span>
                  <div className="flex rounded-lg border border-[#E6E0D8] bg-[#F2EEE7] p-1">
                    <button
                      type="button"
                      onClick={() => setResumeMode('upload')}
                      className={`rounded-md px-3 py-1 text-xs sm:text-sm font-medium transition ${
                        resumeMode === 'upload'
                          ? 'bg-[#FCFBF8] text-[#2F2F2F] shadow-sm'
                          : 'text-[#66635F] hover:text-[#2F2F2F]'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeMode('paste')}
                      className={`rounded-md px-3 py-1 text-xs sm:text-sm font-medium transition ${
                        resumeMode === 'paste'
                          ? 'bg-[#FCFBF8] text-[#2F2F2F] shadow-sm'
                          : 'text-[#66635F] hover:text-[#2F2F2F]'
                      }`}
                    >
                      Paste Text
                    </button>
                  </div>
                </div>

                {resumeMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={acceptedResumeTypes}
                      onChange={handleFileChange}
                      className="sr-only"
                    />

                    {uploadedResume ? (
                      <div className="rounded-xl border border-[#707B63]/30 bg-[#F2EEE7]/80 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-[#FCFBF8] p-3 text-[#707B63] shadow-sm border border-[#E6E0D8]">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-serif text-base font-semibold text-[#2F2F2F]">{uploadedResume.name}</p>
                              <p className="text-xs text-[#66635F]">
                                {formatFileSize(uploadedResume.size)} parsed successfully
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-lg border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#2F2F2F] transition hover:border-[#707B63]"
                            >
                              Replace File
                            </button>
                            <button
                              type="button"
                              onClick={removeUploadedFile}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#66635F] transition hover:bg-[#F2EEE7]"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(event) => {
                          event.preventDefault()
                          setIsDragging(true)
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-300 ${
                          isDragging
                            ? 'border-[#707B63] bg-[#F2EEE7]'
                            : 'border-[#E6E0D8] bg-[#F8F6F2] hover:border-[#707B63]/60 hover:bg-[#F2EEE7]/60'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {parsingFile ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#707B63]" />
                        ) : (
                          <UploadCloud className="h-8 w-8 text-[#707B63]" />
                        )}
                        <p className="mt-3 font-serif text-base font-semibold text-[#2F2F2F] sm:text-lg">
                          {parsingFile ? 'Parsing candidate document...' : 'Drop resume file here or browse'}
                        </p>
                        <p className="mt-1 text-xs text-[#66635F]">Supports PDF, DOCX, or TXT documents</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    required={resumeMode === 'paste'}
                    value={resumeText}
                    onChange={(event) => {
                      setResumeText(event.target.value)
                      setUploadedResume(null)
                    }}
                    className="min-h-52 w-full resize-y rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] px-4 py-3 text-sm sm:text-base leading-relaxed text-[#2F2F2F] outline-none transition focus:border-[#707B63] focus:bg-[#FCFBF8] focus-visible:ring-2 focus-visible:ring-[#707B63]"
                    placeholder="Paste candidate resume text here."
                  />
                )}
              </section>
            </div>

            <button
              type="submit"
              disabled={loading || parsingFile || !canAnalyze}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F2F2F] px-5 py-3.5 text-xs sm:text-sm font-semibold text-[#F8F6F2] shadow-[0_4px_16px_rgba(47,47,47,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#F8F6F2]" /> : null}
              Evaluate Candidate Fit
            </button>
          </form>

          {/* Hero ATS Result Screen */}
          <section className="evaluation-results-card rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-7 shadow-[0_6px_24px_rgba(47,47,47,0.03)]">
            <div className="mb-4 flex items-center justify-between border-b border-[#E6E0D8] pb-3 no-print">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#66635F]">
                ATS Evaluation Result
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2F2F2F] px-3.5 py-1.5 text-xs font-semibold text-[#F8F6F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
              >
                📄 Download PDF Report
              </button>
            </div>

            {result ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-4 space-y-6"
              >
                {/* Circular Score Gauge & Readout */}
                <div className="result-section flex flex-col items-center rounded-2xl border border-[#E6E0D8] bg-[#F8F6F2] p-6 text-center">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        className="text-[#E6E0D8]"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#707B63] transition-all duration-1000 ease-out"
                        strokeDasharray={`${Math.min(Math.max(result.score, 0), 100)}, 100`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-serif text-3xl font-bold text-[#2F2F2F] sm:text-4xl">{result.score}%</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#66635F]">Match</span>
                    </div>
                  </div>
                </div>

                {/* Recruiter Feedback Details & Copyable Suggestions */}
                <div className="result-section rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] p-5">
                  <h3 className="mb-3 font-serif text-sm font-semibold uppercase tracking-wider text-[#66635F]">
                    Recruiter Reasoning &amp; Breakdown
                  </h3>
                  <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-[#2F2F2F]">
                    {result.feedback}
                  </div>

                  {feedbackItems.length > 0 ? (
                    <div className="mt-6 border-t border-[#E6E0D8] pt-4">
                      <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#66635F]">
                        Suggested Resume Bullet Points (Copy &amp; Paste)
                      </span>
                      <div className="space-y-2">
                        {feedbackItems.map((item, idx) => (
                          <CopyableItem key={idx} text={item} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#E6E0D8] bg-[#F8F6F2] p-8 text-center text-xs sm:text-sm leading-relaxed text-[#66635F]">
                Upload a candidate resume and job description to generate fit score, strengths, and recruiter breakdown.
              </div>
            )}
          </section>
        </div>

        {/* Evaluation Memory History Section */}
        <section className="no-print mt-10 rounded-2xl border border-[#E6E0D8] bg-[#FCFBF8] p-7 shadow-[0_6px_24px_rgba(47,47,47,0.03)]">
          <div className="flex items-center gap-2.5">
            <History className="h-4.5 w-4.5 text-[#707B63]" />
            <h2 className="font-serif text-2xl font-semibold text-[#2F2F2F] sm:text-3xl">Evaluation Memory &amp; History</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#66635F]">
            Click on any previous evaluation below to inspect past match score and detailed feedback.
          </p>

          {history.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((item) => {
                const score = item.match_score ?? item.score ?? 0
                return (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="group cursor-pointer rounded-xl border border-[#E6E0D8] bg-[#F8F6F2] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/50 hover:bg-[#FCFBF8] hover:shadow-[0_4px_16px_rgba(47,47,47,0.04)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#707B63]/15 px-3 py-0.5 text-[10px] font-bold text-[#4A6B53]">
                        {score}% Match
                      </span>
                      {item.created_at ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#66635F]">
                          <Clock className="h-3 w-3 text-[#66635F]" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs sm:text-sm leading-relaxed text-[#66635F] group-hover:text-[#2F2F2F]">
                      {item.job_description}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[#E6E0D8] bg-[#F8F6F2] p-6 text-center text-xs sm:text-sm text-[#66635F]">
              No past evaluations recorded yet. Run a resume analysis to store evaluation memory!
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
