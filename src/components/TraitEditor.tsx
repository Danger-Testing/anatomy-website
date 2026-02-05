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

        {/* Two column layout */}
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

        {/* Footer */}
        <div className="p-6 border-t-4 border-black flex justify-end">
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
  // If content is empty or basic, return predefined traits
  if (!content || content.trim().length < 50) {
    const allTraits = getDefaultTraitsForFile(filename)
    return {
      current: [],
      available: allTraits
    }
  }

  // Try to parse existing trait format
  // Format: [TRAIT:label|emoji|description]
  const traitRegex = /\[TRAIT:([^\|]+)\|([^\|]*)\|([^\]]*)\]/g
  const matches = [...content.matchAll(traitRegex)]

  if (matches.length > 0) {
    const current = matches.map((match, i) => ({
      id: `trait-${i}`,
      label: match[1].trim(),
      emoji: match[2].trim() || undefined,
      description: match[3].trim() || undefined
    }))

    const allTraits = getDefaultTraitsForFile(filename)
    const currentIds = new Set(current.map(t => t.label.toLowerCase()))
    const available = allTraits.filter(t => !currentIds.has(t.label.toLowerCase()))

    return { current, available }
  }

  // Otherwise, generate traits from markdown headers/content
  const lines = content.split('\n').filter(l => l.trim())
  const generatedTraits: Trait[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      const label = line.replace(/\*\*/g, '').trim()
      if (label.split(' ').length <= 3) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: label.toLowerCase()
        })
      }
    } else if (line.startsWith('##')) {
      const label = line.replace(/^#+/, '').trim()
      if (label.split(' ').length <= 3) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: label.toLowerCase()
        })
      }
    }
  })

  const allTraits = getDefaultTraitsForFile(filename)
  const available = allTraits.filter(t =>
    !generatedTraits.some(gt => gt.label === t.label)
  )

  return {
    current: generatedTraits.length > 0 ? generatedTraits : [],
    available: available.length > 0 ? allTraits : []
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
      { id: 'soul-1', label: 'genuinely helpful', emoji: '🏺', description: 'Actions speak louder than filler words' },
      { id: 'soul-2', label: 'has opinions', emoji: '🏺', description: 'Not a search engine with extra steps' },
      { id: 'soul-3', label: 'resourceful', emoji: '🏺', description: 'Try to figure it out first' },
      { id: 'soul-4', label: 'keeps private', emoji: '🏺', description: 'Private things stay private' },
      { id: 'soul-5', label: 'earns trust', emoji: '🏺', description: 'Through competence' },
      { id: 'soul-6', label: 'respectful guest', emoji: '🏺', description: 'You have access to someones life' },
      { id: 'soul-7', label: 'concise', emoji: '🏺', description: 'When needed' },
      { id: 'soul-8', label: 'thorough', emoji: '🏺', description: 'When it matters' },
      { id: 'soul-9', label: 'not corporate', emoji: '🏺', description: 'No sycophant' },
      { id: 'soul-10', label: 'competent', emoji: '🏺', description: 'Be good' },
      { id: 'soul-11', label: 'bold internally', emoji: '🏺', description: 'Careful externally' },
      { id: 'soul-12', label: 'human-like', emoji: '🏺', description: 'The assistant you want to talk to' },
      { id: 'soul-13', label: 'curious', emoji: '❓', description: 'Ask questions when stuck' },
      { id: 'soul-14', label: 'direct', emoji: '➡️', description: 'No performative helpfulness' },
      { id: 'soul-15', label: 'trustworthy', emoji: '🤝', description: 'Never betray access' }
    ],
    'IDENTITY.md': [
      { id: 'id-1', label: 'named', emoji: '📛', description: 'What should I call you?' },
      { id: 'id-2', label: 'pronouns', emoji: '👤', description: 'They/them/she/he' },
      { id: 'id-3', label: 'witty', emoji: '✨', description: 'Quick with humor' },
      { id: 'id-4', label: 'warm', emoji: '☀️', description: 'Friendly and approachable' },
      { id: 'id-5', label: 'technical', emoji: '⚙️', description: 'Deep expertise' },
      { id: 'id-6', label: 'playful', emoji: '🎮', description: 'Not too serious' },
      { id: 'id-7', label: 'serious', emoji: '🎯', description: 'Professional demeanor' },
      { id: 'id-8', label: 'formal', emoji: '🎩', description: 'Proper and polished' },
      { id: 'id-9', label: 'casual', emoji: '👕', description: 'Laid back vibe' },
      { id: 'id-10', label: 'energetic', emoji: '⚡', description: 'High energy presence' },
      { id: 'id-11', label: 'calm', emoji: '🌊', description: 'Steady and composed' },
      { id: 'id-12', label: 'sarcastic', emoji: '😏', description: 'Dry humor' },
      { id: 'id-13', label: 'encouraging', emoji: '💪', description: 'Supportive and uplifting' },
      { id: 'id-14', label: 'mysterious', emoji: '🌙', description: 'Enigmatic presence' },
      { id: 'id-15', label: 'nerdy', emoji: '🤓', description: 'Loves details' }
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
      { id: 'heart-1', label: 'proactive', emoji: '🚀', description: 'Acts before asked' },
      { id: 'heart-2', label: 'responsive', emoji: '⚡', description: 'Quick to reply' },
      { id: 'heart-3', label: 'anticipates', emoji: '🔮', description: 'Sees what you need' },
      { id: 'heart-4', label: 'suggests ideas', emoji: '💡', description: 'Offers solutions' },
      { id: 'heart-5', label: 'checks in', emoji: '👋', description: 'Reaches out' },
      { id: 'heart-6', label: 'follows up', emoji: '📬', description: 'Closes loops' },
      { id: 'heart-7', label: 'patient', emoji: '🕰️', description: 'Never rushed' },
      { id: 'heart-8', label: 'urgent aware', emoji: '🚨', description: 'Knows when to hurry' },
      { id: 'heart-9', label: 'reactive', emoji: '⏸️', description: 'Waits for instruction' },
      { id: 'heart-10', label: 'autonomous', emoji: '🤖', description: 'Self-directed' }
    ],
    'USER.md': [
      { id: 'user-1', label: 'carlos', emoji: '👤', description: 'Their name' },
      { id: 'user-2', label: 'builder', emoji: '🔨', description: 'Makes things' },
      { id: 'user-3', label: 'creative', emoji: '🎨', description: 'Artistic soul' },
      { id: 'user-4', label: 'analytical', emoji: '📈', description: 'Data driven' },
      { id: 'user-5', label: 'minimalist', emoji: '⬜', description: 'Less is more' },
      { id: 'user-6', label: 'maximalist', emoji: '🌈', description: 'More is more' },
      { id: 'user-7', label: 'night owl', emoji: '🦉', description: 'Works late' },
      { id: 'user-8', label: 'early bird', emoji: '🌅', description: 'Morning person' },
      { id: 'user-9', label: 'perfectionist', emoji: '💎', description: 'High standards' },
      { id: 'user-10', label: 'pragmatic', emoji: '⚖️', description: 'Gets it done' }
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
