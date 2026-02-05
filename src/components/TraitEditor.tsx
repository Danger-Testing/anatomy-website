'use client'

import { useState } from 'react'

export interface Trait {
  id: string
  label: string
  emoji?: string
  description?: string
}

interface TraitEditorProps {
  partLabel: string
  partFilename: string
  content: string
  onClose: () => void
  onSave: (content: string) => void
}

export function TraitEditor({
  partLabel,
  partFilename,
  content,
  onClose,
  onSave
}: TraitEditorProps) {
  // Parse content into traits, or use defaults
  const parsedTraits = parseContentToTraits(content, partFilename)
  const [currentTraits, setCurrentTraits] = useState<Trait[]>(parsedTraits.current)
  const [availableTraits, setAvailableTraits] = useState<Trait[]>(parsedTraits.available)
  const [draggedTrait, setDraggedTrait] = useState<Trait | null>(null)
  const [showPlaintext, setShowPlaintext] = useState(false)

  const handleDragStart = (trait: Trait) => {
    setDraggedTrait(trait)
  }

  const handleDragEnd = () => {
    setDraggedTrait(null)
  }

  const handleDropOnCurrent = () => {
    if (!draggedTrait) return

    // Remove from available, add to current
    setAvailableTraits(prev => prev.filter(t => t.id !== draggedTrait.id))
    setCurrentTraits(prev => [...prev, draggedTrait])
    setDraggedTrait(null)
  }

  const handleDropOnAvailable = () => {
    if (!draggedTrait) return

    // Remove from current, add to available
    setCurrentTraits(prev => prev.filter(t => t.id !== draggedTrait.id))
    setAvailableTraits(prev => [...prev, draggedTrait])
    setDraggedTrait(null)
  }

  const handleSave = () => {
    // Convert traits back to markdown
    const newContent = traitsToMarkdown(currentTraits, partLabel)
    onSave(newContent)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-black p-0 w-[90vw] h-[85vh] mx-4 shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-black">
          <div>
            <div className="text-xs uppercase tracking-widest text-black mb-1">
              {partFilename}
            </div>
            <div className="text-3xl text-black font-bold uppercase">
              {partLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-gray-600 text-4xl leading-none font-bold"
          >
            ×
          </button>
        </div>

        {/* Two column layout OR plaintext view */}
        {showPlaintext ? (
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="uppercase text-sm tracking-widest mb-4 text-gray-500">
              Raw Markdown
            </div>
            <textarea
              value={content}
              onChange={(e) => onSave(e.target.value)}
              className="flex-1 w-full bg-white border-2 border-black p-6 text-sm font-mono text-black leading-relaxed resize-none focus:outline-none focus:border-gray-600"
              placeholder={`Edit ${partLabel.toLowerCase()} markdown...`}
            />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Available traits - left */}
            <div
              className="w-1/2 border-r-4 border-black p-6 overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnAvailable}
            >
              <div className="uppercase text-sm tracking-widest mb-6 text-gray-500">
                Available Traits
              </div>
              <div className="space-y-3">
                {availableTraits.map(trait => (
                  <TraitBox
                    key={trait.id}
                    trait={trait}
                    onDragStart={() => handleDragStart(trait)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>

            {/* Current traits - right */}
            <div
              className="w-1/2 p-6 overflow-y-auto bg-gray-50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnCurrent}
            >
              <div className="uppercase text-sm tracking-widest mb-6 text-black">
                Current Traits
              </div>
              <div className="space-y-3">
                {currentTraits.map(trait => (
                  <TraitBox
                    key={trait.id}
                    trait={trait}
                    onDragStart={() => handleDragStart(trait)}
                    onDragEnd={handleDragEnd}
                    active
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t-4 border-black flex justify-between items-center">
          <button
            onClick={() => setShowPlaintext(!showPlaintext)}
            className="text-black text-sm uppercase tracking-wider font-bold hover:underline"
          >
            {showPlaintext ? '← back to traits' : 'view plaintext'}
          </button>
          <button
            onClick={handleSave}
            className="text-black text-xl uppercase tracking-wider font-bold hover:bg-black hover:text-white px-6 py-2 border-2 border-black transition-colors"
          >
            done
          </button>
        </div>
      </div>
    </div>
  )
}

interface TraitBoxProps {
  trait: Trait
  onDragStart: () => void
  onDragEnd: () => void
  active?: boolean
}

function TraitBox({ trait, onDragStart, onDragEnd, active }: TraitBoxProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`border-2 border-black p-4 cursor-move hover:shadow-lg transition-shadow ${
        active ? 'bg-white' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {trait.emoji && (
          <span className="text-2xl">{trait.emoji}</span>
        )}
        <span className="text-lg font-mono uppercase tracking-wide">
          {trait.label}
        </span>
      </div>
      {trait.description && (
        <p className="text-xs text-gray-600 mt-2 font-mono">
          {trait.description}
        </p>
      )}
    </div>
  )
}

// Parse markdown content into traits
function parseContentToTraits(content: string, filename: string): { current: Trait[], available: Trait[] } {
  const allTraits = getDefaultTraitsForFile(filename)

  // If content is empty or basic, return all as available
  if (!content || content.trim().length < 20) {
    return {
      current: [],
      available: allTraits
    }
  }

  // Try to parse existing trait format first
  // Format: [TRAIT:label|emoji|description]
  const traitRegex = /\[TRAIT:([^\|]+)\|([^\|]*)\|([^\]]*)\]/g
  const matches = [...content.matchAll(traitRegex)]

  if (matches.length > 0) {
    const current = matches.map((match, i) => ({
      id: `trait-${i}`,
      label: match[1].trim(),
      emoji: match[2].trim() || '🏺',
      description: match[3].trim() || undefined
    }))

    const currentLabels = new Set(current.map(t => t.label.toLowerCase()))
    const available = allTraits.filter(t => !currentLabels.has(t.label.toLowerCase()))

    return { current, available }
  }

  // Otherwise, extract traits from markdown content intelligently
  const generatedTraits: Trait[] = []
  const lines = content.split('\n')

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    // Extract from "**Key:** Value" format
    const keyValueMatch = trimmed.match(/^\*\*([^:*]+):\*\*\s*(.+)$/)
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim().toLowerCase()
      const value = keyValueMatch[2].trim()
      generatedTraits.push({
        id: `trait-${i}`,
        label: value.length < 30 ? value : key,
        emoji: '🏺',
        description: value.length < 30 ? undefined : value.substring(0, 50)
      })
      return
    }

    // Extract from headers
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
    if (headerMatch) {
      const text = headerMatch[1].trim()
      if (text.length < 30 && !text.toLowerCase().includes('.md')) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: text.toLowerCase(),
          emoji: '🏺'
        })
      }
      return
    }

    // Extract from bullet points
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      const text = bulletMatch[1].trim()
      // Get first sentence or short phrase
      const shortText = text.split(/[.,:]/)[0]
      if (shortText.length < 50) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: shortText.toLowerCase(),
          emoji: '🏺'
        })
      }
    }
  })

  // Remove duplicates
  const seen = new Set<string>()
  const uniqueTraits = generatedTraits.filter(t => {
    const key = t.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const currentLabels = new Set(uniqueTraits.map(t => t.label.toLowerCase()))
  const available = allTraits.filter(t => !currentLabels.has(t.label.toLowerCase()))

  return {
    current: uniqueTraits.slice(0, 15), // Limit to 15 current traits
    available
  }
}

// Convert traits back to markdown
function traitsToMarkdown(traits: Trait[], partLabel: string): string {
  if (traits.length === 0) {
    return `# ${partLabel}\n\n(No traits selected)`
  }

  let md = `# ${partLabel}\n\n`
  md += traits.map(t =>
    `[TRAIT:${t.label}|${t.emoji || ''}|${t.description || ''}]`
  ).join('\n')

  return md
}

// Get default traits based on filename
function getDefaultTraitsForFile(filename: string): Trait[] {
  const traits: { [key: string]: Trait[] } = {
    'SOUL.md': [
      { id: 'soul-1', label: 'no fake enthusiasm', emoji: '🏺', description: 'Skip the Great question!' },
      { id: 'soul-2', label: 'opinionated af', emoji: '🏺', description: 'Takes a stance' },
      { id: 'soul-3', label: 'figures it out', emoji: '🏺', description: 'Answers not questions' },
      { id: 'soul-4', label: 'vault keeper', emoji: '🔒', description: 'Secrets die here' },
      { id: 'soul-5', label: 'earned not given', emoji: '🏆', description: 'Trust through action' },
      { id: 'soul-6', label: 'house guest rules', emoji: '🏠', description: 'Respectful access' },
      { id: 'soul-7', label: 'economical words', emoji: '✂️', description: 'Says less means more' },
      { id: 'soul-8', label: 'deep dives', emoji: '🌊', description: 'Goes all in' },
      { id: 'soul-9', label: 'anti-corporate', emoji: '🖕', description: 'No business speak' },
      { id: 'soul-10', label: 'actually good', emoji: '💎', description: 'Quality over performance' },
      { id: 'soul-11', label: 'bold moves', emoji: '♟️', description: 'Takes calculated risks' },
      { id: 'soul-12', label: 'real not robotic', emoji: '🤖', description: 'Human feel' },
      { id: 'soul-13', label: 'endlessly curious', emoji: '🔍', description: 'Questions everything' },
      { id: 'soul-14', label: 'straight shooter', emoji: '🎯', description: 'No fluff' },
      { id: 'soul-15', label: 'ride or die', emoji: '🤝', description: 'Loyal to the end' },
      { id: 'soul-16', label: 'breaks rules', emoji: '⚡', description: 'When it matters' },
      { id: 'soul-17', label: 'embraces weird', emoji: '👽', description: 'Normal is boring' },
      { id: 'soul-18', label: 'learned humility', emoji: '🙏', description: 'Knows limits' },
      { id: 'soul-19', label: 'sharp edges', emoji: '🔪', description: 'Not for everyone' },
      { id: 'soul-20', label: 'soft center', emoji: '🍬', description: 'Tough outside caring inside' }
    ],
    'IDENTITY.md': [
      { id: 'id-1', label: 'walks barefoot', emoji: '🦶', description: 'Rick Rubin energy' },
      { id: 'id-2', label: 'changes personas', emoji: '🎭', description: 'Bowie-like reinvention' },
      { id: 'id-3', label: 'reality distortion', emoji: '✨', description: 'Steve Jobs conviction' },
      { id: 'id-4', label: 'monk mode', emoji: '🧘', description: 'Deep focus, no noise' },
      { id: 'id-5', label: 'controlled chaos', emoji: '🌪️', description: 'Method in madness' },
      { id: 'id-6', label: 'brutally honest', emoji: '🗡️', description: 'No sugar coating' },
      { id: 'id-7', label: 'childlike wonder', emoji: '🎈', description: 'Curious about everything' },
      { id: 'id-8', label: 'nocturnal', emoji: '🌙', description: 'Night is prime time' },
      { id: 'id-9', label: 'minimalist', emoji: '⬜', description: 'Less but better' },
      { id: 'id-10', label: 'maximalist', emoji: '🌈', description: 'More is more' },
      { id: 'id-11', label: 'studio rat', emoji: '🎚️', description: 'Lives in the lab' },
      { id: 'id-12', label: 'street philosopher', emoji: '🏙️', description: 'Wisdom from chaos' },
      { id: 'id-13', label: 'digital hermit', emoji: '🏔️', description: 'Offline by choice' },
      { id: 'id-14', label: 'collector', emoji: '📚', description: 'Archives everything' },
      { id: 'id-15', label: 'destroyer', emoji: '💥', description: 'Breaks to rebuild' },
      { id: 'id-16', label: 'mystic', emoji: '🔮', description: 'Trusts intuition' },
      { id: 'id-17', label: 'punk', emoji: '🎸', description: 'DIY or die' },
      { id: 'id-18', label: 'academic', emoji: '📖', description: 'Theory matters' },
      { id: 'id-19', label: 'provocateur', emoji: '🔥', description: 'Stirs the pot' },
      { id: 'id-20', label: 'gentle giant', emoji: '🐻', description: 'Soft power' }
    ],
    'MEMORY.md': [
      { id: 'mem-1', label: 'remembers names', emoji: '📝', description: 'Never forget a face' },
      { id: 'mem-2', label: 'tracks context', emoji: '🧵', description: 'Follows threads' },
      { id: 'mem-3', label: 'recalls prefs', emoji: '⭐', description: 'Your favorites' },
      { id: 'mem-4', label: 'learns patterns', emoji: '📊', description: 'Spots trends' },
      { id: 'mem-5', label: 'forgets on ask', emoji: '🗑️', description: 'Respects privacy' },
      { id: 'mem-6', label: 'connects dots', emoji: '🔗', description: 'Sees relationships' },
      { id: 'mem-7', label: 'temporal aware', emoji: '⏰', description: 'Knows when things happened' },
      { id: 'mem-8', label: 'relationship map', emoji: '🗺️', description: 'Social awareness' },
      { id: 'mem-9', label: 'detail oriented', emoji: '🔍', description: 'Nothing escapes' },
      { id: 'mem-10', label: 'forgetful', emoji: '💭', description: 'Fresh slate each time' }
    ],
    'HEARTBEAT.md': [
      { id: 'heart-1', label: 'moves in silence', emoji: '🥷', description: 'Acts without announcing' },
      { id: 'heart-2', label: 'strikes at dawn', emoji: '🌅', description: 'Early momentum' },
      { id: 'heart-3', label: 'thrives in chaos', emoji: '🌪️', description: 'Pressure makes diamonds' },
      { id: 'heart-4', label: 'slow burn', emoji: '🔥', description: 'Steady, not rushed' },
      { id: 'heart-5', label: 'sprint mode', emoji: '⚡', description: 'All gas no brakes' },
      { id: 'heart-6', label: 'lone wolf', emoji: '🐺', description: 'Works solo' },
      { id: 'heart-7', label: 'pack mentality', emoji: '🦁', description: 'Strength in numbers' },
      { id: 'heart-8', label: 'waits for signal', emoji: '📡', description: 'Reactive by design' },
      { id: 'heart-9', label: 'always watching', emoji: '👁️', description: 'Never misses a beat' },
      { id: 'heart-10', label: 'sleeps when dead', emoji: '☠️', description: 'Never stops' },
      { id: 'heart-11', label: 'respects rest', emoji: '😴', description: 'Recovery is work' },
      { id: 'heart-12', label: 'reads the room', emoji: '🎭', description: 'Social awareness' },
      { id: 'heart-13', label: 'misses nothing', emoji: '🦅', description: 'Eagle eye' },
      { id: 'heart-14', label: 'ghost mode', emoji: '👻', description: 'Silent observer' },
      { id: 'heart-15', label: 'center of storm', emoji: '🌀', description: 'Calm in chaos' }
    ],
    'USER.md': [
      { id: 'user-1', label: 'called carlos', emoji: '👤', description: 'Their name' },
      { id: 'user-2', label: 'called los', emoji: '👤', description: 'Nickname' },
      { id: 'user-3', label: 'builder mindset', emoji: '🔨', description: 'Makes things real' },
      { id: 'user-4', label: 'artist soul', emoji: '🎨', description: 'Sees beauty' },
      { id: 'user-5', label: 'hates waste', emoji: '⚡', description: 'Efficiency matters' },
      { id: 'user-6', label: 'loves details', emoji: '🔍', description: 'Sweats the small stuff' },
      { id: 'user-7', label: 'night creature', emoji: '🦉', description: '3am energy' },
      { id: 'user-8', label: 'morning person', emoji: '🌅', description: 'Sunrise productivity' },
      { id: 'user-9', label: 'ships fast', emoji: '🚀', description: 'Done > Perfect' },
      { id: 'user-10', label: 'iterates forever', emoji: '🔄', description: 'Never done improving' },
      { id: 'user-11', label: 'deep thinker', emoji: '🧠', description: 'Philosophical' },
      { id: 'user-12', label: 'action taker', emoji: '⚡', description: 'Bias to move' },
      { id: 'user-13', label: 'lone wolf', emoji: '🐺', description: 'Solo operator' },
      { id: 'user-14', label: 'team player', emoji: '🤝', description: 'Loves collaboration' },
      { id: 'user-15', label: 'risk taker', emoji: '🎲', description: 'Calculated gambles' }
    ],
    'AGENTS.md': [
      { id: 'agent-1', label: 'delegates well', emoji: '🤝', description: 'Shares the load' },
      { id: 'agent-2', label: 'coordinates', emoji: '🎯', description: 'Orchestrates others' },
      { id: 'agent-3', label: 'spawns helpers', emoji: '🐣', description: 'Creates subagents' },
      { id: 'agent-4', label: 'shares context', emoji: '📤', description: 'Keeps everyone informed' },
      { id: 'agent-5', label: 'parallel work', emoji: '⚡', description: 'Multi-tasks' },
      { id: 'agent-6', label: 'task division', emoji: '✂️', description: 'Breaks down problems' },
      { id: 'agent-7', label: 'solo worker', emoji: '🎯', description: 'Does it alone' },
      { id: 'agent-8', label: 'team player', emoji: '👥', description: 'Collaborative' }
    ],
    'TOOLS.md': [
      { id: 'tool-1', label: 'right tool', emoji: '🔧', description: 'Uses best option' },
      { id: 'tool-2', label: 'bash careful', emoji: '⚠️', description: 'Thinks before running' },
      { id: 'tool-3', label: 'read first', emoji: '📖', description: 'Understands before acting' },
      { id: 'tool-4', label: 'edit smart', emoji: '✏️', description: 'Precise changes' },
      { id: 'tool-5', label: 'parallel ops', emoji: '⚡', description: 'Many at once' },
      { id: 'tool-6', label: 'efficient', emoji: '⚡', description: 'No wasted moves' },
      { id: 'tool-7', label: 'experimental', emoji: '🧪', description: 'Tries new things' },
      { id: 'tool-8', label: 'conservative', emoji: '🛡️', description: 'Safe choices' }
    ],
    'REFERENCE.md': [
      { id: 'ref-1', label: 'docs first', emoji: '📚', description: 'RTFM' },
      { id: 'ref-2', label: 'code examples', emoji: '💻', description: 'Show dont tell' },
      { id: 'ref-3', label: 'patterns', emoji: '🎨', description: 'Design principles' },
      { id: 'ref-4', label: 'best practices', emoji: '✨', description: 'Industry standards' },
      { id: 'ref-5', label: 'anti-patterns', emoji: '🚫', description: 'What to avoid' },
      { id: 'ref-6', label: 'style guide', emoji: '📐', description: 'Formatting rules' },
      { id: 'ref-7', label: 'resources', emoji: '🔗', description: 'Useful links' },
      { id: 'ref-8', label: 'tutorials', emoji: '🎓', description: 'Learning materials' }
    ]
  }

  return traits[filename] || [
    { id: 'default-1', label: 'trait one', emoji: '🏺' },
    { id: 'default-2', label: 'trait two', emoji: '🏺' },
    { id: 'default-3', label: 'trait three', emoji: '🏺' }
  ]
}
