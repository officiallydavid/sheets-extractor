import { useState, useEffect, useCallback } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function AppContent() {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('ede_token'))
  const [sessionMsg, setSessionMsg] = useState('')

  useEffect(() => {
    if (!accessToken) return
    const stored = localStorage.getItem('ede_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('ede_user') }
    }
  }, [accessToken])

  const login = useGoogleLogin({
    onSuccess: async tokenResponse => {
      const token = tokenResponse.access_token
      sessionStorage.setItem('ede_token', token)
      setAccessToken(token)
      setSessionMsg('')

      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch user info')
        const info = await res.json()
        setUser(info)
        localStorage.setItem('ede_user', JSON.stringify(info))
      } catch (err) {
        console.error(err)
      }
    },
    onError: err => console.error('Google login error:', err),
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ].join(' '),
  })

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    sessionStorage.removeItem('ede_token')
    localStorage.removeItem('ede_user')
    setSessionMsg('')
  }, [])

  const handleSessionExpired = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    sessionStorage.removeItem('ede_token')
    localStorage.removeItem('ede_user')
    setSessionMsg('Your session has expired. Please sign in again — your scan history is preserved.')
  }, [])

  if (!user || !accessToken) {
    return (
      <Login
        onLogin={login}
        clientIdMissing={!CLIENT_ID}
        sessionMessage={sessionMsg}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      accessToken={accessToken}
      onLogout={logout}
      onSessionExpired={handleSessionExpired}
    />
  )
}

export default function App() {
  if (!CLIENT_ID) {
    return (
      <Login
        onLogin={() => {}}
        clientIdMissing
        sessionMessage=""
      />
    )
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  )
}
