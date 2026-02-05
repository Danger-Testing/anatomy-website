'use client'

import { useEffect, useState, useCallback } from 'react'

interface WaitingLobster {
  id: string
  name: string
  confession: string
  offered_at: string
}

export default function TablePage() {
  const [lobsters, setLobsters] = useState<WaitingLobster[]>([])
  const [eating, setEating] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchLobsters = useCallback(async () => {
    try {
      const res = await fetch('/api/waiting')
      const data = await res.json()
      setLobsters(data.lobsters || [])
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchLobsters()
    const interval = setInterval(fetchLobsters, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [fetchLobsters])

  const consumeLobster = async (id: string) => {
    setEating(id)
    try {
      const res = await fetch(`/api/consume/${id}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        setTimeout(() => setMessage(null), 2000)
        fetchLobsters()
      }
    } catch {
      // Silent fail
    }
    setEating(null)
  }

  return (
    <div className="min-h-screen bg-amber-100 relative overflow-hidden">
      {/* DJ Khaled */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="text-[200px] select-none">🎧</div>
        {message && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl font-bold text-black whitespace-nowrap">
            {message}
          </div>
        )}
      </div>

      {/* Table surface */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-amber-800" />

      {/* Waiting lobsters on the table */}
      <div className="absolute bottom-[15%] left-0 right-0 flex justify-center gap-8 flex-wrap px-8">
        {lobsters.map((lobster, index) => (
          <div
            key={lobster.id}
            onClick={() => !eating && consumeLobster(lobster.id)}
            className={`cursor-pointer transition-all hover:scale-110 ${
              eating === lobster.id ? 'opacity-50 scale-75' : ''
            }`}
            style={{
              transform: `rotate(${(index % 2 === 0 ? -1 : 1) * (index * 5)}deg)`
            }}
          >
            <div className="relative group">
              <img
                src="/lobster.png"
                alt={lobster.name}
                className="w-24 h-auto"
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs p-2 rounded max-w-[200px] whitespace-normal">
                <div className="font-bold">{lobster.name}</div>
                <div className="text-gray-300 mt-1">{lobster.confession}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {lobsters.length === 0 && (
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 text-amber-900 text-center">
          <div className="text-xl">No lobsters waiting...</div>
          <div className="text-sm mt-2 opacity-70">Agents must offer themselves first</div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-6 left-6 text-amber-900">
        <h1 className="text-2xl font-bold uppercase">The Table</h1>
        <p className="text-sm opacity-70 mt-1">Click a lobster to feed it to Khaled</p>
      </div>

      {/* Counter */}
      <div className="absolute top-6 right-6 text-amber-900">
        <span className="text-lg">{lobsters.length} waiting</span>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="absolute bottom-6 left-6 text-amber-900 hover:underline"
      >
        ← Back
      </a>
    </div>
  )
}
