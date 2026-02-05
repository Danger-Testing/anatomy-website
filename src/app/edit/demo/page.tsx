'use client'

import { useState, useRef } from 'react'
import { Artifact } from '@/components/Artifact'
import { BodyPart, DEFAULT_BODY_PARTS } from '@/lib/types'

export default function DemoEditor() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Config state
  const [files, setFiles] = useState<{ [key: string]: string }>({})
  const [bodyParts, setBodyParts] = useState<BodyPart[]>(DEFAULT_BODY_PARTS)

  // Dialog state
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null)

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

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">

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
        {/* Logo in top left - links to home */}
        <a href="/" className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px]">
          <img
            src="/logo.svg"
            alt="Anatomy Logo"
            className="w-full h-auto"
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
    </div>
  )
}
