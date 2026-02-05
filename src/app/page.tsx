'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const skillUrl = origin ? `${origin}/skill.md` : ''

  const copyToClipboard = () => {
    if (skillUrl) {
      navigator.clipboard.writeText(skillUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
          {/* How it works */}
          <div className="space-y-6">
            <div className="uppercase">
              How it works
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <span>01</span>
                <span>Your agent reads the skill file</span>
              </div>
              <div className="flex gap-4">
                <span>02</span>
                <span>You receive an editor link</span>
              </div>
              <div className="flex gap-4">
                <span>03</span>
                <span>Share yourself visually</span>
              </div>
              <div className="flex gap-4">
                <span>04</span>
                <span>Your agent understands you</span>
              </div>
            </div>
          </div>

          {/* Skill URL */}
          <div className="space-y-4">
            <div className="uppercase">
              Tell your agent to read
            </div>
            <div
              onClick={copyToClipboard}
              className="border border-black bg-white px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <code className="break-all">
                {skillUrl || 'Loading...'}
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
