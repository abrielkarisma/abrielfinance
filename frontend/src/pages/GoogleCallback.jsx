import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function GoogleCallback() {
  const [params] = useSearchParams()
  const { login } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    const access = params.get('access_token')
    const refresh = params.get('refresh_token')
    const userRaw = params.get('user')
    if (access && refresh && userRaw) {
      let user
      try { user = JSON.parse(userRaw) } catch { user = null }
      login({ access_token: access, refresh_token: refresh, user })
      nav('/', { replace: true })
    } else {
      nav('/login', { replace: true })
    }
  }, [params, login, nav])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#23272c_0%,#14161a_55%,#101216_100%)]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-60" />
    </div>
  )
}
