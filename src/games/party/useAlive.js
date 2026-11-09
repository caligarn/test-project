import { useRef, useEffect } from 'react'

/** ref.current is false once the component unmounted (drop late async results). */
export function useAlive() {
  const ref = useRef(true)
  useEffect(() => {
    ref.current = true
    return () => {
      ref.current = false
    }
  }, [])
  return ref
}
