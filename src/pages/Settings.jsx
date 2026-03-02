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
        className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-6 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-black text-navy mb-6 uppercase">Settings</h1>

      {saved && (
        <div className="mb-4 px-4 py-2 bg-accent border-2 border-navy text-navy text-sm font-black">
          Settings saved!
        </div>
      )}

      {/* API Key */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black text-navy uppercase">Fal.ai API Key</h2>
        </div>
        <div className="brutalist-card p-5">
          <p className="text-navy/50 text-xs mb-3 font-medium">
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
              className="flex-1 px-3 py-2 bg-white text-navy text-sm placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
              style={{ borderWidth: '2px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
            />
            <button
              type="submit"
              className="btn-brutalist bg-primary text-white text-xs py-2"
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
            <Palette className="w-4 h-4 text-[#8B5CF6]" />
            <h2 className="text-sm font-black text-navy uppercase">Avatar</h2>
          </div>
          <div className="brutalist-card p-5">
            <div className="flex flex-wrap gap-2">
              {getAvatars().map((a) => (
                <button
                  key={a}
                  onClick={() => handleAvatarChange(a)}
                  className={`w-10 h-10 flex items-center justify-center text-lg transition-all border-2 ${
                    user.avatar === a
                      ? 'bg-highlight border-navy scale-110'
                      : 'bg-white border-navy/20 hover:border-navy/50'
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
          <Bell className="w-4 h-4 text-highlight" />
          <h2 className="text-sm font-black text-navy uppercase">Notifications</h2>
        </div>
        <div className="brutalist-card overflow-hidden">
          <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
            <span className="text-sm text-navy font-medium">
              Daily challenge reminders
            </span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>
        </div>
      </section>

      {/* Sound */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-success" />
          <h2 className="text-sm font-black text-navy uppercase">Sound</h2>
        </div>
        <div className="brutalist-card overflow-hidden">
          <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
            <span className="text-sm text-navy font-medium">Sound effects</span>
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => setSound(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-4 h-4 text-danger" />
          <h2 className="text-sm font-black text-navy uppercase">Danger Zone</h2>
        </div>
        <div className="bg-white p-5 border-3" style={{ borderWidth: '3px', borderColor: '#FF3B30' }}>
          <p className="text-navy/50 text-xs mb-3 font-medium">
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
            className="btn-brutalist bg-danger text-white text-xs"
          >
            Clear All Data
          </button>
        </div>
      </section>
    </div>
  )
}
