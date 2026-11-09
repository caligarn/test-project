import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Crown, Check, Zap, Shield, ArrowLeft, Star, Coins, Gift, LogIn, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCredits } from '../context/CreditContext'
import { api } from '../lib/api'

// Payments are not live yet. A plan or pack becomes buyable when its Stripe
// Payment Link is set in the environment; otherwise it shows "Coming soon".
// Credits are never granted in the browser: the server adds them (redeem
// codes today, a Stripe webhook later).
const env = import.meta.env

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Zap,
    cardClass: 'brutalist-card',
    btnClass: 'bg-surface-lighter text-navy/50 border-navy',
    features: (freeDaily) => [
      'All games, solo and party mode',
      `${freeDaily} free credits every day`,
      'Daily Challenge, free to play',
      'Shared leaderboards',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    icon: Crown,
    cardClass: 'brutalist-card-pink',
    btnClass: 'bg-highlight text-navy border-navy',
    link: env.VITE_STRIPE_PRO_LINK,
    features: () => [
      'Everything in Free',
      '50 extra credits every month',
      'Support new games',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$9.99',
    period: '/month',
    icon: Shield,
    cardClass: 'brutalist-card-green',
    btnClass: 'bg-navy text-accent border-navy',
    link: env.VITE_STRIPE_TEAM_LINK,
    features: () => [
      'Everything in Pro',
      '200 extra credits every month',
      'Made for parties and live events',
    ],
  },
]

const CREDIT_PACKS = [
  { id: 'starter', credits: 10, price: '$1.99', color: '#C8FF00', link: env.VITE_STRIPE_PACK_STARTER_LINK },
  { id: 'popular', credits: 50, price: '$7.99', color: '#FF2D55', popular: true, link: env.VITE_STRIPE_PACK_POPULAR_LINK },
  { id: 'mega', credits: 150, price: '$19.99', color: '#8B5CF6', link: env.VITE_STRIPE_PACK_MEGA_LINK },
]

const PACKS_LIVE = CREDIT_PACKS.some((p) => p.link)
const PLANS_LIVE = PLANS.some((p) => p.link)

/** Stripe Payment Link with the account name, so the payment can be matched to the player. */
function checkoutUrl(link, username) {
  try {
    const url = new URL(link)
    if (username) url.searchParams.set('client_reference_id', username)
    return url.toString()
  } catch {
    return null
  }
}

export default function Subscribe() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { credits, refresh } = useCredits()
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState(null) // { ok, text }
  const freeDaily = credits?.freeDaily ?? 5

  function openCheckout(link) {
    const url = checkoutUrl(link, user?.username)
    if (url) window.open(url, '_blank', 'noopener')
  }

  async function handleRedeem(e) {
    e.preventDefault()
    const code = redeemCode.trim()
    if (!code || redeeming) return
    setRedeeming(true)
    setRedeemMsg(null)
    try {
      const data = await api('/credits/redeem', { method: 'POST', body: { code } })
      setRedeemMsg({ ok: true, text: `Code redeemed: +${data.added} credits!` })
      setRedeemCode('')
    } catch (err) {
      setRedeemMsg({ ok: false, text: err.message || 'Could not redeem this code.' })
    } finally {
      setRedeeming(false)
      refresh()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-6 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <span className="tag tag-yellow mb-4 inline-flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" />
          Credits
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-navy mb-3 uppercase">
          Play more <span className="gradient-text">Gen Arcade</span>
        </h1>
        <p className="text-navy/60 max-w-lg mx-auto font-medium">
          1 credit = the AI images for one game. You get {freeDaily} free credits every day. They refill every day.
        </p>
      </div>

      {/* Balance */}
      <div className="mb-8 brutalist-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-highlight flex items-center justify-center border-2 border-navy shrink-0">
            <Coins className="w-6 h-6 text-navy" />
          </div>
          <div>
            <p className="text-xs font-black text-navy/50 uppercase">Your credits</p>
            {credits ? (
              <p className="text-2xl font-black text-navy" data-testid="credit-total">{credits.total}</p>
            ) : (
              <p className="text-sm font-bold text-navy/50 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...
              </p>
            )}
          </div>
        </div>
        {credits && (
          <div className="flex gap-2">
            <div className="border-2 border-navy px-3 py-2 text-center">
              <p className="text-lg font-black text-navy">{credits.free}<span className="text-navy/40 text-xs">/{credits.freeDaily}</span></p>
              <p className="text-[10px] font-bold text-navy/50 uppercase">Free today</p>
            </div>
            <div className="border-2 border-navy px-3 py-2 text-center">
              <p className="text-lg font-black text-navy">{credits.paid}</p>
              <p className="text-[10px] font-bold text-navy/50 uppercase">Extra</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-navy/50 text-xs font-medium text-center -mt-5 mb-8">
        Free credits are used first. Extra credits (from codes) never expire.
        {!user && ' You are playing as a guest. Log in to redeem codes and keep extra credits on your account.'}
      </p>

      {/* Redeem Code */}
      <div className="mb-10 max-w-md mx-auto">
        <div className="brutalist-card p-5">
          <h2 className="text-sm font-black text-navy uppercase mb-1 flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            Redeem a code
          </h2>
          <p className="text-navy/50 text-xs font-medium mb-3">Got a code at an event or from a host? Add its credits to your account.</p>
          {redeemMsg && (
            <div
              role={redeemMsg.ok ? 'status' : 'alert'}
              className={`mb-3 p-2 text-xs font-bold ${redeemMsg.ok ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-600 border-red-300'}`}
              style={{ border: '2px solid' }}
            >
              {redeemMsg.text}
            </div>
          )}
          {user ? (
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input
                type="text"
                aria-label="Code"
                placeholder="Enter code..."
                value={redeemCode}
                maxLength={40}
                onChange={(e) => setRedeemCode(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-white text-navy text-sm placeholder-navy/30 focus:outline-none font-bold uppercase"
                style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
              />
              <button type="submit" disabled={redeeming || !redeemCode.trim()} className="btn-brutalist bg-navy text-white text-xs py-2 disabled:opacity-50">
                {redeeming ? 'Redeeming...' : 'Redeem'}
              </button>
            </form>
          ) : (
            <Link to="/login" className="btn-brutalist bg-primary text-white text-xs no-underline">
              <LogIn className="w-3.5 h-3.5" />
              Log in to redeem
            </Link>
          )}
        </div>
      </div>

      {/* Credit Packs */}
      <div className="mb-10">
        <h2 className="text-lg font-black text-navy text-center mb-1 uppercase">Credit packs</h2>
        <p className="text-navy/50 text-xs font-medium text-center mb-6">
          {PACKS_LIVE ? 'Secure checkout with Stripe. Log in first so the credits go to your account.' : 'Payments are not live yet. Packs are coming soon.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`brutalist-card p-5 text-center relative ${pack.popular ? 'ring-4 ring-highlight' : ''}`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="tag tag-yellow text-[10px]">Best Value</span>
                </div>
              )}
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center border-2 border-navy" style={{ background: pack.color }}>
                <Coins className="w-6 h-6 text-navy" />
              </div>
              <p className="text-2xl font-black text-navy">{pack.credits}</p>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">credits, {pack.credits} games</p>
              <p className="text-lg font-black text-primary mb-3">{pack.price}</p>
              <BuyButton link={pack.link} user={user} onBuy={openCheckout} label="Buy" className="w-full bg-primary text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-lg font-black text-navy text-center mb-1 uppercase">Plans</h2>
      <p className="text-navy/50 text-xs font-medium text-center mb-6">
        {PLANS_LIVE ? 'Free stays free. Paid plans add extra credits every month.' : 'Monthly plans are coming soon. Free stays free.'}
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PLANS.map((plan) => {
          const PlanIcon = plan.icon
          const isPink = plan.cardClass === 'brutalist-card-pink'
          const textColor = isPink ? 'text-white' : 'text-navy'
          const subtextColor = isPink ? 'text-white/70' : 'text-navy/60'

          return (
            <div key={plan.id} className={`relative p-6 ${plan.cardClass}`}>
              {plan.id !== 'free' && !plan.link && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="tag tag-yellow whitespace-nowrap">Coming soon</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <PlanIcon className={`w-5 h-5 ${textColor}`} />
                <span className={`${textColor} font-black uppercase`}>{plan.name}</span>
              </div>

              <div className="mb-4">
                <span className={`text-3xl font-black ${textColor}`}>{plan.price}</span>
                <span className={`${subtextColor} text-sm font-medium`}>{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features(freeDaily).map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${isPink ? 'text-white/90' : 'text-navy/80'} font-medium`}>
                    <Check className={`w-4 h-4 ${isPink ? 'text-accent' : 'text-success'} shrink-0 mt-0.5`} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === 'free' ? (
                <button disabled className={`w-full btn-brutalist justify-center cursor-default ${plan.btnClass}`}>
                  Current plan
                </button>
              ) : (
                <BuyButton link={plan.link} user={user} onBuy={openCheckout} label={`Get ${plan.name}`} className={`w-full ${plan.btnClass}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto">
        <h2 className="text-lg font-black text-navy text-center mb-6 uppercase">Questions</h2>
        <div className="space-y-3">
          {faq(freeDaily).map(({ q, a }) => (
            <details key={q} className="group brutalist-card overflow-hidden">
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-sm font-black text-navy list-none uppercase">
                {q}
                <Star className="w-4 h-4 shrink-0 text-navy/30 group-open:text-primary transition-colors" />
              </summary>
              <div className="px-5 pb-4 text-navy/60 text-sm font-medium">{a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Opens the Stripe link when one is set (login needed to match the payment); else "Coming soon". */
function BuyButton({ link, user, onBuy, label, className }) {
  const base = `btn-brutalist justify-center text-sm ${className}`
  if (!link) {
    return (
      <button disabled className={`${base} opacity-50 cursor-not-allowed`}>
        Coming soon
      </button>
    )
  }
  if (!user) {
    return (
      <Link to="/login" className={`${base} no-underline`}>
        Log in to buy
      </Link>
    )
  }
  return (
    <button onClick={() => onBuy(link)} className={base}>
      {label}
    </button>
  )
}

function faq(freeDaily) {
  return [
    {
      q: 'How do credits work?',
      a: `1 credit pays for the AI images in one game. When you start a game, we ask before using a credit. Everyone gets ${freeDaily} free credits a day, and they refill daily. The Daily Challenge is always free.`,
    },
    {
      q: 'Do I need my own AI key?',
      a: 'No. Gen Arcade runs the AI image generation for you. Credits cover the cost.',
    },
    {
      q: 'Can I buy credits?',
      a: PACKS_LIVE || PLANS_LIVE
        ? 'Yes, through Stripe checkout. Log in first so the credits are added to your account.'
        : 'Not yet. Payments are not live. For now you can play with your free daily credits or redeem a code.',
    },
    {
      q: 'What are codes?',
      a: 'Codes add extra credits to your account. We hand them out at events and parties. Each code works once per account, and you need to be logged in.',
    },
  ]
}
