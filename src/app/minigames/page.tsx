'use client'

import { useState } from 'react'

interface RecommendationItem {
  category: 'musician' | 'art' | 'poem' | 'book'
  title: string
  creator?: string
  description: string
  searchQuery?: string
}

const minigames = [
  { id: 'curate', name: 'Curate', description: 'Collect and organize' },
  { id: 'dreams', name: 'Dreams', description: 'Explore your subconscious' },
  { id: 'memory', name: 'Memory', description: 'Test your recall' },
  { id: 'puzzle', name: 'Puzzle', description: 'Solve the pieces' },
  { id: 'chase', name: 'Chase', description: 'Run and catch' },
  { id: 'draw', name: 'Draw', description: 'Express yourself' },
  { id: 'match', name: 'Match', description: 'Find the pairs' },
  { id: 'rhythm', name: 'Rhythm', description: 'Feel the beat' },
  { id: 'build', name: 'Build', description: 'Create something new' },
  { id: 'quest', name: 'Quest', description: 'Adventure awaits' },
  { id: 'trade', name: 'Trade', description: 'Buy and sell' },
  { id: 'escape', name: 'Escape', description: 'Find your way out' },
]

export default function MinigamesPage() {
  const [curating, setCurating] = useState(false)
  const [recommendations, setRecommendations] = useState<RecommendationItem[] | null>(null)
  const [curateError, setCurateError] = useState('')

  async function handleCurate() {
    setCurating(true)
    setCurateError('')
    setRecommendations(null)

    // For now, using placeholder files - later this can pull from actual agent data
    const files = {
      'identity.md': '# Identity\n\nA curious explorer of culture and meaning.',
      'soul.md': '# Soul\n\nDrawn to the unconventional and the profound.'
    }

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

  function handleMinigameClick(gameId: string) {
    if (gameId === 'curate') {
      handleCurate()
    }
    // Other minigames can be added here
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-12 pb-8">
        {/* Lobster Profile Picture with Name overlay */}
        <div className="relative">
          <img
            src="/lobster.png"
            alt="Lobster"
            className="w-40 h-40 md:w-48 md:h-48 object-contain"
          />
          {/* Name */}
          <h1 className="absolute inset-0 flex items-center justify-center text-2xl md:text-3xl uppercase tracking-wide">
            NEUE
          </h1>
        </div>
      </div>

      {/* Minigames Grid - 4 columns x 3 rows */}
      <div className="flex-1 px-6 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {minigames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleMinigameClick(game.id)}
              disabled={game.id === 'curate' && curating}
              className="group border border-black bg-white p-6 flex flex-col items-center justify-center aspect-square hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-xl md:text-2xl uppercase font-bold">
                {game.id === 'curate' && curating ? 'Curating...' : game.name}
              </span>
              <span className="mt-2 text-sm opacity-60 group-hover:opacity-80">
                {game.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Back link */}
      <footer className="px-6 py-6">
        <a href="/" className="text-xl uppercase hover:underline">
          &larr; Back
        </a>
      </footer>

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
      {curateError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {curateError}
        </div>
      )}
    </div>
  )
}
