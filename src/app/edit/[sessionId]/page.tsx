'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Artifact } from '@/components/Artifact'
import { BodyPart, DEFAULT_BODY_PARTS, AgentConfig } from '@/lib/types'

type SessionStatus = 'loading' | 'editing' | 'ready' | 'error'

interface SongSuggestion {
  song: string
  artist: string
  reason: string
}

export default function Editor() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const token = searchParams.get('token')
  const containerRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<SessionStatus>('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Config state
  const [files, setFiles] = useState<{ [key: string]: string }>({})
  const [bodyParts, setBodyParts] = useState<BodyPart[]>(DEFAULT_BODY_PARTS)

  // Modal state

  // Zoom state
  const [zoomedPart, setZoomedPart] = useState<BodyPart | null>(null)
  const [isZooming, setIsZooming] = useState(false)

  // Song suggestion state
  const [suggestingSong, setSuggestingSong] = useState(false)
  const [songSuggestion, setSongSuggestion] = useState<SongSuggestion | null>(null)

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(true)

  // Load config on mount
  useEffect(() => {
    if (!token) {
      setError('Missing token')
      setStatus('error')
      return
    }
    fetchConfig()
  }, [sessionId, token])

  async function fetchConfig() {
    setStatus('loading')
    try {
      const res = await fetch(`/api/session/${sessionId}?token=${token}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to load session')
        setStatus('error')
        return
      }

      setFiles(data.config.files || {})
      if (data.config.layout) {
        setBodyParts(Object.values(data.config.layout))
      }
      setStatus('editing')
      setError('')
    } catch {
      setError('Failed to connect')
      setStatus('error')
    }
  }

  async function saveConfig() {
    setSaving(true)
    const config: AgentConfig = {
      files,
      layout: bodyParts.reduce((acc, part) => {
        acc[part.id] = part
        return acc
      }, {} as { [key: string]: BodyPart })
    }

    try {
      const res = await fetch(`/api/session/${sessionId}?token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })

      if (!res.ok) {
        setError('Failed to save')
      }
    } catch {
      setError('Failed to save')
    }
    setSaving(false)
  }

  async function markReady() {
    // Save first, then mark ready
    await saveConfig()

    try {
      const res = await fetch(`/api/session/${sessionId}?token=${token}`, {
        method: 'POST'
      })

      if (res.ok) {
        setStatus('ready')
      } else {
        setError('Failed to mark ready')
      }
    } catch {
      setError('Failed to mark ready')
    }
  }

  function updateFileContent(filename: string, content: string) {
    setFiles((prev) => ({ ...prev, [filename]: content }))
  }

  function updatePartPosition(partId: string, position: { x: number; y: number }) {
    setBodyParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, position: { ...p.position, ...position } } : p
      )
    )
  }

  function updatePartSize(partId: string, size: { width: number; height: number }) {
    setBodyParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, position: { ...p.position, ...size } } : p
      )
    )
  }

  async function suggestSong() {
    const identityContent = files['IDENTITY.md']
    if (!identityContent || identityContent.trim() === '' || identityContent.trim() === '# Identity\n\n') {
      setError('Add some identity content first')
      return
    }

    setSuggestingSong(true)
    setSongSuggestion(null)

    try {
      const res = await fetch(`/api/suggest-song?session_id=${sessionId}&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: identityContent })
      })

      const data = await res.json()

      if (data.success) {
        setSongSuggestion(data.suggestion)
      } else {
        setError(data.error || 'Failed to get song suggestion')
      }
    } catch {
      setError('Failed to get song suggestion')
    }

    setSuggestingSong(false)
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <img
          src="/logo.svg"
          alt="Anatomy"
          className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto"
        />
        <img
          src="/appstar.jpg"
          alt=""
          className="absolute bottom-6 right-6 z-50 w-48 h-auto"
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        <img
          src="/logo.svg"
          alt="Anatomy"
          className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto"
        />
        <img
          src="/appstar.jpg"
          alt=""
          className="absolute bottom-6 right-6 z-50 w-48 h-auto"
        />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full space-y-6">
            <h1 className="text-3xl font-light tracking-tight">
              Something went wrong
            </h1>
            <p className="text-gray-600">{error}</p>
            <p className="text-gray-400 text-sm">
              The session may have expired. Ask your agent for a new link.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Ready state - human is done
  if (status === 'ready') {
    const pullUrl = `${window.location.origin}/api/pull/${sessionId}?token=${token}`
    const copyText = `Pull my updated config from: ${pullUrl}`

    return (
      <div className="min-h-screen bg-white flex flex-col relative">
        {/* Logo top left */}
        <img
          src="/logo.svg"
          alt="Anatomy"
          className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto"
        />

        {/* Appstar bottom right */}
        <img
          src="/appstar.jpg"
          alt=""
          className="absolute bottom-6 right-6 z-50 w-48 h-auto"
        />

        {/* Main content - centered */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-xl w-full space-y-12">
            {/* Success message */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-light leading-tight tracking-tight">
                You've shared
                <br />
                yourself
              </h1>
              <p className="text-lg text-gray-500 font-light">
                Your AI now has a deeper understanding of who you are.
              </p>
            </div>

            {/* Pull URL for agent */}
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                Send this to your agent
              </div>
              <div
                onClick={() => navigator.clipboard.writeText(copyText)}
                className="border border-gray-200 bg-gray-50 px-5 py-4 cursor-pointer hover:border-gray-400 transition-colors"
              >
                <code className="text-sm text-gray-700 break-all">
                  {copyText}
                </code>
              </div>
              <p className="text-xs text-gray-400">
                Click to copy
              </p>
            </div>

            {/* What happens next */}
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] text-gray-400">
                What happens next
              </div>
              <p className="text-gray-600">
                Your agent will pull these files and use them to better understand
                your identity, values, and preferences.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 flex justify-between items-end">
          <a href="/about" className="text-4xl uppercase text-black hover:underline">
            About
          </a>
          <p className="text-xs text-gray-400">
            Session expires in 15 minutes
          </p>
        </footer>
      </div>
    )
  }

  // Calculate zoom transform to center on a part
  const getZoomTransform = () => {
    if (!zoomedPart || !isZooming) return {}

    const scale = 6 // How much to zoom in

    // The dot is positioned at part.position.x% and part.position.y% of the container
    // We want to translate so that point ends up at the center of the viewport
    // transform-origin is top-left by default

    // After scaling, the point at (x%, y%) will be at (x% * scale, y% * scale)
    // We want to move it to (50%, 50%) of the viewport
    // So we need to translate by: 50% - x% * scale (in the scaled coordinate system)
    // Which means: (50 - x * scale) / scale = 50/scale - x

    const originX = zoomedPart.position.x
    const originY = zoomedPart.position.y

    // Calculate offset to center the dot (adding ~30px for the label above the dot)
    const translateX = (50 - originX * scale) / scale
    const translateY = (50 - originY * scale) / scale - 2 // slight adjustment for label

    return {
      transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
      transformOrigin: '0 0',
      transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }

  // Main editor
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Header - stays fixed above zoom */}
      <header className={`fixed top-0 left-0 right-0 z-[200] transition-opacity duration-500 ${isZooming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div></div>
          <div className="flex items-center gap-3">
            <button
              onClick={suggestSong}
              disabled={suggestingSong}
              className="text-black text-lg uppercase tracking-wider font-bold disabled:opacity-50"
            >
              {suggestingSong ? '...' : 'song'}
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="text-black text-lg uppercase tracking-wider font-bold disabled:opacity-50"
            >
              {saving ? 'saving...' : 'save'}
            </button>
            <button
              onClick={markReady}
              className="text-black text-lg uppercase tracking-wider font-bold"
            >
              ready
            </button>
          </div>
        </div>
      </header>

      {/* Back button when zoomed */}
      <button
        onClick={() => {
          setIsZooming(false)
          setTimeout(() => setZoomedPart(null), 1200)
        }}
        className={`fixed top-6 left-6 z-[200] text-black text-lg uppercase tracking-wider font-bold transition-opacity duration-500 ${isZooming ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        ← back
      </button>

      {/* Appstar bottom right */}
      <img
        src="/appstar.jpg"
        alt=""
        className={`fixed bottom-6 right-6 z-[200] w-48 h-auto transition-opacity duration-500 ${isZooming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      />

      {/* Zoomable canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        style={{
          minHeight: '100vh',
          ...getZoomTransform()
        }}
      >
        {/* Logo in top left */}
        <img
          src="/logo.svg"
          alt="Anatomy Logo"
          className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto"
        />

        {/* Lobster + artifacts container (scaled up) */}
        <div
          className="absolute inset-0 z-20"
          style={{
            transform: 'scale(1.3)',
            transformOrigin: 'center center'
          }}
        >
          {/* Lobster background */}
          <div
            className="absolute inset-0 z-0 pointer-events-none p-24"
            style={{
              backgroundImage: 'url(/lobster.png)',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.15
            }}
          />

          {bodyParts.map((part) => (
          <Artifact
            key={part.id}
            part={part}
            containerRef={containerRef}
            isZoomed={zoomedPart?.id === part.id}
            onClick={() => {
              if (!files[part.filename]) {
                setFiles((prev) => ({
                  ...prev,
                  [part.filename]: `# ${part.label}\n\n`
                }))
              }
              setZoomedPart(part)
              // Small delay to let state update before zooming
              requestAnimationFrame(() => setIsZooming(true))
            }}
            onPositionChange={(pos) => updatePartPosition(part.id, pos)}
            onResize={(size) => updatePartSize(part.id, size)}
          />
        ))}
        </div>

      </div>

      {/* Editor overlay when zoomed */}
      <div
        className={`fixed inset-0 z-[150] flex items-center justify-end pointer-events-none transition-opacity duration-700 ${isZooming ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: isZooming ? '600ms' : '0ms' }}
      >
        {zoomedPart && (
          <div className="w-1/2 h-full p-12 pt-20 pointer-events-auto bg-gradient-to-l from-white via-white to-transparent">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">
              {zoomedPart.filename}
            </div>
            <div className="text-2xl mb-6 text-gray-600">
              {zoomedPart.label}
            </div>
            <textarea
              value={files[zoomedPart.filename] || ''}
              onChange={(e) => {
                updateFileContent(zoomedPart.filename, e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              ref={(el) => {
                // Set initial height on mount
                if (el) {
                  el.style.height = 'auto'
                  el.style.height = el.scrollHeight + 'px'
                }
              }}
              className="w-full bg-transparent border border-gray-200 rounded-lg p-6 text-sm leading-relaxed resize-none focus:outline-none focus:border-gray-400 min-h-[200px] overflow-hidden"
              placeholder={`Write content for ${zoomedPart.label}...`}
            />
          </div>
        )}
      </div>

      {/* Song suggestion modal */}
      {songSuggestion && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/20"
          onClick={() => setSongSuggestion(null)}
        >
          <div
            className="bg-white border border-gray-200 p-8 max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">
              perfect song
            </div>
            <div className="text-2xl font-bold mb-1">{songSuggestion.song}</div>
            <div className="text-lg text-gray-600 mb-4">{songSuggestion.artist}</div>
            {songSuggestion.reason && (
              <p className="text-sm text-gray-500 mb-6">{songSuggestion.reason}</p>
            )}
            <button
              onClick={() => setSongSuggestion(null)}
              className="text-black text-sm uppercase tracking-wider font-bold"
            >
              close
            </button>
          </div>
        </div>
      )}

      {/* Welcome modal */}
      {showWelcome && status === 'editing' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30"
          onClick={() => setShowWelcome(false)}
        >
          <div
            className="bg-white border border-gray-200 p-8 max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-6">
              welcome
            </div>
            <h2 className="text-2xl font-bold mb-4">
              Your AI wants to understand you
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Click on each body part to share that aspect of yourself.
              Take your time—this helps your AI truly know who you are.
            </p>
            <div className="space-y-2 mb-8 text-sm text-gray-500">
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Head</span>
                <span>Who you are</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Soul</span>
                <span>What matters to you</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Heart</span>
                <span>How you want me to behave</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Memory</span>
                <span>Context to remember</span>
              </div>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="w-full bg-black text-white py-3 text-sm uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors"
            >
              Begin
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
