import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getMe } from './api'
import { AppDataProvider } from './context/AppDataContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Applications from './pages/Applications'
import Networking from './pages/Networking'
import Analytics from './pages/Analytics'
import Lamp from './pages/Lamp'

function AppInner() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [hasSheet, setHasSheet] = useState(false)
  const navigate = useNavigate()

  const fetchMe = async () => {
    try {
      const res = await getMe()
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      const data = await res.json()
      setUser(data)
      setAuthed(true)
      setHasSheet(data.has_sheet)
      if (!data.has_sheet) navigate('/setup')
    } catch {
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMe() }, [])

  const handleAuthError = () => {
    setAuthed(false)
    setUser(null)
    setHasSheet(false)
    navigate('/')
  }

  const handle403 = (redirectTo) => {
    if (redirectTo) navigate(redirectTo)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authed) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {hasSheet && <Navbar user={user} onLogout={handleAuthError} />}
      <Routes>
        <Route path="/setup" element={<Setup onAuthError={handleAuthError} onConnected={async () => { await fetchMe(); navigate('/') }} />} />
        {hasSheet ? (
          <>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/applications" element={<Applications onAuthError={handleAuthError} on403={handle403} />} />
            <Route path="/networking" element={<Networking onAuthError={handleAuthError} on403={handle403} />} />
            <Route path="/analytics" element={<Analytics onAuthError={handleAuthError} on403={handle403} />} />
            <Route path="/lamp" element={<Lamp onAuthError={handleAuthError} on403={handle403} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/setup" replace />} />
        )}
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <AppInner />
      </AppDataProvider>
    </BrowserRouter>
  )
}