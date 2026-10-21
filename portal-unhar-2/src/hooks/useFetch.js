import { useState, useEffect, useCallback, useRef } from 'react'
import { getErrorMessage } from '../services/api'

/**
 * useFetch — hook generik untuk fetch data dari API.
 *
 * @param {Function} fetchFn  — fungsi async yang memanggil API, harus return axios response
 * @param {Array}    deps     — dependensi (seperti useEffect), trigger re-fetch jika berubah
 * @param {Object}   options  — { immediate: bool, initialData: any }
 *
 * @example
 *   const { data, loading, error, refetch } = useFetch(
 *     () => nilaiService.getAll(),
 *     []
 *   )
 */
export function useFetch(fetchFn, deps = [], options = {}) {
  const { immediate = true, initialData = null, interval = null } = options

  const [data,    setData]    = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error,   setError]   = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn()
      if (mounted.current) {
        // Aman terhadap response kosong / non-axios (misal Promise.resolve([]))
        const result = res?.data?.data ?? res?.data ?? res ?? null
        setData(result)
      }
    } catch (err) {
      if (mounted.current) {
        setError(getErrorMessage(err))
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (immediate) fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch])

  // Polling otomatis jika interval diisi (ms). Contoh: interval=15000 → fetch tiap 15 detik
  // PENTING: bergantung pada `fetch` (bukan hanya `interval`), supaya jika `deps`
  // berubah setelah mount (mis. `role` baru tersedia), interval polling otomatis
  // memakai versi `fetch` terbaru — bukan closure lama yang sudah basi.
  useEffect(() => {
    if (!interval || interval <= 0) return
    const id = setInterval(fetch, interval)
    return () => clearInterval(id)
  }, [interval, fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * useSubmit — hook untuk POST/PUT/DELETE dengan loading & error state.
 *
 * @example
 *   const { submit, loading, error } = useSubmit(
 *     (data) => krsService.addMatkul(krsId, data.jadwal_id),
 *     { onSuccess: (res) => refetch() }
 *   )
 */
export function useSubmit(submitFn, { onSuccess, onError } = {}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const submit = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await submitFn(...args)
      onSuccess?.(res.data)
      return { success: true, data: res.data }
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      onError?.(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }, [submitFn, onSuccess, onError])

  return { submit, loading, error, clearError: () => setError(null) }
}
