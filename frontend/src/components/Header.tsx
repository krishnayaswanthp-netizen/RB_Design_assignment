import { Link } from 'react-router-dom'
import { CreditCard, Home, Loader2, LogOut } from 'lucide-react'

type HeaderProps = {
  planTier: string
  usageCount: number
  onLogout: () => void
  onManageBilling?: () => void
  managingBilling?: boolean
}

export function Header({
  planTier,
  usageCount,
  onLogout,
  onManageBilling,
  managingBilling = false,
}: HeaderProps) {
  const isPro = planTier === 'pro'

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <Link to="/" className="group inline-block">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 transition group-hover:text-cyan-600">
          AI Resume Screener
        </h1>
        <p className="text-sm text-slate-500">Candidate fit analysis dashboard</p>
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isPro
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isPro ? 'Pro' : 'Free'}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          {isPro ? 'Unlimited' : `${usageCount} / 5 used`}
        </span>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Home className="h-4 w-4 text-slate-600" />
          Landing Page
        </Link>

        {isPro && onManageBilling ? (
          <button
            type="button"
            onClick={onManageBilling}
            disabled={managingBilling}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {managingBilling ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-slate-600" />
            )}
            Manage Billing
          </button>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  )
}
