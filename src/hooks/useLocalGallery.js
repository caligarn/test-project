import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * localStorage-backed list shared by the gallery games.
 *
 * Fixes the copy-pasted pattern's failure modes in one place:
 * - corrupt JSON no longer crashes the game at mount
 * - every list is capped (Community Comic previously grew unbounded)
 * - QuotaExceededError is handled by evicting the oldest half and retrying,
 *   instead of surfacing as a misleading "check your Fal.ai key" error
 *
 * mode 'prepend': newest first (galleries). mode 'append': keeps story order
 * (comic panels, chains).
 */
export function useLocalGallery(storageKey, { cap = 50, mode = 'prepend' } = {}) {
  const [items, setItems] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })

  const persist = useCallback(
    (updated) => {
      setItems(updated)
      itemsRef.current = updated
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        const half = Math.max(1, Math.ceil(updated.length / 2))
        const trimmed = mode === 'prepend' ? updated.slice(0, half) : updated.slice(-half)
        try {
          localStorage.setItem(storageKey, JSON.stringify(trimmed))
          setItems(trimmed)
          itemsRef.current = trimmed
        } catch {
          // Storage unavailable: keep in-memory state so the session still works
        }
      }
    },
    [storageKey, mode]
  )

  const add = useCallback(
    (entry) => {
      const current = itemsRef.current
      const updated =
        mode === 'prepend'
          ? [entry, ...current].slice(0, cap)
          : [...current, entry].slice(-cap)
      persist(updated)
      return updated
    },
    [persist, cap, mode]
  )

  const update = useCallback(
    (id, updater) => {
      persist(itemsRef.current.map((it) => (it.id === id ? updater(it) : it)))
    },
    [persist]
  )

  const remove = useCallback(
    (id) => {
      persist(itemsRef.current.filter((it) => it.id !== id))
    },
    [persist]
  )

  return { items, add, update, remove }
}
