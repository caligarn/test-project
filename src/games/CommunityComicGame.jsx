import { useState } from 'react'
import { ArrowLeft, BookOpen, Loader2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const COMICS_KEY = 'community_comic_panels'
const PANELS_PER_PAGE = 6

function loadPanels() {
  try { return JSON.parse(localStorage.getItem(COMICS_KEY) || '[]') } catch { return [] }
}
function savePanels(p) { localStorage.setItem(COMICS_KEY, JSON.stringify(p)) }

export default function CommunityComicGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [panels, setPanels] = useState(loadPanels)
  const [currentPage, setCurrentPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [contributorName, setContributorName] = useState(user?.username || '')
  const [textContent, setTextContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)

  const totalPages = Math.max(1, Math.ceil(panels.length / PANELS_PER_PAGE))
  const currentPanels = panels.slice(
    currentPage * PANELS_PER_PAGE,
    (currentPage + 1) * PANELS_PER_PAGE
  )

  const handleCreatePanel = async () => {
    if (!contributorName.trim()) { setError('Please enter your name'); return }
    if (!textContent.trim()) { setError('Please enter text content for the panel'); return }

    setError('')
    setGenerating(true)

    // Build context from previous panels
    const prevContext = panels.slice(-3).map(p => p.textContent).join('. ')
    const contextPrompt = prevContext
      ? `Continue this comic story. Previous panels: "${prevContext}". Next panel: `
      : 'First panel of a comic story: '

    try {
      const imageUrl = await generateImage(
        `${contextPrompt}${textContent.trim()}. Comic book panel, vivid illustration, dynamic composition, bold lines, dramatic lighting, comic book style`,
        { width: 768, height: 576 }
      )

      const panel = {
        id: Date.now(),
        panelNumber: panels.length + 1,
        imageUrl,
        textContent: textContent.trim(),
        contributorName: contributorName.trim(),
        createdAt: Date.now(),
      }

      const updated = [...panels, panel]
      setPanels(updated)
      savePanels(updated)

      const pts = 65
      setScore(prev => prev + pts)
      addScore('community-comic', user.username, pts, { text: textContent.trim() })
      refreshUser()

      setTextContent('')
      setCreateOpen(false)

      // Navigate to last page to see new panel
      setCurrentPage(Math.floor((updated.length - 1) / PANELS_PER_PAGE))
    } catch (err) {
      console.error('Failed to generate panel:', err)
      setError('Failed to generate panel. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <header className="border-b-3 border-navy bg-white" style={{ borderBottomWidth: '3px' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-black text-navy uppercase">Community Comic</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-navy/40 font-bold">{panels.length} panels &middot; +65 pts</span>
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-brutalist bg-primary text-white py-1.5 px-3 text-xs"
            >
              <Plus className="w-3 h-3" />
              Add Panel
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Comic Book Page */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        {currentPanels.length > 0 ? (
          <div className="flex-1 flex flex-col">
            {/* Comic Page */}
            <div className="brutalist-card p-6 md:p-8 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {currentPanels.map((panel) => (
                  <div key={panel.id} className="flex flex-col border-2 border-navy overflow-hidden bg-white">
                    {/* Panel Image */}
                    <div className="relative aspect-[4/3] bg-surface-light">
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${panel.panelNumber}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-white/90 border-2 border-navy px-2 py-0.5 text-xs font-black text-navy">
                        #{panel.panelNumber}
                      </div>
                    </div>
                    {/* Panel Text */}
                    <div className="p-4 flex-1 flex flex-col">
                      <p className="text-sm text-navy font-medium mb-2 flex-1">{panel.textContent}</p>
                      <p className="text-[10px] text-navy/40 italic font-medium">
                        by {panel.contributorName}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Empty Slots */}
                {currentPanels.length < PANELS_PER_PAGE &&
                  Array.from({ length: PANELS_PER_PAGE - currentPanels.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-2 border-dashed border-navy/20 flex items-center justify-center bg-surface-light/50 aspect-[4/3]">
                      <p className="text-navy/20 text-xs font-medium">Empty slot</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className={`btn-brutalist py-1.5 px-3 text-xs ${currentPage === 0 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-xs font-black text-navy uppercase">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className={`btn-brutalist py-1.5 px-3 text-xs ${currentPage >= totalPages - 1 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <BookOpen className="w-16 h-16 text-navy/20 mx-auto mb-4" />
              <h3 className="text-lg font-black text-navy uppercase mb-2">No panels yet</h3>
              <p className="text-navy/50 text-sm mb-4 font-medium">Be the first to add a panel to this comic!</p>
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-brutalist bg-primary text-white"
              >
                <Plus className="w-4 h-4" />
                Add First Panel
              </button>
            </div>
          </div>
        )}

        {/* Score Bar */}
        <div className="brutalist-card-green p-3 mt-4 flex items-center justify-between">
          <p className="text-xs text-navy font-medium">
            AI generates comic book style artwork based on your text and previous panels
          </p>
          <span className="text-sm font-black text-navy">Score: {score}</span>
        </div>
      </main>

      {/* Create Panel Dialog */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !generating && setCreateOpen(false)}>
          <div className="brutalist-card max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-navy uppercase text-sm">Add Panel to Comic</h3>
                <p className="text-xs text-navy/50 font-medium mt-0.5">
                  Create a new panel with your name and text. An image will be automatically
                  generated in comic book style based on your text and previous panels.
                </p>
              </div>
              <button onClick={() => !generating && setCreateOpen(false)} className="text-navy/30 hover:text-navy">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Previous panels context */}
            {panels.length > 0 && (
              <div className="bg-surface-light border-2 border-navy/10 p-3 mb-4">
                <p className="text-[10px] font-black text-navy/50 uppercase mb-1.5">Previous panels for context:</p>
                <div className="space-y-1">
                  {panels.slice(-3).map(panel => (
                    <p key={panel.id} className="text-xs text-navy/50 font-medium">
                      <span className="font-black">Panel {panel.panelNumber}:</span>{' '}
                      {panel.textContent.length > 80 ? panel.textContent.slice(0, 80) + '...' : panel.textContent}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Your Name</label>
                <input
                  type="text"
                  value={contributorName}
                  onChange={(e) => setContributorName(e.target.value)}
                  placeholder="Enter your name..."
                  disabled={generating}
                  className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Panel Text</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter dialogue, narration, or scene description for this panel..."
                  rows={4}
                  disabled={generating}
                  className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium resize-none"
                />
                <p className="text-[10px] text-navy/40 font-medium mt-1">
                  AI will automatically generate comic book style artwork based on your text and previous panels
                </p>
              </div>

              {error && <p className="text-xs text-danger font-bold">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  disabled={generating}
                  className="btn-brutalist bg-white text-navy flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePanel}
                  disabled={generating}
                  className={`btn-brutalist flex-1 justify-center ${
                    !generating ? 'bg-primary text-white' : 'bg-surface-light text-navy/30 border-navy/20'
                  }`}
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating Panel...</>
                  ) : (
                    'Create Panel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
