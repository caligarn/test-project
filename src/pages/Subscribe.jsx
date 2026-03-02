import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown,
  Check,
  Zap,
  Shield,
  ArrowLeft,
  Star,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { setSubscription } from '../lib/storage'

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
      'Access to 3 games',
      'Ad-supported experience',
      'Basic leaderboards',
      'Community captions',
    ],
    limitations: [
      '5 games per day',
      'Standard image quality',
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
      'All 6 games unlocked',
      'Ad-free experience',
      'Premium leaderboards',
      'Unlimited games per day',
      'HD image generation',
      'Exclusive daily challenges',
      'Custom avatars & themes',
    ],
    limitations: [],
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
      'Private team leaderboard',
      'Team challenges & tournaments',
      'Priority image generation',
      'API usage dashboard',
      'Early access to new games',
    ],
    limitations: [],
  },
]

export default function Subscribe() {
  const navigate = useNavigate()
  const { subscribed } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('pro')

  function handleSubscribe(planId) {
    if (planId === 'free') return
    setSubscription(planId)
    navigate('/profile')
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
          Remove ads, unlock all games, and get unlimited plays with premium
          image generation quality.
        </p>
      </div>

      {subscribed && (
        <div className="mb-8 px-5 py-4 bg-accent border-3 text-center" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
          <p className="text-navy font-black text-sm flex items-center justify-center gap-2 uppercase">
            <Check className="w-4 h-4" />
            You're subscribed! Thank you for supporting AI Arcade.
          </p>
        </div>
      )}

      {/* Plans */}
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
    q: 'Do I need my own Fal.ai API key?',
    a: 'Yes — each player provides their own Fal.ai API key. This keeps costs fair and gives you full control. Your key is stored locally and never sent to our servers.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely! You can cancel your subscription at any time. Your Pro features will remain active until the end of your billing period.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, Apple Pay, and Google Pay through our secure payment processor.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Free plan lets you try 3 games with 5 plays per day. Upgrade to Pro for unlimited access to all games and features.',
  },
]
