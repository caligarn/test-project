import { useState } from 'react'
import { ArrowLeft, BookOpen, Loader2, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const COMICS_KEY = 'community_comic_data'

const PANEL_STYLES = [
  { id: 'manga', label: 'Manga', suffix: 'manga art style, black and white ink, dramatic' },
  { id: 'superhero', label: 'Superhero', suffix: 'superhero comic style, bold colors, dynamic action' },
  { id: 'cartoon', label: 'Cartoon', suffix: 'cartoon style, playful, bright colors, fun' },
  { id: 'noir', label: 'Noir', suffix: 'film noir comic style, dark shadows, high contrast, moody' },
]

const STORY_STARTERS = [
  'A mysterious figure appears at the city gates...',
  'Deep in the enchanted forest, something stirs...',
  'The spaceship lands on an uncharted planet...',
  'A letter arrives with an impossible message...',
  'The last robot on Earth wakes up...',
]

function loadComics() {
  try {
    return JSON.parse(localStorage.getItem(COMICS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveComics(comics) {
  localStorage.setItem(COMICS_KEY, JSON.stringify(comics))
}

export default function CommunityComicGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [comics, setComics] = useState(loadComics)
  const [currentComic, setCurrentComic] = useState(null)
  const [panelPrompt, setPanelPrompt] = useState('')
  const [caption, setCaption] = useState('')
  const [dialogue, setDialogue] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('manga')
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [viewingComic, setViewingComic] = useState(null)
  const [viewPage, setViewPage] = useState(0)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState('')

  const handleCreateComic = () => {
    if (!newTitle.trim()) return
    const comic = {
      id: Date.now(),
      title: newTitle.trim(),
      panels: [],
      author: user.username,
      createdAt: Date.now(),
    }
    const updated = [comic, ...comics]
    setComics(updated)
    saveComics(updated)
    setCurrentComic(comic)
    setCreatingNew(false)
    setNewTitle('')
  }

  const handleAddPanel = async () => {
    if (!currentComic || !panelPrompt.trim()) return

    setGenerating(true)
    setError('')
    const style = PANEL_STYLES.find(s => s.id === selectedStyle)

    try {
      const imageUrl = await generateImage(
        `Comic book panel: ${panelPrompt.trim()}, ${style.suffix}, single panel composition, clear visual storytelling`,
        { width: 768, height: 512 }
      )

      const panel = {
        id: Date.now(),
        imageUrl,
        prompt: panelPrompt.trim(),
        caption: caption.trim(),
        dialogue: dialogue.trim(),
        style: selectedStyle,
        author: user.username,
        createdAt: Date.now(),
      }

      const updatedComic = {
        ...currentComic,
        panels: [...currentComic.panels, panel],
      }

      const updatedComics = comics.map(c =>
        c.id === currentComic.id ? updatedComic : c
      )

      setComics(updatedComics)
      saveComics(updatedComics)
      setCurrentComic(updatedComic)

      const pts = 65
      setScore(prev => prev + pts)
      addScore('community-comic', user.username, pts, { prompt: panelPrompt.trim() })
      refreshUser()

      setPanelPrompt('')
      setCaption('')
      setDialogue('')
    } catch (err) {
      console.error('Failed to generate panel:', err)
      setError('Failed to generate panel. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteComic = (id) => {
    const updated = comics.filter(c => c.id !== id)
    setComics(updated)
    saveComics(updated)
    if (currentComic?.id === id) setCurrentComic(null)
    if (viewingComic?.id === id) setViewingComic(null)
  }

  const panelsPerPage = 4

  // Comic reader view
  if (viewingComic) {
    const totalPages = Math.ceil(viewingComic.panels.length / panelsPerPage)
    const pagePanels = viewingComic.panels.slice(
      viewPage * panelsPerPage,
      (viewPage + 1) * panelsPerPage
    )

    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => { setViewingComic(null); setViewPage(0) }}
            className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="font-black text-navy uppercase text-sm">{viewingComic.title}</h2>
          <span className="text-xs text-navy/40 font-bold">
            {viewingComic.panels.length} panels
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {pagePanels.map((panel, idx) => (
            <div key={panel.id} className="brutalist-card overflow-hidden">
              <div className="relative">
                <img
                  src={panel.imageUrl}
                  alt={panel.prompt}
                  className="w-full aspect-[3/2] object-cover"
                />
                <div className="absolute top-2 left-2 bg-navy text-white text-[10px] font-black px-2 py-0.5 border border-white/30">
                  #{viewPage * panelsPerPage + idx + 1}
                </div>
                {panel.dialogue && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white border-2 border-navy px-3 py-2 rounded-lg">
                    <p className="text-xs font-bold text-navy">{panel.dialogue}</p>
                  </div>
                )}
              </div>
              {panel.caption && (
                <div className="px-4 py-2 bg-highlight/20 border-t-2 border-navy">
                  <p className="text-xs text-navy font-medium italic">{panel.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {viewingComic.panels.length === 0 && (
          <div className="brutalist-card p-8 text-center mb-4">
            <p className="text-3xl mb-2">📖</p>
            <p className="text-navy/50 text-sm font-medium">This comic has no panels yet.</p>
          </div>
        )}

        {/* Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setViewPage(p => Math.max(0, p - 1))}
              disabled={viewPage === 0}
              className={`btn-brutalist py-1.5 px-3 text-xs ${viewPage === 0 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <span className="text-xs font-black text-navy uppercase">
              Page {viewPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setViewPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={viewPage >= totalPages - 1}
              className={`btn-brutalist py-1.5 px-3 text-xs ${viewPage >= totalPages - 1 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (currentComic) { setCurrentComic(null) }
            else { navigate(-1) }
          }}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentComic ? 'Comics' : 'Back'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="font-black text-navy uppercase">Community Comic</span>
        </div>
        <span className="text-xs text-navy/40 font-bold">+65 pts</span>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-between brutalist-card p-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Score</p>
            <p className="text-xl font-black text-navy">{score}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Comics</p>
            <p className="text-xl font-black text-primary">{comics.length}</p>
          </div>
        </div>
      </div>

      {/* Comic Editor */}
      {currentComic ? (
        <>
          <div className="brutalist-card-green p-4 mb-4">
            <p className="text-sm font-black text-navy uppercase">
              Editing: {currentComic.title}
            </p>
            <p className="text-xs text-navy/60 font-medium">
              {currentComic.panels.length} panels created
            </p>
          </div>

          {/* Current Panels Preview */}
          {currentComic.panels.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {currentComic.panels.map((panel, idx) => (
                <div key={panel.id} className="relative aspect-[3/2] border-2 border-navy overflow-hidden">
                  <img
                    src={panel.imageUrl}
                    alt={panel.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-navy text-white text-[8px] font-black px-1">
                    #{idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Style Picker */}
          <div className="brutalist-card p-4 mb-4">
            <p className="text-xs font-black text-navy uppercase mb-2">Art Style</p>
            <div className="flex gap-2 flex-wrap">
              {PANEL_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-navy transition-all ${
                    selectedStyle === style.id
                      ? 'bg-navy text-white'
                      : 'bg-white text-navy hover:bg-surface-light'
                  }`}
                >
                  {style.icon} {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Creator */}
          <div className="brutalist-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-primary" />
              <h3 className="font-black text-navy uppercase text-sm">New Panel</h3>
            </div>

            {currentComic.panels.length === 0 && (
              <div className="mb-3 p-3 bg-highlight/20 border-2 border-highlight">
                <p className="text-xs font-bold text-navy uppercase mb-1">Story Starter</p>
                <p className="text-xs text-navy/60 font-medium italic">
                  {STORY_STARTERS[currentComic.id % STORY_STARTERS.length]}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">
                  Scene Description
                </label>
                <input
                  type="text"
                  value={panelPrompt}
                  onChange={(e) => setPanelPrompt(e.target.value)}
                  placeholder="Describe what happens in this panel..."
                  className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-navy/50 uppercase block mb-1">
                    Caption (optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Narrator text..."
                    className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy/50 uppercase block mb-1">
                    Dialogue (optional)
                  </label>
                  <input
                    type="text"
                    value={dialogue}
                    onChange={(e) => setDialogue(e.target.value)}
                    placeholder="Character speech..."
                    className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-danger font-bold">{error}</p>
              )}

              <button
                onClick={handleAddPanel}
                disabled={!panelPrompt.trim() || generating}
                className={`w-full btn-brutalist justify-center ${
                  panelPrompt.trim() && !generating
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-navy/30 cursor-not-allowed border-navy/20'
                }`}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Drawing Panel...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Panel
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={() => setViewingComic(currentComic)}
            disabled={currentComic.panels.length === 0}
            className={`w-full btn-brutalist justify-center mb-4 ${
              currentComic.panels.length > 0
                ? 'bg-accent text-navy'
                : 'bg-surface-light text-navy/30 cursor-not-allowed border-navy/20'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Read Comic
          </button>
        </>
      ) : (
        <>
          {/* Create New Comic */}
          {creatingNew ? (
            <div className="brutalist-card p-5 mb-4">
              <h3 className="font-black text-navy uppercase text-sm mb-3">New Comic</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Comic title..."
                  className="flex-1 px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateComic()}
                />
                <button
                  onClick={handleCreateComic}
                  disabled={!newTitle.trim()}
                  className={`btn-brutalist ${newTitle.trim() ? 'bg-primary text-white' : 'bg-surface-light text-navy/30 border-navy/20'}`}
                >
                  Create
                </button>
              </div>
              <button
                onClick={() => setCreatingNew(false)}
                className="text-xs text-navy/40 font-bold uppercase mt-2 hover:text-navy transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              className="w-full btn-brutalist bg-primary text-white justify-center mb-4"
            >
              <Plus className="w-4 h-4" />
              New Comic
            </button>
          )}

          {/* Comics List */}
          {comics.length === 0 ? (
            <div className="brutalist-card p-8 text-center">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-navy/50 text-sm font-medium">
                No comics yet. Create your first story!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comics.map(comic => (
                <div key={comic.id} className="brutalist-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-black text-navy uppercase text-sm">{comic.title}</h3>
                      <p className="text-xs text-navy/40 font-medium mt-0.5">
                        {comic.panels.length} panels &middot; by {comic.author} &middot; {new Date(comic.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComic(comic.id)}
                      className="text-navy/30 hover:text-danger transition-colors ml-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail strip */}
                  {comic.panels.length > 0 && (
                    <div className="flex gap-1 mt-3 overflow-x-auto">
                      {comic.panels.slice(0, 6).map(panel => (
                        <div key={panel.id} className="w-16 h-12 flex-shrink-0 border border-navy overflow-hidden">
                          <img src={panel.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {comic.panels.length > 6 && (
                        <div className="w-16 h-12 flex-shrink-0 border border-navy flex items-center justify-center bg-surface-light">
                          <span className="text-[10px] font-black text-navy">+{comic.panels.length - 6}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setCurrentComic(comic)}
                      className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add Panels
                    </button>
                    <button
                      onClick={() => { setViewingComic(comic); setViewPage(0) }}
                      disabled={comic.panels.length === 0}
                      className={`btn-brutalist py-1.5 px-3 text-xs ${
                        comic.panels.length > 0 ? 'bg-accent text-navy' : 'bg-surface-light text-navy/30 border-navy/20'
                      }`}
                    >
                      <BookOpen className="w-3 h-3" />
                      Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="brutalist-card-pink p-4 mt-4">
            <p className="text-sm font-black text-white uppercase mb-1">How to Play</p>
            <p className="text-xs text-white/80 font-medium">
              Create comic stories panel by panel! Choose an art style, describe each scene,
              add captions and dialogue. AI generates the artwork for each panel. Read your
              completed comics in the built-in reader. Each panel earns 65 points!
            </p>
          </div>
        </>
      )}
    </div>
  )
}
