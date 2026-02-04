'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Artifact } from '@/components/Artifact'
import { EditorModal } from '@/components/EditorModal'
import { ImageSearchModal } from '@/components/ImageSearchModal'
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
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [changingImageFor, setChangingImageFor] = useState<string | null>(null)

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

  function updatePartImage(partId: string, imageUrl: string, objectId: number) {
    setBodyParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, imageUrl, metObjectId: objectId || undefined } : p
      )
    )
    setChangingImageFor(null)
  }

  function exportConfig() {
    const config: AgentConfig = {
      files,
      layout: bodyParts.reduce((acc, part) => {
        acc[part.id] = part
        return acc
      }, {} as { [key: string]: BodyPart })
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sessionId}-config.json`
    a.click()
    URL.revokeObjectURL(url)
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
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-mono tracking-tight">anatomy</h1>
          <div className="space-y-2">
            <p className="text-green-600 font-medium">Changes saved!</p>
            <p className="text-gray-500 text-sm">Your agent will pick up the changes shortly.</p>
          </div>
          <p className="text-gray-400 text-xs font-mono">You can close this tab</p>
        </div>
      </div>
    )
  }

  // Main editor
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#fafafa]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-sm tracking-wide">anatomy</h1>
            <span className="text-gray-300">|</span>
            <span className="font-mono text-xs text-gray-500">{sessionId}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportConfig}
              className="text-gray-500 hover:text-black text-sm font-mono"
            >
              export
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="text-gray-500 hover:text-black text-sm font-mono disabled:opacity-50"
            >
              {saving ? 'saving...' : 'save'}
            </button>
            <button
              onClick={markReady}
              className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
            >
              ready
            </button>
          </div>
        </div>
      </header>

      {/* Body canvas */}
      <main
        ref={containerRef}
        className="flex-1 relative mt-16"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        {bodyParts.map((part) => (
          <Artifact
            key={part.id}
            part={part}
            containerRef={containerRef}
            onEdit={() => {
              if (!files[part.filename]) {
                setFiles((prev) => ({
                  ...prev,
                  [part.filename]: `# ${part.label}\n\n`
                }))
              }
              setEditingFile(part.filename)
            }}
            onImageChange={() => setChangingImageFor(part.id)}
            onPositionChange={(pos) => updatePartPosition(part.id, pos)}
            onResize={(size) => updatePartSize(part.id, size)}
          />
        ))}

        {/* Instructions */}
        <div className="absolute bottom-6 left-6 text-xs text-gray-400 font-mono space-y-1">
          <p>drag to move</p>
          <p>hover for actions</p>
          <p className="text-gray-300 mt-2">click &quot;ready&quot; when done</p>
        </div>
      </main>

      {/* Editor modal */}
      {editingFile && (
        <EditorModal
          filename={editingFile}
          content={files[editingFile] || ''}
          onSave={(content) => updateFileContent(editingFile, content)}
          onClose={() => setEditingFile(null)}
        />
      )}

      {/* Image search modal */}
      {changingImageFor && (
        <ImageSearchModal
          onSelect={(url, id) => updatePartImage(changingImageFor, url, id)}
          onClose={() => setChangingImageFor(null)}
        />
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
