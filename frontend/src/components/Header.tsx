import { Link } from 'react-router-dom'
import { CreditCard, Home, Loader2, LogOut, User as UserIcon } from 'lucide-react'

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
    <header className="sticky top-0 z-40 border-b border-[#E6E0D8] bg-[#F8F6F2]/90 px-6 py-4 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="group inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] rounded-lg">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#2F2F2F] transition-colors group-hover:text-[#707B63] sm:text-3xl">
            AI Resume Screener
          </h1>
          <p className="text-xs font-sans tracking-wide text-[#66635F]">
            Candidate Fit Analysis &amp; ATS Evaluation
          </p>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-semibold tracking-wide ${
              isPro
                ? 'bg-[#707B63]/15 text-[#4A6B53] border border-[#707B63]/30'
                : 'bg-[#F2EEE7] text-[#C28E46] border border-[#E6E0D8]'
            }`}
          >
            {isPro ? 'Pro Member' : 'Free Tier'}
          </span>

          <span className="rounded-full bg-[#F2EEE7] px-3.5 py-1 text-xs sm:text-sm font-medium text-[#66635F] border border-[#E6E0D8]">
            {isPro ? 'Unlimited Access' : `${usageCount} / 5 Used`}
          </span>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#2F2F2F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
          >
            <Home className="h-3.5 w-3.5 text-[#66635F]" />
            Landing Page
          </Link>

          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#2F2F2F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
          >
            <UserIcon className="h-3.5 w-3.5 text-[#66635F]" />
            Profile
          </Link>

          {isPro && onManageBilling ? (
            <button
              type="button"
              onClick={onManageBilling}
              disabled={managingBilling}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#2F2F2F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#707B63]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {managingBilling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#66635F]" />
              ) : (
                <CreditCard className="h-3.5 w-3.5 text-[#66635F]" />
              )}
              Manage Billing
            </button>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E6E0D8] bg-[#FCFBF8] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#66635F] shadow-[0_2px_8px_rgba(47,47,47,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:text-[#2F2F2F] hover:border-[#E6E0D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#707B63]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
