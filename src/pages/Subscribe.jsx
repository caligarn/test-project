import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown,
  Check,
  Zap,
  Shield,
  ArrowLeft,
  Star,
  Coins,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setSubscription, getCredits, addCredits } from '../lib/storage'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Zap,
    cardClass: 'brutalist-card',
    btnClass: 'bg-surface-lighter text-navy/50 border-navy',
    features: [
      'Access to all 10 games',
      '3 free credits per day',
      'Basic leaderboards',
      'Community features',
    ],
    limitations: [
      'Ad-supported experience',
      'Buy credits for more plays',
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
    popular: true,
    features: [
      'All 10 games unlocked',
      'Ad-free experience',
      '50 credits per month included',
      'Premium leaderboards',
      'HD image generation',
      'Exclusive daily challenges',
      'Custom avatars & themes',
    ],
    limitations: [],
    stripeLink: '', // Replace with your Stripe Payment Link
  },
  {
    id: 'team',
    name: 'Team',
    price: '$9.99',
    period: '/month',
    icon: Shield,
    cardClass: 'brutalist-card-green',
    btnClass: 'bg-navy text-accent border-navy',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      '200 credits per month included',
      'Private team leaderboard',
      'Team challenges & tournaments',
      'Priority image generation',
      'Early access to new games',
    ],
    limitations: [],
    stripeLink: '', // Replace with your Stripe Payment Link
  },
]

const CREDIT_PACKS = [
  {
    id: 'starter',
    credits: 10,
    price: '$1.99',
    label: 'Starter Pack',
    color: '#C8FF00',
    stripeLink: '', // Replace with your Stripe Payment Link
  },
  {
    id: 'popular',
    credits: 50,
    price: '$7.99',
    label: 'Popular Pack',
    color: '#FF2D55',
    popular: true,
    stripeLink: '', // Replace with your Stripe Payment Link
  },
  {
    id: 'mega',
    credits: 150,
    price: '$19.99',
    label: 'Mega Pack',
    color: '#8B5CF6',
    stripeLink: '', // Replace with your Stripe Payment Link
  },
]

export default function Subscribe() {
  const navigate = useNavigate()
  const { user, subscribed } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState(null)
  const credits = user ? getCredits(user.username) : 0

  function handleSubscribe(planId) {
    if (planId === 'free') return
    const plan = PLANS.find(p => p.id === planId)
    if (plan?.stripeLink) {
      window.open(plan.stripeLink, '_blank')
    } else {
      // Demo mode — activate locally
      setSubscription(planId)
      if (user) addCredits(user.username, planId === 'team' ? 200 : 50)
      navigate('/profile')
    }
  }

  function handleBuyCredits(pack) {
    if (pack.stripeLink) {
      window.open(pack.stripeLink, '_blank')
    } else {
      // Demo mode — add credits locally
      if (user) addCredits(user.username, pack.credits)
      setRedeemMsg(`Added ${pack.credits} credits!`)
      setTimeout(() => setRedeemMsg(null), 3000)
    }
  }

  function handleRedeem(e) {
    e.preventDefault()
    const code = redeemCode.trim().toUpperCase()
    if (!code) return
    // Redemption codes: ARCADE10 = 10 credits, ARCADE50 = 50, etc.
    const codeMap = { ARCADE10: 10, ARCADE50: 50, ARCADE100: 100, WELCOME: 5 }
    if (codeMap[code] && user) {
      addCredits(user.username, codeMap[code])
      setRedeemMsg(`Redeemed! +${codeMap[code]} credits added.`)
      setRedeemCode('')
    } else {
      setRedeemMsg('Invalid code. Please try again.')
    }
    setTimeout(() => setRedeemMsg(null), 3000)
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
      <div className="text-center mb-10">
        <span className="tag tag-yellow mb-4 inline-flex items-center gap-1">
          <Crown className="w-3.5 h-3.5" />
          AI ARCADE PRO
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-navy mb-3 uppercase">
          Unlock the Full{' '}
          <span className="gradient-text">AI Arcade</span>{' '}
          Experience
        </h1>
        <p className="text-navy/50 max-w-lg mx-auto font-medium">
          Remove ads, get monthly credits, and enjoy unlimited AI-powered gaming.
        </p>
      </div>

      {/* Credits balance */}
      {user && (
        <div className="mb-8 brutalist-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-highlight flex items-center justify-center border-2 border-navy">
              <Coins className="w-6 h-6 text-navy" />
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase">Your Credits</p>
              <p className="text-2xl font-black text-navy">{credits}</p>
            </div>
          </div>
          <p className="text-xs text-navy/40 font-medium text-right">
            Each game action costs 1 credit<br />
            Free users get 3 credits daily
          </p>
        </div>
      )}

      {subscribed && (
        <div className="mb-8 px-5 py-4 bg-accent border-3 text-center" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
          <p className="text-navy font-black text-sm flex items-center justify-center gap-2 uppercase">
            <Check className="w-4 h-4" />
            You're subscribed! Thank you for supporting AI Arcade.
          </p>
        </div>
      )}

      {/* Credit Packs */}
      <div className="mb-10">
        <h2 className="text-lg font-black text-navy text-center mb-6 uppercase">
          Buy Credit Packs
        </h2>
        <div className="grid grid-cols-3 gap-4">
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
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center border-2 border-navy"
                style={{ background: pack.color }}>
                <Coins className="w-6 h-6 text-navy" />
              </div>
              <p className="text-2xl font-black text-navy">{pack.credits}</p>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">credits</p>
              <p className="text-lg font-black text-primary mb-3">{pack.price}</p>
              <button
                onClick={() => handleBuyCredits(pack)}
                className="w-full py-2 text-sm font-black uppercase text-white bg-primary"
                style={{ border: '2px solid #1A1A2E' }}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem Code */}
      <div className="mb-10 max-w-md mx-auto">
        <div className="brutalist-card p-5">
          <h3 className="text-sm font-black text-navy uppercase mb-3">Redeem a Code</h3>
          {redeemMsg && (
            <div className={`mb-3 p-2 text-xs font-bold ${redeemMsg.includes('Invalid') ? 'bg-red-50 text-red-600 border-red-300' : 'bg-green-50 text-green-600 border-green-300'}`}
              style={{ border: '2px solid' }}>
              {redeemMsg}
            </div>
          )}
          <form onSubmit={handleRedeem} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter code..."
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              className="flex-1 px-3 py-2 bg-white text-navy text-sm placeholder-navy/30 focus:outline-none font-bold uppercase"
              style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
            />
            <button type="submit"
              className="btn-brutalist bg-navy text-white text-xs py-2">
              Redeem
            </button>
          </form>
        </div>
      </div>

      {/* Subscription Plans */}
      <h2 className="text-lg font-black text-navy text-center mb-6 uppercase">
        Or Subscribe for Monthly Credits
      </h2>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isPink = plan.cardClass === 'brutalist-card-pink'
          const isGreen = plan.cardClass === 'brutalist-card-green'
          const textColor = isPink ? 'text-white' : isGreen ? 'text-navy' : 'text-navy'
          const subtextColor = isPink ? 'text-white/70' : isGreen ? 'text-navy/60' : 'text-navy/50'

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-6 cursor-pointer transition-all ${plan.cardClass} ${
                selectedPlan === plan.id ? 'ring-4 ring-highlight' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="tag tag-yellow">Most Popular</span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${textColor}`} />
                <span className={`${textColor} font-black uppercase`}>{plan.name}</span>
              </div>

              <div className="mb-4">
                <span className={`text-3xl font-black ${textColor}`}>
                  {plan.price}
                </span>
                <span className={`${subtextColor} text-sm font-medium`}>{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-sm ${isPink ? 'text-white/90' : 'text-navy/80'} font-medium`}
                  >
                    <Check className={`w-4 h-4 ${isPink ? 'text-accent' : 'text-success'} shrink-0 mt-0.5`} />
                    {f}
                  </li>
                ))}
                {plan.limitations.map((l) => (
                  <li
                    key={l}
                    className={`flex items-start gap-2 text-sm ${subtextColor} font-medium`}
                  >
                    <span className="w-4 h-4 shrink-0 text-center">—</span>
                    {l}
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSubscribe(plan.id)
                }}
                className={`w-full btn-brutalist justify-center ${plan.btnClass}`}
              >
                {plan.id === 'free'
                  ? 'Current Plan'
                  : subscribed
                  ? 'Active'
                  : `Get ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Stripe Setup Instructions */}
      <div className="brutalist-card p-5 mb-10 max-w-2xl mx-auto">
        <h3 className="text-sm font-black text-navy uppercase mb-2">Setup Stripe Payments</h3>
        <p className="text-navy/50 text-xs font-medium mb-2">
          To accept real payments, create Stripe Payment Links at{' '}
          <a href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noreferrer" className="text-primary font-bold">
            dashboard.stripe.com/payment-links
          </a>{' '}
          and paste the URLs into the <code className="bg-gray-100 px-1">stripeLink</code> fields in Subscribe.jsx.
        </p>
        <p className="text-navy/40 text-[10px] font-medium">
          For automated fulfillment, set up a Stripe webhook that calls your backend to add credits when a payment succeeds.
        </p>
      </div>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto">
        <h2 className="text-lg font-black text-navy text-center mb-6 uppercase">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group brutalist-card overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-black text-navy list-none uppercase">
                {q}
                <Star className="w-4 h-4 text-navy/30 group-open:text-primary transition-colors" />
              </summary>
              <div className="px-5 pb-4 text-navy/60 text-sm font-medium">{a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

const FAQ = [
  {
    q: 'How do credits work?',
    a: 'Each game action (generating an image, submitting a guess, etc.) costs 1 credit. Free users get 3 credits daily. Buy credit packs or subscribe for monthly credits.',
  },
  {
    q: 'Do I need my own Fal.ai API key?',
    a: 'No! AI Arcade provides the AI image generation. Your credits cover the cost of image generation.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely! You can cancel your subscription at any time. Your Pro features will remain active until the end of your billing period.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, Apple Pay, and Google Pay through Stripe, our secure payment processor.',
  },
  {
    q: 'What are redemption codes?',
    a: 'Redemption codes are special codes that add free credits to your account. Follow us on social media for giveaways and promotions!',
  },
]
