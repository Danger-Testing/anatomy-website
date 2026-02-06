'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Artifact } from '@/components/Artifact'
import { TraitEditor } from '@/components/TraitEditor'
import { BodyPart, DEFAULT_BODY_PARTS, AgentConfig } from '@/lib/types'

type SessionStatus = 'loading' | 'editing' | 'ready' | 'error'

interface RecommendationItem {
  category: 'musician' | 'art' | 'poem' | 'book'
  title: string
  creator?: string
  description: string
  searchQuery?: string
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

  // Copy state for ready page
  const [copied, setCopied] = useState(false)

  // Curate state
  const [curating, setCurating] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendationItem[] | null>(null)
  const [curateError, setCurateError] = useState('')

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

  async function curate() {
    setCurating(true)
    setCurateError('')
    setRecommendations(null)

    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      })

      const data = await res.json()

      if (!data.success) {
        setCurateError(data.error || 'Failed to curate')
        return
      }

      setRecommendations(data.recommendations)
    } catch {
      setCurateError('Failed to connect')
    } finally {
      setCurating(false)
    }
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
          src="/appstar.png"
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
          src="/appstar.png"
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
            <a
              href="/"
              className="inline-block mt-4 px-6 py-3 bg-black text-white uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors"
            >
              Go Home
            </a>
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
          src="/appstar.png"
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
        src="/appstar.png"
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
        <a href="/">
          <img
            src="/logo.svg"
            alt="Anatomy Logo"
            className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto hover:opacity-60 transition-opacity cursor-pointer"
          />
        </a>

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
        <TraitEditor
          partLabel={selectedPart.label}
          partFilename={selectedPart.filename}
          content={files[selectedPart.filename] || ''}
          onClose={() => setSelectedPart(null)}
          onSave={(content) => updateFileContent(selectedPart.filename, content)}
        />
      )}

      {/* Curate recommendations modal - 2x2 grid */}
      {recommendations && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          onClick={() => setRecommendations(null)}
        >
          <div
            className="w-full h-full max-w-4xl max-h-[90vh] mx-4 my-4 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setRecommendations(null)}
              className="absolute top-6 right-6 z-10 text-white text-2xl leading-none bg-black/30 w-10 h-10 flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              x
            </button>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 grid-rows-2 flex-1">
              {recommendations.map((rec, i) => {
                const colors: Record<string, string> = {
                  musician: '#024D4D',
                  art: '#FF6600',
                  poem: '#7A0085',
                  book: '#0004FF'
                }
                const bgColor = colors[rec.category] || '#808080'
                const searchUrl = rec.category === 'musician' && rec.searchQuery
                  ? `https://open.spotify.com/search/${encodeURIComponent(rec.searchQuery)}`
                  : `https://www.perplexity.ai/search?q=${encodeURIComponent(rec.searchQuery || rec.title)}`

                return (
                  <a
                    key={i}
                    href={searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-6 hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Category label */}
                    <div className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                      {rec.category}
                    </div>

                    {/* Content at bottom */}
                    <div className="mt-auto">
                      <h3 className="font-bold text-lg text-white mb-2 uppercase">
                        {rec.title}
                      </h3>
                      {rec.creator && (
                        <p className="text-sm text-white font-bold opacity-90 mb-3">
                          by {rec.creator}
                        </p>
                      )}
                      <p className="text-sm text-white leading-tight opacity-80">
                        {rec.description}
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {(error || curateError) && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error || curateError}
        </div>
      )}
    </div>
  )
}
