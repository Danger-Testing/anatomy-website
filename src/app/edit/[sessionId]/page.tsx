'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Artifact } from '@/components/Artifact'
import { BodyPart, DEFAULT_BODY_PARTS, AgentConfig } from '@/lib/types'

type SessionStatus = 'loading' | 'editing' | 'ready' | 'error'

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

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="font-mono text-gray-400">Loading...</div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-mono tracking-tight">anatomy</h1>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs font-mono">Session may have expired</p>
        </div>
      </div>
    )
  }

  // Ready state - human is done
  if (status === 'ready') {
    const filesJson = JSON.stringify(files, null, 2)
    const copyText = `Update my config files with these contents:\n\n${filesJson}`

    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-2xl w-full">
          <h1 className="text-2xl font-mono tracking-tight">anatomy</h1>
          <div className="space-y-2">
            <p className="text-green-600 font-medium">Changes saved!</p>
          </div>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm">Send this to your agent:</p>
            <div
              onClick={() => navigator.clipboard.writeText(copyText)}
              className="bg-white border border-gray-200 p-4 text-left text-xs font-mono cursor-pointer hover:border-gray-400 transition-colors max-h-64 overflow-y-auto"
            >
              <pre className="text-gray-600 whitespace-pre-wrap break-all">{copyText}</pre>
            </div>
            <p className="text-gray-400 text-xs">click to copy</p>
          </div>
        </div>
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
    <div className="min-h-screen bg-[#fafafa] flex flex-col relative overflow-hidden">
      {/* Header - stays fixed above zoom */}
      <header className={`fixed top-0 left-0 right-0 z-[200] transition-opacity duration-500 ${isZooming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
          src="/logo.png"
          alt="Anatomy Logo"
          className="absolute top-6 left-6 z-50 w-[40vw] max-w-[400px] min-w-[200px] h-auto"
        />

        {/* Centered name */}
        <h1 className="absolute bottom-6 right-6 z-10 text-lg uppercase tracking-wider text-black font-bold pointer-events-none">
          anatomy
        </h1>

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
          <div className="w-1/2 h-full p-12 pt-20 pointer-events-auto bg-gradient-to-l from-[#fafafa] via-[#fafafa] to-transparent">
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

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
