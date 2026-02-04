'use client'

import { useState } from 'react'
import { searchWithDetails, MetObject } from '@/lib/met-api'

interface ImageSearchModalProps {
  onSelect: (imageUrl: string, objectId: number) => void
  onClose: () => void
}

export function ImageSearchModal({ onSelect, onClose }: ImageSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MetObject[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    const objects = await searchWithDetails(query)
    setResults(objects)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-mono text-lg">Search Met Museum</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
            &times;
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artifacts... (e.g. 'bronze head', 'buddha', 'hand')"
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 && !loading && (
            <p className="text-gray-500 text-center py-8">
              Search the Met Museum collection for artifacts
            </p>
          )}

          <div className="grid grid-cols-3 gap-4">
            {results.map((obj) => (
              <button
                key={obj.objectID}
                onClick={() => onSelect(obj.primaryImage, obj.objectID)}
                className="group relative aspect-square bg-gray-100 rounded overflow-hidden hover:ring-2 ring-black"
              >
                <img
                  src={obj.primaryImageSmall || obj.primaryImage}
                  alt={obj.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{obj.title}</p>
                  <p className="text-white/70 text-xs truncate">{obj.culture || obj.period}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom upload option */}
        <div className="p-4 border-t">
          <label className="block">
            <span className="text-gray-600 text-sm">Or paste an image URL:</span>
            <input
              type="url"
              placeholder="https://..."
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-black"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const url = (e.target as HTMLInputElement).value
                  if (url) onSelect(url, 0)
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
