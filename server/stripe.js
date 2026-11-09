// Stripe credit packs.
//
// Players buy a pack through a Stripe Payment Link; the Subscribe page adds
// their username as client_reference_id. Stripe then calls our webhook.
// We do not trust the webhook body: we take only the event id and fetch the
// event from the Stripe API with our secret key, so a forged call cannot add
// credits. Each event is applied once.

import { getStore } from './store.js'
import { HttpError } from './http.js'
import { getUser } from './auth.js'
import { addPaidCredits } from './economy.js'

function creditsByLink() {
  const map = {}
  for (const part of String(process.env.STRIPE_CREDITS_BY_LINK || '').split(',')) {
    const [link, amount] = part.split(':').map((s) => s && s.trim())
    const n = parseInt(amount, 10)
    if (link && n > 0) map[link] = n
  }
  return map
}

async function fetchEvent(id) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new HttpError(503, 'not_configured', 'Payments are not configured.')
  const res = await fetch(`https://api.stripe.com/v1/events/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)
  if (!res || res.status === 404) throw new HttpError(400, 'bad_event', 'Unknown event.')
  if (!res.ok) throw new HttpError(502, 'upstream_error', 'Could not verify the payment.')
  return res.json()
}

export async function handleStripeWebhook(body) {
  const id = String(body?.id || '')
  if (!/^evt_[A-Za-z0-9]+$/.test(id)) throw new HttpError(400, 'bad_event', 'Bad event.')
  const event = await fetchEvent(id)
  if (event.type !== 'checkout.session.completed') return { ok: true, ignored: event.type }
  const session = event.data?.object || {}
  if (session.payment_status !== 'paid') return { ok: true, ignored: 'unpaid' }
  const credits = creditsByLink()[session.payment_link]
  const username = String(session.client_reference_id || '')
  if (!credits) return { ok: true, ignored: 'unknown_link' }
  const user = username ? await getUser(username) : null
  if (!user) {
    console.warn(`Stripe payment ${session.id} has no known user (${username}); refund or credit it by hand.`)
    return { ok: true, ignored: 'unknown_user' }
  }
  const fresh = await getStore().cmd('SADD', 'stripe:events', id)
  if (!fresh) return { ok: true, duplicate: true }
  await addPaidCredits(`u:${user.username.toLowerCase()}`, credits)
  return { ok: true, credited: credits }
}
