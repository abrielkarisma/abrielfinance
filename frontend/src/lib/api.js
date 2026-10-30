import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('access_token')
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config
    if (error.response?.status === 401 && !orig?._retry) {
      orig._retry = true
      try {
        const rt = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: rt })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        orig.headers.Authorization = `Bearer ${data.access_token}`
        return api(orig)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(error)
  }
)

export default api

export function fmtIDR(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(n || 0))
}

export function errMsg(e) {
  return e?.response?.data?.detail || 'Terjadi kesalahan'
}


export function fmtMoney(v) {
  const s = String(v == null ? '' : v).replace(/[^\d]/g, '')
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
export function parseMoney(s) {
  return Number(String(s || '').replace(/[^\d]/g, '')) || 0
}
