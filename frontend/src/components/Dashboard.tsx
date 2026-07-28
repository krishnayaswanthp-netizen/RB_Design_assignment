import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import mammoth from 'mammoth/mammoth.browser'
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
    loadProfile()
    showPaymentNotice()
    if (user?.id) {
      fetchHistory()
    }
  }, [user.id])

  async function loadProfile() {
    const { data } = await supabase
      .from('users')
      .select('plan_tier, usage_count')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setPlanTier(data.plan_tier ?? 'free')
      setUsageCount(data.usage_count ?? 0)
    }
  }

  async function fetchHistory() {
    try {
      // Query evaluations table first
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (evalData && evalData.length > 0) {
        setHistory(evalData)
        return
      }

      // Fallback to reviews table
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

      if (response.status === 403) {
        setError('Free tier limit reached! Upgrade to Pro to continue.')
        return
      }

      if (!response.ok) {
        setError(data.detail ?? 'Review failed. Please try again.')
        return
      }

      setResult(data)
      setUsageCount(data.usage_count)
      setPlanTier(data.plan_tier)

      // Save to Supabase evaluations table for persistent memory
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Header
        planTier={planTier}
        usageCount={usageCount}
        onLogout={handleLogout}
        onManageBilling={handleManageBilling}
        managingBilling={managingBilling}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {notice ? (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            {notice}
          </div>
        ) : null}

        {planTier === 'free' ? (
          <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-200 bg-white/80 p-5 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Upgrade to Pro for $15/mo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {remaining} free reviews remaining. Pro unlocks unlimited evaluations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Upgrade
            </button>
          </section>
        ) : null}

        {error ? (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleReview}
            className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur"
          >
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold">Resume analysis</h2>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Job Description</span>
                <textarea
                  required
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  className="mt-2 min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-cyan-500 focus:bg-white"
                  placeholder="Paste the role requirements, skills, and experience expectations."
                />
              </label>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">Resume Content</span>
                  <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setResumeMode('upload')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        resumeMode === 'upload'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeMode('paste')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        resumeMode === 'paste'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
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
                      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-white p-3 text-cyan-700 shadow-sm">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{uploadedResume.name}</p>
                              <p className="text-sm text-slate-600">
                                {formatFileSize(uploadedResume.size)} parsed successfully
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-xl border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                            >
                              Replace File
                            </button>
                            <button
                              type="button"
                              onClick={removeUploadedFile}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <X className="h-4 w-4" />
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
                        className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                          isDragging
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-slate-300 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/60'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {parsingFile ? (
                          <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
                        ) : (
                          <UploadCloud className="h-10 w-10 text-cyan-600" />
                        )}
                        <p className="mt-4 font-semibold text-slate-950">
                          {parsingFile ? 'Parsing resume...' : 'Drop resume here or browse'}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">PDF, DOCX, or TXT files</p>
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
                    className="min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-cyan-500 focus:bg-white"
                    placeholder="Paste the candidate resume text."
                  />
                )}
              </section>
            </div>

            <button
              type="submit"
              disabled={loading || parsingFile || !canAnalyze}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Analyze Resume
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
            <h2 className="text-lg font-semibold">ATS feedback</h2>

            {result ? (
              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-medium text-slate-600">Match Score</p>
                    <p className="text-4xl font-bold text-slate-950">{result.score}%</p>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-cyan-600 transition-all"
                      style={{ width: `${Math.min(Math.max(result.score, 0), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Detailed Feedback
                  </h3>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {result.feedback}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                Submit a resume to generate score, reasoning, matched skills, and gaps.
              </div>
            )}
          </section>
        </div>

        {/* Evaluation History Section */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-950">Evaluation Memory &amp; History</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Click on any past evaluation scan below to view its score and feedback.
          </p>

          {history.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((item) => {
                const score = item.match_score ?? item.score ?? 0
                return (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-500 hover:bg-cyan-50/50 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">
                        {score}% Match
                      </span>
                      {item.created_at ? (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-600 group-hover:text-slate-900">
                      {item.job_description}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No evaluation memory recorded yet. Analyze a resume to save history!
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
