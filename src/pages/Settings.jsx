import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Coins, Palette, Trash2, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAvatars } from '../lib/storage'

// Same key CreditContext reads ("Don't ask me again" in the credit prompt).
const AUTOSPEND_KEY = 'gen_arcade_autospend'

function readAutospend() {
  try {
    return localStorage.getItem(AUTOSPEND_KEY) === '1'
  } catch {
    return false
  }
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, loading, updateAvatar, logout } = useAuth()
  const [message, setMessage] = useState(null) // { ok, text }
  const [savingAvatar, setSavingAvatar] = useState(null)
  const [askBeforeSpending, setAskBeforeSpending] = useState(() => !readAutospend())

  function flash(ok, text) {
    setMessage({ ok, text })
    setTimeout(() => setMessage(null), 2500)
  }

  async function handleAvatarChange(newAvatar) {
    if (!user || savingAvatar || newAvatar === user.avatar) return
    setSavingAvatar(newAvatar)
    const result = await updateAvatar(newAvatar)
    setSavingAvatar(null)
    if (result.error) flash(false, result.error)
    else flash(true, 'Avatar saved!')
  }

  function handleAskToggle(ask) {
    setAskBeforeSpending(ask)
    try {
      if (ask) localStorage.removeItem(AUTOSPEND_KEY)
      else localStorage.setItem(AUTOSPEND_KEY, '1')
      flash(true, 'Saved!')
    } catch {
      flash(false, 'Could not save this setting in this browser.')
    }
  }

  function handleClear() {
    if (!window.confirm('Clear all Gen Arcade data in this browser and log out? Your account and shared leaderboard scores stay safe on the server.')) return
    logout()
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // nothing stored, nothing to clear
    }
    window.location.href = '/'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-6 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-black text-navy mb-6 uppercase">Settings</h1>

      {message && (
        <div
          role="status"
          className={`mb-4 px-4 py-2 border-2 border-navy text-sm font-black ${message.ok ? 'bg-accent text-navy' : 'bg-danger text-white'}`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-[#8B5CF6]" />
          <h2 className="text-sm font-black text-navy uppercase">Avatar</h2>
        </div>
        <div className="brutalist-card p-5">
          {loading ? (
            <p className="text-navy/50 text-xs font-bold uppercase">Loading...</p>
          ) : user ? (
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  onClick={() => handleAvatarChange(a)}
                  disabled={Boolean(savingAvatar)}
                  aria-label={`Avatar ${a}`}
                  aria-pressed={user.avatar === a}
                  className={`w-10 h-10 flex items-center justify-center text-lg transition-all border-2 ${
                    user.avatar === a
                      ? 'bg-highlight border-navy scale-110'
                      : savingAvatar === a
                      ? 'bg-highlight/50 border-navy animate-pulse'
                      : 'bg-white border-navy/20 hover:border-navy/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-navy/60 text-sm font-medium">Log in to pick an avatar for the leaderboards.</p>
              <Link to="/login" className="btn-brutalist bg-primary text-white text-xs no-underline">
                <LogIn className="w-3.5 h-3.5" />
                Log in
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Credits */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-highlight" />
          <h2 className="text-sm font-black text-navy uppercase">Credits</h2>
        </div>
        <div className="brutalist-card overflow-hidden">
          <label className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer">
            <span>
              <span className="block text-sm text-navy font-bold">Ask before spending a credit</span>
              <span className="block text-xs text-navy/50 font-medium">When off, games start without the &quot;Use 1 credit&quot; prompt.</span>
            </span>
            <input
              type="checkbox"
              checked={askBeforeSpending}
              onChange={(e) => handleAskToggle(e.target.checked)}
              className="w-5 h-5 accent-primary shrink-0"
            />
          </label>
        </div>
      </section>

      {/* Clear browser data */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-danger" />
          <h2 className="text-sm font-black text-navy uppercase">Clear this browser</h2>
        </div>
        <div className="bg-white p-5 border-3" style={{ borderWidth: '3px', borderColor: '#FF3B30' }}>
          <p className="text-navy/60 text-xs mb-3 font-medium">
            Removes everything Gen Arcade saved in this browser (guest score history, settings, play tickets) and logs you out.
            Your account, credits, and shared leaderboard scores stay on the server: log in again to get them back.
          </p>
          <button onClick={handleClear} className="btn-brutalist bg-danger text-white text-xs">
            Clear this browser and log out
          </button>
        </div>
      </section>
    </div>
  )
}
