import { useEffect, useState } from 'react'
import api from './api.js'

export function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export async function fetchPeriods(count = 12, asOf) {
  const { data } = await api.get('/reports/periods', {
    params: { count, as_of: asOf || todayStr() }
  })
  return data.periods
}

// Ambil daftar periode (terbaru -> terlama). refreshKey dipakai biar refetch
// waktu setting gajian berubah.
export function usePeriods(count = 12, salaryDay, endOfMonth) {
  const [periods, setPeriods] = useState([])
  useEffect(() => {
    let alive = true
    fetchPeriods(count)
      .then((p) => { if (alive) setPeriods(p) })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, salaryDay, endOfMonth])
  return periods
}
