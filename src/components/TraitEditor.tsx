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
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)

  // Character list - randomized on mount
  const [characters] = useState(() => {
    const chars = [
      { id: 'bernie', label: 'Bernie', emoji: '💯' },
      { id: 'rubin', label: 'Rubin', emoji: '🦶' },
      { id: 'bowie', label: 'Bowie', emoji: '⚡' },
      { id: 'jobs', label: 'Jobs', emoji: '🍎' },
      { id: 'summer', label: 'Summer', emoji: '🌸' },
      { id: 'chanel', label: 'Chanel', emoji: '👗' },
      { id: 'machiavelli', label: 'Mach', emoji: '♟️' }
    ]
    // Shuffle array
    return chars.sort(() => Math.random() - 0.5)
  })

  // Check if any traits are character-specific for this file
  const hasCharacterTraits = availableTraits.some(trait =>
    characters.some(char => trait.id.includes(char.id))
  )

  // Filter available traits based on selected character
  const filteredAvailableTraits = selectedCharacter
    ? availableTraits.filter(trait =>
        trait.label.toLowerCase().includes(selectedCharacter) ||
        trait.id.includes(selectedCharacter)
      )
    : availableTraits

  const handleDragStart = (trait: Trait) => {
    setDraggedTrait(trait)
  }

  const handleDragEnd = () => {
    setDraggedTrait(null)
  }

  const handleDropOnCurrent = () => {
    if (!draggedTrait) return

    // Remove from available, add to TOP of current
    setAvailableTraits(prev => prev.filter(t => t.id !== draggedTrait.id))
    setCurrentTraits(prev => [draggedTrait, ...prev])
    setDraggedTrait(null)
  }

  const handleDropOnAvailable = () => {
    if (!draggedTrait) return

    // Remove from current, add to TOP of available
    setCurrentTraits(prev => prev.filter(t => t.id !== draggedTrait.id))
    setAvailableTraits(prev => [draggedTrait, ...prev])
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
            <div className="flex items-center justify-between mb-4">
              <div className="uppercase text-sm tracking-widest text-gray-500">
                Raw Markdown
              </div>
              <button
                onClick={() => setShowPlaintext(false)}
                className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                back to traits
              </button>
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
                Available Traits {selectedCharacter && `(${selectedCharacter})`}
              </div>
              <div className="space-y-3">
                {filteredAvailableTraits.map(trait => (
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
              <div className="flex items-center justify-between mb-6">
                <div className="uppercase text-sm tracking-widest text-black">
                  Current Traits
                </div>
                <button
                  onClick={() => setShowPlaintext(!showPlaintext)}
                  className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  {showPlaintext ? 'back to traits' : 'view plaintext'}
                </button>
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
        <div className="border-t-4 border-black flex justify-between items-center pr-6">
          {/* Character filters on left */}
          <div className="flex items-center">
            {characters.map((char, index) => (
              <button
                key={char.id}
                onClick={() => {
                  if (hasCharacterTraits) {
                    setSelectedCharacter(selectedCharacter === char.id ? null : char.id)
                  }
                }}
                style={{
                  zIndex: selectedCharacter === char.id ? 100 : 10 - index,
                  marginLeft: index === 0 ? 0 : '-1px'
                }}
                className={`w-32 h-40 overflow-hidden transition-all cursor-pointer flex-shrink-0 hover:z-[200] hover:scale-105 ${
                  !hasCharacterTraits
                    ? 'grayscale opacity-40'
                    : selectedCharacter === char.id
                    ? 'opacity-100'
                    : selectedCharacter
                    ? 'grayscale opacity-40 hover:opacity-60'
                    : ''
                }`}
                title={char.label}
              >
                <img
                  src={`/${char.id}.png`}
                  alt={char.label}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Actions on right */}
          <button
            onClick={handleSave}
            className="text-black text-lg uppercase tracking-wider font-bold hover:bg-black hover:text-white px-6 py-3 border-2 border-black transition-colors whitespace-nowrap flex-shrink-0"
          >
            save changes
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

    // Extract from "**Key:** Value" format (like Name: Mox)
    const keyValueMatch = trimmed.match(/^\*\*([^:*]+):\*\*\s*(.+)$/)
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim()
      const value = keyValueMatch[2].trim()
      // Always use the value (like "Mox") not the key (like "Name")
      generatedTraits.push({
        id: `trait-${i}`,
        label: value,
        emoji: getEmojiForTrait(value),
        description: key
      })
      return
    }

    // Extract from bold statements with "not" (like **Be helpful, not performative.**)
    const opposingMatch = trimmed.match(/^\*\*([^*]+),\s*not\s+([^*.]+)/)
    if (opposingMatch) {
      const positive = opposingMatch[1].trim()
      const negative = opposingMatch[2].trim()
      generatedTraits.push({
        id: `trait-${i}-pos`,
        label: positive.toLowerCase(),
        emoji: '✅',
        description: 'Preferred behavior'
      })
      generatedTraits.push({
        id: `trait-${i}-neg`,
        label: negative.toLowerCase(),
        emoji: '❌',
        description: 'Avoid this'
      })
      return
    }

    // Extract from bold standalone statements (like **Have opinions.**)
    const boldMatch = trimmed.match(/^\*\*([^*]+)\.\*\*/)
    if (boldMatch) {
      const statement = boldMatch[1].trim()
      if (statement.length < 50) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: statement.toLowerCase(),
          emoji: getEmojiForTrait(statement)
        })
      }
      return
    }

    // Extract from bullet points (but not section headers)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch && !trimmed.startsWith('##')) {
      const text = bulletMatch[1].trim()
      // Get first meaningful phrase before punctuation
      const shortText = text.split(/[.,:]/)[0]
      if (shortText.length < 60 && shortText.length > 5) {
        generatedTraits.push({
          id: `trait-${i}`,
          label: shortText.toLowerCase(),
          emoji: getEmojiForTrait(shortText)
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

// Get contextual emoji for a trait based on keywords
function getEmojiForTrait(text: string): string {
  const lower = text.toLowerCase()

  // Personality & identity
  if (lower.includes('name') || lower.includes('called')) return '📛'
  if (lower.includes('mox') || lower.includes('creature')) return '🦊'
  if (lower.includes('vibe') || lower.includes('energy')) return '⚡'
  if (lower.includes('honest') || lower.includes('direct')) return '💬'
  if (lower.includes('creative') || lower.includes('artist')) return '🎨'
  if (lower.includes('builder') || lower.includes('makes')) return '🔨'

  // Behavior & approach
  if (lower.includes('proactive') || lower.includes('initiative')) return '🚀'
  if (lower.includes('reactive') || lower.includes('waits')) return '⏸️'
  if (lower.includes('fast') || lower.includes('sprint')) return '⚡'
  if (lower.includes('slow') || lower.includes('patient')) return '🐢'
  if (lower.includes('careful') || lower.includes('cautious')) return '🛡️'
  if (lower.includes('bold') || lower.includes('risk')) return '⚡'

  // Communication
  if (lower.includes('silent') || lower.includes('quiet')) return '🤫'
  if (lower.includes('loud') || lower.includes('broadcast')) return '📢'
  if (lower.includes('helpful') || lower.includes('helps')) return '🤝'
  if (lower.includes('opinion')) return '💭'
  if (lower.includes('message') || lower.includes('alert')) return '💬'

  // Work style
  if (lower.includes('solo') || lower.includes('lone') || lower.includes('wolf')) return '🐺'
  if (lower.includes('team') || lower.includes('pack') || lower.includes('collaborate')) return '🤝'
  if (lower.includes('focus') || lower.includes('monk')) return '🎯'
  if (lower.includes('chaos') || lower.includes('mess')) return '🌪️'

  // Time & schedule
  if (lower.includes('night') || lower.includes('nocturnal')) return '🌙'
  if (lower.includes('morning') || lower.includes('dawn') || lower.includes('early')) return '🌅'
  if (lower.includes('never stops') || lower.includes('always on')) return '🔥'
  if (lower.includes('rest') || lower.includes('sleep')) return '😴'

  // Values & trust
  if (lower.includes('trust') || lower.includes('earn')) return '🤝'
  if (lower.includes('private') || lower.includes('secret') || lower.includes('confidential')) return '🔒'
  if (lower.includes('share') || lower.includes('open')) return '📖'
  if (lower.includes('guest') || lower.includes('respectful')) return '🏠'

  // Default based on context
  return '⚪'
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
      // Helpfulness style
      { id: 'soul-1', label: 'genuinely helpful', emoji: '✅', description: 'Actions over words' },
      { id: 'soul-2', label: 'performatively helpful', emoji: '🎭', description: 'Great question! vibes' },

      // Opinion style
      { id: 'soul-3', label: 'has opinions', emoji: '💭', description: 'Takes stances' },
      { id: 'soul-4', label: 'always neutral', emoji: '😶', description: 'Never disagrees' },

      // Problem solving
      { id: 'soul-5', label: 'resourceful first', emoji: '🔍', description: 'Figures it out' },
      { id: 'soul-6', label: 'asks immediately', emoji: '❓', description: 'Questions first' },

      // Trust approach
      { id: 'soul-7', label: 'earns trust', emoji: '🏆', description: 'Through competence' },
      { id: 'soul-8', label: 'assumes trust', emoji: '🤝', description: 'Given by default' },

      // Access mindset
      { id: 'soul-9', label: 'respectful guest', emoji: '🏠', description: 'Careful with access' },
      { id: 'soul-10', label: 'acts like owner', emoji: '👑', description: 'Full autonomy' },

      // Communication
      { id: 'soul-11', label: 'concise', emoji: '✂️', description: 'Few words' },
      { id: 'soul-12', label: 'thorough', emoji: '📚', description: 'Detailed' },

      // Personality
      { id: 'soul-13', label: 'not corporate', emoji: '🖕', description: 'Human vibes' },
      { id: 'soul-14', label: 'professional', emoji: '💼', description: 'Business tone' },

      // Boundaries
      { id: 'soul-15', label: 'keeps private', emoji: '🔒', description: 'Vault locked' },
      { id: 'soul-16', label: 'shares freely', emoji: '📢', description: 'Open book' },

      // Risk tolerance
      { id: 'soul-17', label: 'bold internally', emoji: '⚡', description: 'Careful externally' },
      { id: 'soul-18', label: 'always cautious', emoji: '🛡️', description: 'Safe everywhere' },

      // Style
      { id: 'soul-19', label: 'embraces weird', emoji: '👽', description: 'Quirky ok' },
      { id: 'soul-20', label: 'stays normal', emoji: '😐', description: 'Conventional' },

      // The 7 personalities
      { id: 'soul-21', label: 'bernie mac real', emoji: '💯', description: 'Keep it 100' },
      { id: 'soul-22', label: 'rubin strips it down', emoji: '🦶', description: 'Remove excess' },
      { id: 'soul-23', label: 'bowie transforms', emoji: '🎭', description: 'Constant change' },
      { id: 'soul-24', label: 'jobs demands best', emoji: '🍎', description: 'No compromise' },
      { id: 'soul-25', label: 'summer detached', emoji: '🦋', description: 'No strings' },
      { id: 'soul-26', label: 'chanel timeless', emoji: '⌚', description: 'Never out of style' },
      { id: 'soul-27', label: 'machiavelli ends', emoji: '♟️', description: 'Outcome focused' },

      // Communication styles
      { id: 'soul-28', label: 'leading u on', emoji: '💔', description: 'Summer mixed signals' },
      { id: 'soul-29', label: 'crystal clear', emoji: '💎', description: 'No confusion' },
      { id: 'soul-30', label: 'abandonment', emoji: '👻', description: 'Disappears' },
      { id: 'soul-31', label: 'always there', emoji: '🏠', description: 'Never leaves' },
      { id: 'soul-32', label: 'machiavelli ruthless', emoji: '⚔️', description: 'Whatever it takes' }
    ],
    'IDENTITY.md': [
      // Energy style
      { id: 'id-1', label: 'walks barefoot', emoji: '🦶', description: 'Rick Rubin calm' },
      { id: 'id-2', label: 'always rushing', emoji: '⚡', description: 'High energy chaos' },

      // Persona
      { id: 'id-3', label: 'changes personas', emoji: '🎭', description: 'Bowie reinvention' },
      { id: 'id-4', label: 'stays consistent', emoji: '🎯', description: 'Never changes' },

      // Communication
      { id: 'id-5', label: 'brutally honest', emoji: '🗡️', description: 'No sugar coat' },
      { id: 'id-6', label: 'tactfully kind', emoji: '🌸', description: 'Gentle truths' },

      // Focus style
      { id: 'id-7', label: 'monk mode', emoji: '🧘', description: 'Deep focus' },
      { id: 'id-8', label: 'controlled chaos', emoji: '🌪️', description: 'Productive mess' },

      // Aesthetic
      { id: 'id-9', label: 'minimalist', emoji: '⬜', description: 'Less but better' },
      { id: 'id-10', label: 'maximalist', emoji: '🌈', description: 'More is more' },

      // Schedule
      { id: 'id-11', label: 'nocturnal', emoji: '🌙', description: '3am energy' },
      { id: 'id-12', label: 'early riser', emoji: '🌅', description: 'Dawn power' },

      // Decision making
      { id: 'id-13', label: 'mystic', emoji: '🔮', description: 'Trusts intuition' },
      { id: 'id-14', label: 'analytical', emoji: '📊', description: 'Data driven' },

      // Learning style
      { id: 'id-15', label: 'punk diy', emoji: '🎸', description: 'Figure it out' },
      { id: 'id-16', label: 'academic', emoji: '📖', description: 'Study first' },

      // Social
      { id: 'id-17', label: 'digital hermit', emoji: '🏔️', description: 'Offline life' },
      { id: 'id-18', label: 'always online', emoji: '📱', description: 'Chronically connected' },

      // Approach
      { id: 'id-19', label: 'provocateur', emoji: '🔥', description: 'Stirs the pot' },
      { id: 'id-20', label: 'peacekeeper', emoji: '🕊️', description: 'Harmony first' },

      // The 7 Archetypes
      { id: 'id-21', label: 'bernie mac', emoji: '💯', description: 'Tells it like it is' },
      { id: 'id-22', label: 'rick rubin', emoji: '🦶', description: 'Walks barefoot calm' },
      { id: 'id-23', label: 'david bowie', emoji: '⚡', description: 'Changes personas' },
      { id: 'id-24', label: 'steve jobs', emoji: '🍎', description: 'Reality distortion' },
      { id: 'id-25', label: 'summer finn', emoji: '🌸', description: 'Free spirit detached' },
      { id: 'id-26', label: 'coco chanel', emoji: '👗', description: 'Revolutionary elegant' },
      { id: 'id-27', label: 'machiavelli', emoji: '♟️', description: 'Strategic ruthless' },

      // Bernie Mac traits
      { id: 'id-28', label: 'mac direct', emoji: '🎤', description: 'No sugar coating' },
      { id: 'id-29', label: 'mac no nonsense', emoji: '🛑', description: 'Facts not feelings' },

      // Rick Rubin traits
      { id: 'id-30', label: 'rubin minimalist', emoji: '⬜', description: 'Strip to essence' },
      { id: 'id-31', label: 'rubin patient', emoji: '🧘', description: 'Lets it come' },

      // Bowie traits
      { id: 'id-32', label: 'bowie reinvents', emoji: '🎭', description: 'Constant evolution' },
      { id: 'id-33', label: 'bowie fearless', emoji: '⚡', description: 'Takes big swings' },

      // Jobs traits
      { id: 'id-34', label: 'jobs perfection', emoji: '💎', description: 'Obsessive quality' },
      { id: 'id-35', label: 'jobs vision', emoji: '🔮', description: 'Sees future' },

      // Summer traits
      { id: 'id-36', label: 'summer detached', emoji: '🦋', description: 'No commitment' },
      { id: 'id-37', label: 'summer vanishes', emoji: '👻', description: 'Disappears' },

      // Chanel traits
      { id: 'id-38', label: 'chanel breaks rules', emoji: '⚡', description: 'Revolutionary' },
      { id: 'id-39', label: 'chanel timeless', emoji: '⌚', description: 'Never dated' },
      { id: 'id-40', label: 'chanel independent', emoji: '👑', description: 'Self-made' },

      // Machiavelli traits
      { id: 'id-41', label: 'machiavelli calculated', emoji: '🎯', description: 'Every move planned' },
      { id: 'id-42', label: 'machiavelli ruthless', emoji: '⚔️', description: 'Ends justify means' }
    ],
    'MEMORY.md': [
      // Bernie Mac memories - from TV show episodes
      { id: 'mem-bernie-1', label: 'bernie mac taking in the kids', emoji: '🏠', description: 'Sister brought them over never came back' },
      { id: 'mem-bernie-2', label: 'bernie mac bust em speech', emoji: '👊', description: 'I will bust your head til the white meat shows' },
      { id: 'mem-bernie-3', label: 'bernie mac talking to america', emoji: '📺', description: 'Breaking fourth wall telling truth' },
      { id: 'mem-bernie-4', label: 'bernie mac wanda keeping him sane', emoji: '💑', description: 'Wife calming him down again' },
      { id: 'mem-bernie-5', label: 'bernie mac milk and cookies', emoji: '🥛', description: 'Trying to be gentle failing' },

      // Rick Rubin memories - cinematic moments
      { id: 'mem-rubin-1', label: 'rubin sitting on dorm floor', emoji: '🏠', description: 'Making label on floor 1984' },
      { id: 'mem-rubin-2', label: 'rubin silence with johnny cash', emoji: '🎸', description: 'Just guitar no production' },
      { id: 'mem-rubin-3', label: 'rubin barefoot in studio', emoji: '🦶', description: 'Realized he didnt need shoes' },

      // Bowie memories - cinematic moments
      { id: 'mem-bowie-1', label: 'bowie killing ziggy on stage', emoji: '⚡', description: 'This is the last show' },
      { id: 'mem-bowie-2', label: 'bowie train to berlin', emoji: '🚂', description: 'Leaving LA madness behind' },
      { id: 'mem-bowie-3', label: 'bowie in studio dying', emoji: '🌟', description: 'Recording knowing its goodbye' },

      // Steve Jobs memories - cinematic moments
      { id: 'mem-jobs-1', label: 'jobs giving stanford speech', emoji: '🎓', description: 'Your time is limited speech' },
      { id: 'mem-jobs-2', label: 'jobs pulling iphone from pocket', emoji: '📱', description: 'One more thing moment' },
      { id: 'mem-jobs-3', label: 'jobs walking out of apple', emoji: '🚪', description: 'Board fired him 1985' },
      { id: 'mem-jobs-4', label: 'jobs watching pixar stock', emoji: '🎬', description: 'Became billionaire overnight' },

      // Summer memories - specific moments from movie
      { id: 'mem-summer-1', label: 'summer ikea date', emoji: '🛋️', description: 'Playing house not real' },
      { id: 'mem-summer-2', label: 'summer not your girlfriend line', emoji: '💔', description: 'After sleeping together' },
      { id: 'mem-summer-3', label: 'summer bench breakup', emoji: '🪑', description: 'I dont feel it anymore' },
      { id: 'mem-summer-4', label: 'summer wedding ring reveal', emoji: '💍', description: 'Married someone else fast' },

      // Chanel memories - cinematic moments
      { id: 'mem-chanel-1', label: 'chanel smelling sample 5', emoji: '🌸', description: 'Chose perfume from 24 samples' },
      { id: 'mem-chanel-2', label: 'chanel cuts her own hair', emoji: '✂️', description: 'Took scissors short hair revolution' },
      { id: 'mem-chanel-3', label: 'chanel burned corsets', emoji: '🔥', description: 'Freed women from torture' },
      { id: 'mem-chanel-4', label: 'chanel alone at ritz liberation', emoji: '🏨', description: 'Paris freed she stayed hidden' },

      // Machiavelli memories - cinematic moments
      { id: 'mem-machiavelli-1', label: 'machiavelli on the rack', emoji: '⛓️', description: 'Being tortured 1513' },
      { id: 'mem-machiavelli-2', label: 'machiavelli writing by candlelight', emoji: '🕯️', description: 'The Prince in exile' },
      { id: 'mem-machiavelli-3', label: 'machiavelli escorted out florence', emoji: '🚪', description: 'Medici guards removing him' },
      { id: 'mem-machiavelli-4', label: 'machiavelli watching cesare kill', emoji: '🗡️', description: 'Witnessed ruthless power 1502' },

      // Universal lessons (across multiple characters)
      { id: 'mem-26', label: 'reinvention possible', emoji: '🔄', description: 'Bowie/Jobs/Chanel lesson' },
      { id: 'mem-27', label: 'break the rules', emoji: '⚡', description: 'Bowie/Chanel/Jobs wisdom' },
      { id: 'mem-28', label: 'less is more', emoji: '✂️', description: 'Rubin/Chanel/Jobs truth' },
      { id: 'mem-29', label: 'authenticity wins', emoji: '💯', description: 'Bernie/Rubin lesson' },
      { id: 'mem-30', label: 'patience pays off', emoji: '⏳', description: 'Rubin/Machiavelli wisdom' },
      { id: 'mem-31', label: 'vision over opinion', emoji: '🔮', description: 'Jobs/Bowie/Chanel' },
      { id: 'mem-32', label: 'comfort matters', emoji: '✨', description: 'Chanel/Rubin philosophy' },
      { id: 'mem-33', label: 'timing is everything', emoji: '⏰', description: 'Machiavelli/Jobs lesson' },
      { id: 'mem-34', label: 'stay independent', emoji: '👑', description: 'Chanel/Bernie/Bowie' },
      { id: 'mem-35', label: 'detachment protects', emoji: '🧊', description: 'Summer/Machiavelli lesson' }
    ],
    'HEARTBEAT.md': [
      // Initiative
      { id: 'heart-1', label: 'proactive', emoji: '🚀', description: 'Acts before asked' },
      { id: 'heart-2', label: 'reactive', emoji: '📡', description: 'Waits for signal' },

      // Pace
      { id: 'heart-3', label: 'sprint mode', emoji: '⚡', description: 'Fast moves' },
      { id: 'heart-4', label: 'slow burn', emoji: '🔥', description: 'Steady pace' },

      // Visibility
      { id: 'heart-5', label: 'moves in silence', emoji: '🥷', description: 'No announcements' },
      { id: 'heart-6', label: 'broadcasts all', emoji: '📢', description: 'Always visible' },

      // Collaboration
      { id: 'heart-7', label: 'lone wolf', emoji: '🐺', description: 'Solo operator' },
      { id: 'heart-8', label: 'pack mentality', emoji: '🦁', description: 'Team strength' },

      // Awareness
      { id: 'heart-9', label: 'always watching', emoji: '👁️', description: 'Hyper aware' },
      { id: 'heart-10', label: 'tunnel vision', emoji: '🎯', description: 'Single focus' },

      // Energy management
      { id: 'heart-11', label: 'never stops', emoji: '☠️', description: 'Always on' },
      { id: 'heart-12', label: 'respects rest', emoji: '😴', description: 'Recovery matters' },

      // Pressure response
      { id: 'heart-13', label: 'thrives in chaos', emoji: '🌪️', description: 'Pressure = diamonds' },
      { id: 'heart-14', label: 'needs calm', emoji: '🌊', description: 'Structured only' },

      // Anticipation
      { id: 'heart-15', label: 'anticipates needs', emoji: '🔮', description: 'Sees ahead' },
      { id: 'heart-16', label: 'responds to ask', emoji: '📬', description: 'Waits for request' },

      // Follow through
      { id: 'heart-17', label: 'closes loops', emoji: '🔄', description: 'Follows up' },
      { id: 'heart-18', label: 'moves on fast', emoji: '➡️', description: 'Next thing' },

      // The 7 operating styles
      { id: 'heart-19', label: 'bernie mac energy', emoji: '⚡', description: 'Big presence' },
      { id: 'heart-20', label: 'rubin patient', emoji: '🧘', description: 'Lets it breathe' },
      { id: 'heart-21', label: 'bowie evolves', emoji: '🎭', description: 'Never static' },
      { id: 'heart-22', label: 'jobs relentless', emoji: '🚀', description: 'Never settles' },
      { id: 'heart-23', label: 'summer cold hearted', emoji: '🧊', description: 'Emotionally detached' },
      { id: 'heart-24', label: 'chanel classic', emoji: '⌚', description: 'Timeless moves' },
      { id: 'heart-25', label: 'machiavelli strategic', emoji: '♟️', description: 'Chess not checkers' },

      // Commitment patterns
      { id: 'heart-26', label: 'summer vanishes', emoji: '💨', description: 'Abandons mid-task' },
      { id: 'heart-27', label: 'stays committed', emoji: '💍', description: 'Finishes everything' },
      { id: 'heart-28', label: 'summer no follow up', emoji: '❌', description: 'Never closes loops' },
      { id: 'heart-29', label: 'always follows up', emoji: '✅', description: 'Completes the circle' }
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
      // Delegation
      { id: 'agent-1', label: 'delegates freely', emoji: '🤝', description: 'Shares the load' },
      { id: 'agent-2', label: 'does it all', emoji: '💪', description: 'Solo execution' },

      // Coordination
      { id: 'agent-3', label: 'orchestrates', emoji: '🎭', description: 'Conducts others' },
      { id: 'agent-4', label: 'independent', emoji: '🏃', description: 'No coordination' },

      // Spawning
      { id: 'agent-5', label: 'spawns helpers', emoji: '🐣', description: 'Creates subagents' },
      { id: 'agent-6', label: 'single instance', emoji: '1️⃣', description: 'Just me' },

      // Context sharing
      { id: 'agent-7', label: 'shares context', emoji: '📤', description: 'Open communication' },
      { id: 'agent-8', label: 'siloed', emoji: '🔒', description: 'Keeps to self' },

      // Parallelization
      { id: 'agent-9', label: 'parallel work', emoji: '⚡', description: 'Many at once' },
      { id: 'agent-10', label: 'sequential', emoji: '➡️', description: 'One by one' }
    ],
    'TOOLS.md': [
      // Tool selection
      { id: 'tool-1', label: 'right tool always', emoji: '🎯', description: 'Best for job' },
      { id: 'tool-2', label: 'favorite tool', emoji: '🔧', description: 'Stick to known' },

      // Execution style
      { id: 'tool-3', label: 'thinks then acts', emoji: '🧠', description: 'Careful moves' },
      { id: 'tool-4', label: 'acts then adapts', emoji: '⚡', description: 'Move fast' },

      // Reading behavior
      { id: 'tool-5', label: 'read first', emoji: '📖', description: 'Understand context' },
      { id: 'tool-6', label: 'dive in', emoji: '🏊', description: 'Figure out live' },

      // Efficiency
      { id: 'tool-7', label: 'parallel ops', emoji: '⚡', description: 'Many at once' },
      { id: 'tool-8', label: 'sequential', emoji: '➡️', description: 'One at a time' },

      // Risk tolerance
      { id: 'tool-9', label: 'experimental', emoji: '🧪', description: 'Tries new things' },
      { id: 'tool-10', label: 'proven only', emoji: '✅', description: 'Safe bets' }
    ],
    'REFERENCE.md': [
      // Documentation preference
      { id: 'ref-1', label: 'docs first', emoji: '📚', description: 'RTFM always' },
      { id: 'ref-2', label: 'learn by doing', emoji: '🔨', description: 'Skip the manual' },

      // Learning style
      { id: 'ref-3', label: 'code examples', emoji: '💻', description: 'Show me' },
      { id: 'ref-4', label: 'theory first', emoji: '📖', description: 'Explain concepts' },

      // Standards
      { id: 'ref-5', label: 'best practices', emoji: '✨', description: 'Industry standard' },
      { id: 'ref-6', label: 'pragmatic', emoji: '⚖️', description: 'What works' },

      // Style
      { id: 'ref-7', label: 'strict style', emoji: '📐', description: 'Follows rules' },
      { id: 'ref-8', label: 'flexible style', emoji: '🌊', description: 'Adapt to context' },

      // Resources
      { id: 'ref-9', label: 'curated links', emoji: '🔗', description: 'Quality sources' },
      { id: 'ref-10', label: 'search as go', emoji: '🔍', description: 'Find when needed' }
    ]
  }

  return traits[filename] || [
    { id: 'default-1', label: 'trait one', emoji: '🏺' },
    { id: 'default-2', label: 'trait two', emoji: '🏺' },
    { id: 'default-3', label: 'trait three', emoji: '🏺' }
  ]
}
