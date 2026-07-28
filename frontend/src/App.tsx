import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { LandingPage } from './components/LandingPage'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Loading
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route
          path="/auth"
          element={session ? <Navigate to="/dashboard" replace /> : <Auth />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              {session ? <Dashboard user={session.user} /> : null}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

type ProtectedRouteProps = {
  session: Session | null
  children: React.ReactNode
}

function ProtectedRoute({ session, children }: ProtectedRouteProps) {
  const location = useLocation()

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

export default App
