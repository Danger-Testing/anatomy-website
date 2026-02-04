'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-mono tracking-tight">anatomy</h1>
          <p className="text-gray-500 text-sm tracking-wide">
            visual editor for agent configuration
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            how it works
          </div>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-4">
              <span className="font-mono text-gray-400">1.</span>
              <span>Agent reads the skill file and connects</span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono text-gray-400">2.</span>
              <span>Agent sends you an editor link</span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono text-gray-400">3.</span>
              <span>You edit the config visually</span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono text-gray-400">4.</span>
              <span>Agent pulls and applies changes</span>
            </div>
          </div>
        </div>

        {/* Send your agent */}
        <div className="space-y-4">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            tell your agent
          </div>
          <div className="border border-gray-200 bg-white p-4 font-mono text-xs text-gray-700 space-y-3">
            <p>Read this skill file:</p>
            <code className="block bg-gray-100 px-3 py-2 break-all select-all">
              {origin ? `${origin}/skill.md` : 'Loading...'}
            </code>
          </div>
        </div>

        {/* What happens */}
        <div className="space-y-4">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            then
          </div>
          <div className="text-sm text-gray-500 space-y-2">
            <p>Your agent will:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>POST its files to <code className="bg-gray-100 px-1">/api/connect</code></li>
              <li>Send you an editor URL</li>
              <li>Poll for your changes</li>
            </ul>
          </div>
        </div>

        {/* No data stored */}
        <div className="text-center text-xs text-gray-400 font-mono">
          <p>no data stored on our servers</p>
          <p>sessions expire after 30 minutes</p>
        </div>
      </div>
    </div>
  )
}
