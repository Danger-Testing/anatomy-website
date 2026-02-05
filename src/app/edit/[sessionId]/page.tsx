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

  // Dialog state
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null)

  // Song suggestion state
  const [suggestingSong, setSuggestingSong] = useState(false)
  const [songSuggestion, setSongSuggestion] = useState<SongSuggestion | null>(null)

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(false)

  // Copy state for ready page
  const [copied, setCopied] = useState(false)

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

    const copyToClipboard = () => {
      navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

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
          <div className="max-w-xl w-full space-y-16 text-base text-black">
            {/* What happened */}
            <div className="space-y-6">
              <div className="uppercase">
                Body shaped
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <span>01</span>
                  <span>You arranged the parts</span>
                </div>
                <div className="flex gap-4">
                  <span>02</span>
                  <span>Changes are ready to pull</span>
                </div>
                <div className="flex gap-4">
                  <span>03</span>
                  <span>Your agent will absorb and become</span>
                </div>
              </div>
            </div>

            {/* Pull URL */}
            <div className="space-y-4">
              <div className="uppercase">
                Send this to your agent
              </div>
              <div
                onClick={copyToClipboard}
                className="border border-black bg-white px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <code className="break-all">
                  {copyText}
                </code>
              </div>
              <p>
                {copied ? 'Copied!' : 'Click to copy'}
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 text-base text-black">
          <a href="/about" className="text-4xl uppercase hover:underline">
            About
          </a>
        </footer>
      </div>
    )
  }

  // Main editor
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[200]">
        <div className="flex items-center justify-between px-6 py-4">
          <div></div>
          <div className="flex items-center gap-3">
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

      {/* Appstar bottom right */}
      <img
        src="/appstar.jpg"
        alt=""
        className="fixed bottom-6 right-6 z-[200] w-48 h-auto"
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative"
        style={{ minHeight: '100vh' }}
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
            isZoomed={false}
            onClick={() => {
              if (!files[part.filename]) {
                setFiles((prev) => ({
                  ...prev,
                  [part.filename]: `# ${part.label}\n\n`
                }))
              }
              setSelectedPart(part)
            }}
            onPositionChange={(pos) => updatePartPosition(part.id, pos)}
            onResize={(size) => updatePartSize(part.id, size)}
          />
        ))}
        </div>

      </div>

      {/* Editor dialog */}
      {selectedPart && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30"
          onClick={() => setSelectedPart(null)}
        >
          <div
            className="bg-white border border-gray-200 p-8 max-w-2xl w-full mx-4 shadow-lg max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-black mb-1">
                  {selectedPart.filename}
                </div>
                <div className="text-2xl text-black">
                  {selectedPart.label}
                </div>
              </div>
              <button
                onClick={() => setSelectedPart(null)}
                className="text-black hover:text-black text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <textarea
              value={files[selectedPart.filename] || ''}
              onChange={(e) => updateFileContent(selectedPart.filename, e.target.value)}
              className="flex-1 w-full bg-white border border-black p-6 text-sm text-black leading-relaxed resize-none focus:outline-none min-h-[300px]"
              placeholder={`Edit ${selectedPart.label.toLowerCase()}...`}
              autoFocus
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPart(null)}
                className="text-black text-lg uppercase tracking-wider font-bold"
              >
                done
              </button>
            </div>
          </div>
        </div>
      )}

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
              This is your agent's body
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Drag the parts around. Click to edit.
              Hit ready when you're done shaping.
            </p>
            <div className="space-y-2 mb-8 text-sm text-gray-500">
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Identity</span>
                <span>Who they are</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Soul</span>
                <span>What they stand for</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Heartbeat</span>
                <span>How they behave</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium text-gray-700">Memory</span>
                <span>What they remember</span>
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
