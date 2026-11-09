import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { withTicket } from '../lib/play'

/**
 * Shared community gallery for one game, stored on the server so every
 * player sees every entry (newest first).
 *
 *   const g = useSharedGallery('haiku-canvas')
 *   g.items       [{ id, username, avatar, imageUrl, beforeUrl?, text, meta, createdAt, votes, voted }]
 *   g.loading, g.error
 *   await g.add({ imageUrl, beforeUrl?, text, meta })  // needs this game's play ticket (any AI call made one)
 *   await g.vote(id)                                   // toggles; anyone can vote, once per item
 *   g.reload()
 * Polls every `pollMs` (default 20 s) so new entries from other players appear.
 */
export function useSharedGallery(gameId, { limit = 50, pollMs = 20000 } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const data = await api(`/gallery/${gameId}?limit=${limit}`)
      if (!alive.current) return
      setItems(data.items)
      setError(null)
    } catch (err) {
      if (alive.current) setError(err.message)
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [gameId, limit])

  useEffect(() => {
    alive.current = true
    reload()
    const id = pollMs ? setInterval(reload, pollMs) : null
    return () => {
      alive.current = false
      if (id) clearInterval(id)
    }
  }, [reload, pollMs])

  const add = useCallback(
    async (entry) => {
      const { item } = await withTicket((ticket) => api(`/gallery/${gameId}`, { method: 'POST', body: entry, ticket }), gameId)
      if (alive.current) setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)])
      return item
    },
    [gameId]
  )

  const vote = useCallback(
    async (id) => {
      const result = await api(`/gallery/${gameId}/${id}/vote`, { method: 'POST', body: {} })
      if (alive.current) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...result } : i)))
      return result
    },
    [gameId]
  )

  return { items, loading, error, add, vote, reload }
}
