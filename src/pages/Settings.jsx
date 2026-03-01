import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Bell, Volume2, Palette, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isConfigured, configureFal } from '../lib/fal'
import { getAvatars, updateUser } from '../lib/storage'

export default function Settings() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(isConfigured())
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [sound, setSound] = useState(true)

  function handleSaveKey(e) {
    e.preventDefault()
    if (apiKey.trim()) {
      configureFal(apiKey.trim())
      setHasKey(true)
      setApiKey('')
      flash()
    }
  }

  function handleAvatarChange(newAvatar) {
    if (user) {
      updateUser(user.username, { avatar: newAvatar })
      refreshUser()
      flash()
    }
  }

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {saved && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-success/20 text-success text-sm font-medium">
          Settings saved!
        </div>
      )}

      {/* API Key */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-white">Fal.ai API Key</h2>
        </div>
        <div className="bg-surface-light rounded-xl p-5 border border-white/5">
          <p className="text-gray-400 text-xs mb-3">
            {hasKey
              ? 'API key is configured. Enter a new one to replace it.'
              : 'Required to play AI-powered games.'}
          </p>
          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input
              type="password"
              placeholder={hasKey ? '••••••••••••' : 'Enter API key...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Save
            </button>
          </form>
        </div>
      </section>

      {/* Avatar */}
      {user && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-white">Avatar</h2>
          </div>
          <div className="bg-surface-light rounded-xl p-5 border border-white/5">
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  onClick={() => handleAvatarChange(a)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    user.avatar === a
                      ? 'bg-primary/30 border-2 border-primary scale-110'
                      : 'bg-surface border border-white/5 hover:border-white/20'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Notifications */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-bold text-white">Notifications</h2>
        </div>
        <div className="bg-surface-light rounded-xl border border-white/5 overflow-hidden">
          <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
            <span className="text-sm text-gray-300">
              Daily challenge reminders
            </span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
          </label>
        </div>
      </section>

      {/* Sound */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-success" />
          <h2 className="text-sm font-bold text-white">Sound</h2>
        </div>
        <div className="bg-surface-light rounded-xl border border-white/5 overflow-hidden">
          <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
            <span className="text-sm text-gray-300">Sound effects</span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
          </label>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-danger" />
          <h2 className="text-sm font-bold text-white">Danger Zone</h2>
        </div>
        <div className="bg-surface-light rounded-xl p-5 border border-danger/20">
          <p className="text-gray-400 text-xs mb-3">
            Clear all local data including scores, settings, and account info.
          </p>
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure? This will delete all your data.'
                )
              ) {
                localStorage.clear()
                window.location.href = '/'
              }
            }}
            className="px-4 py-2 rounded-lg bg-danger/20 text-danger text-sm font-medium hover:bg-danger/30 transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  )
}
