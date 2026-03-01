import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown,
  Check,
  Zap,
  Shield,
  Palette,
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
    color: 'text-gray-400',
    bgColor: 'bg-surface-light',
    borderColor: 'border-white/5',
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
    color: 'text-warning',
    bgColor: 'bg-gradient-to-br from-warning/10 to-primary/10',
    borderColor: 'border-warning/30',
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
    color: 'text-accent',
    bgColor: 'bg-gradient-to-br from-accent/10 to-primary/10',
    borderColor: 'border-accent/30',
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
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold mb-4">
          <Crown className="w-3.5 h-3.5" />
          AI ARCADE PRO
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Unlock the Full <span className="gradient-text">AI Arcade</span>{' '}
          Experience
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto">
          Remove ads, unlock all games, and get unlimited plays with premium
          image generation quality.
        </p>
      </div>

      {subscribed && (
        <div className="mb-8 px-5 py-4 rounded-xl bg-success/20 border border-success/30 text-center">
          <p className="text-success font-medium text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            You're subscribed! Thank you for supporting AI Arcade.
          </p>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl p-6 border cursor-pointer transition-all ${
                plan.bgColor
              } ${
                selectedPlan === plan.id
                  ? `${plan.borderColor} ring-1 ring-primary/50`
                  : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-warning text-gray-900 text-[10px] font-bold uppercase">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${plan.color}`} />
                <span className="text-white font-bold">{plan.name}</span>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.limitations.map((l) => (
                  <li
                    key={l}
                    className="flex items-start gap-2 text-sm text-gray-500"
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
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.id === 'free'
                    ? 'bg-surface-lighter text-gray-400'
                    : plan.popular
                    ? 'bg-warning text-gray-900 hover:bg-yellow-400'
                    : 'bg-primary hover:bg-primary-dark text-white'
                }`}
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
        <h2 className="text-lg font-bold text-white text-center mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group bg-surface-light rounded-xl border border-white/5 overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-white list-none">
                {q}
                <Star className="w-4 h-4 text-gray-500 group-open:text-primary transition-colors" />
              </summary>
              <div className="px-5 pb-4 text-gray-400 text-sm">{a}</div>
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
