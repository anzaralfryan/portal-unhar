import { useEffect, useState } from 'react'

/**
 * useIsMobile — hook yang mengembalikan true jika viewport ≤ breakpoint px.
 * Dipakai untuk toggle layout mobile khusus mahasiswa.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= breakpoint
  })

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= breakpoint)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])

  return isMobile
}
