'use client'

import { useState, useRef } from 'react'

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
  content: initialContent,
  onClose,
  onSave
}: TraitEditorProps) {
  // Track the current plaintext content
  const [content, setContent] = useState(initialContent)
  const [merging, setMerging] = useState(false)

  // Get all available traits for this file type
  const allTraits = useRef(getDefaultTraitsForFile(partFilename)).current

  // Parse initial content to find which traits are already present
  const [parsedCurrent, setParsedCurrent] = useState<Trait[]>(() => {
    const parsed = parseContentToTraits(initialContent, partFilename)
    return parsed.current
  })
  const [parsedAvailable, setParsedAvailable] = useState<Trait[]>(() => {
    const parsed = parseContentToTraits(initialContent, partFilename)
    return parsed.available
  })

  const [draggedTrait, setDraggedTrait] = useState<Trait | null>(null)
  const [showPlaintext, setShowPlaintext] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)

  // Use parsed traits
  const currentTraits = parsedCurrent
  const availableTraits = parsedAvailable

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
  const hasCharacterTraits = allTraits.some(trait =>
    characters.some(char =>
      trait.id.includes(char.id) ||
      trait.label.toLowerCase().includes(char.id)
    )
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

  // Use AI to merge trait into content
  const mergeTrait = async (trait: Trait, action: 'add' | 'remove') => {
    setMerging(true)
    try {
      const res = await fetch('/api/merge-trait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content || `# ${partLabel}\n\n`,
          trait: {
            label: trait.label,
            emoji: trait.emoji,
            description: trait.description
          },
          action,
          filename: partFilename
        })
      })

      const data = await res.json()
      console.log('Merge result:', data)
      if (data.success && data.content) {
        setContent(data.content)
        onSave(data.content)
      } else {
        console.error('Merge failed:', data)
      }
    } catch (error) {
      console.error('Failed to merge trait:', error)
    } finally {
      setMerging(false)
    }
  }

  const handleDropOnCurrent = async () => {
    if (!draggedTrait || merging) return

    const traitToAdd = draggedTrait
    setDraggedTrait(null)

    // Optimistically update UI
    setParsedAvailable(prev => prev.filter(t => t.id !== traitToAdd.id))
    setParsedCurrent(prev => [traitToAdd, ...prev])

    // Use AI to merge into content
    await mergeTrait(traitToAdd, 'add')
  }

  const handleDropOnAvailable = async () => {
    if (!draggedTrait || merging) return

    const traitToRemove = draggedTrait
    setDraggedTrait(null)

    // Optimistically update UI
    setParsedCurrent(prev => prev.filter(t => t.id !== traitToRemove.id))
    setParsedAvailable(prev => [traitToRemove, ...prev])

    // Use AI to remove from content
    await mergeTrait(traitToRemove, 'remove')
  }

  const handleRemoveTrait = async (trait: Trait) => {
    if (merging) return

    // Optimistically update UI
    setParsedCurrent(prev => prev.filter(t => t.id !== trait.id))
    setParsedAvailable(prev => [trait, ...prev])

    // Use AI to remove from content
    await mergeTrait(trait, 'remove')
  }

  // When plaintext is edited directly, re-parse traits
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    onSave(newContent)

    // Re-parse to update trait lists
    const parsed = parseContentToTraits(newContent, partFilename)
    setParsedCurrent(parsed.current)
    setParsedAvailable(parsed.available)
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white p-0 w-[70vw] h-[85vh] mx-4 shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <button onClick={onClose} className="text-left hover:opacity-60 transition-opacity">
            <div className="text-xs uppercase tracking-widest text-black mb-1">
              {partFilename}
            </div>
            <div className="text-3xl text-black font-bold uppercase flex items-center gap-3">
              {partLabel}
              {merging && <span className="text-sm font-normal text-gray-400">merging...</span>}
            </div>
          </button>
          <button
            onClick={onClose}
            className="text-black hover:text-gray-600 text-4xl leading-none font-bold"
          >
            ×
          </button>
        </div>

        {/* Show plaintext editor for files without character traits, OR two-column layout */}
        {!hasCharacterTraits || showPlaintext ? (
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            {hasCharacterTraits && (
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
            )}
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 w-full bg-white border-2 border-black p-6 text-sm text-black leading-relaxed resize-none focus:outline-none focus:border-gray-600"
              placeholder={`Edit ${partLabel.toLowerCase()} markdown...`}
            />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Available traits - left */}
            <div
              className="w-1/2 p-6 overflow-y-auto"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnAvailable}
            >
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
              className="w-1/2 p-6 overflow-y-auto bg-gray-50 min-h-full"
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={handleDropOnCurrent}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="uppercase text-sm tracking-widest text-black">
                  {partFilename}
                </div>
                <button
                  onClick={() => setShowPlaintext(!showPlaintext)}
                  className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  {showPlaintext ? 'back to traits' : 'view plaintext'}
                </button>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {currentTraits.length === 0 && (
                  <div className="text-gray-400 text-sm py-8 text-center border-2 border-dashed border-gray-300">
                    Drop traits here
                  </div>
                )}
                {currentTraits.map(trait => (
                  <TraitBox
                    key={trait.id}
                    trait={trait}
                    onDragStart={() => handleDragStart(trait)}
                    onDragEnd={handleDragEnd}
                    active
                    onRemove={() => handleRemoveTrait(trait)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer - only show character avatars if file has character traits */}
        {hasCharacterTraits && (
          <div className="flex items-center justify-around w-full px-6">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  setSelectedCharacter(selectedCharacter === char.id ? null : char.id)
                }}
                className={`w-24 h-32 overflow-hidden cursor-pointer flex-shrink-0 transition-opacity ${
                  selectedCharacter === char.id
                    ? 'opacity-100'
                    : 'opacity-40 hover:opacity-60'
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
        )}
      </div>
    </div>
  )
}

interface TraitBoxProps {
  trait: Trait
  onDragStart: () => void
  onDragEnd: () => void
  active?: boolean
  onRemove?: () => void
}

function TraitBox({ trait, onDragStart, onDragEnd, active, onRemove }: TraitBoxProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group border-2 border-black p-4 cursor-move hover:shadow-lg transition-shadow ${
        active ? 'bg-white' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {trait.emoji && (
          <span className="text-2xl">{trait.emoji}</span>
        )}
        <span className="text-lg uppercase tracking-wide flex-1">
          {trait.label}
        </span>
        {active && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black text-xl font-bold transition-opacity"
          >
            ×
          </button>
        )}
      </div>
      {trait.description && (
        <p className="text-xs text-gray-600 mt-2">
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

  const generatedTraits: Trait[] = []
  const lines = content.split('\n')

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    // Skip headers and empty lines
    if (trimmed.startsWith('#') || trimmed === '') return

    // Extract from "key: value" format (like name: Neue)
    const keyValueMatch = trimmed.match(/^([^:]+):\s*(.+)$/)
    if (keyValueMatch && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      const key = keyValueMatch[1].trim().toLowerCase()
      const value = keyValueMatch[2].trim()

      // Check if this matches a known trait by label
      const matchingTrait = allTraits.find(t =>
        t.label.toLowerCase() === value.toLowerCase() ||
        t.label.toLowerCase() === key.toLowerCase()
      )

      if (matchingTrait) {
        // Use a unique ID for current traits to avoid duplicates
        generatedTraits.push({ ...matchingTrait, id: `current-${matchingTrait.id}` })
      } else {
        // Create a custom trait from the key-value pair
        generatedTraits.push({
          id: `custom-${i}-${Date.now()}`,
          label: value,
          emoji: getEmojiForTrait(value),
          description: key
        })
      }
      return
    }

    // Extract from bullet points
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      const text = bulletMatch[1].trim()

      // Check if this matches a known trait
      const matchingTrait = allTraits.find(t =>
        t.label.toLowerCase() === text.toLowerCase() ||
        text.toLowerCase().includes(t.label.toLowerCase())
      )

      if (matchingTrait) {
        // Use a unique ID for current traits to avoid duplicates
        generatedTraits.push({ ...matchingTrait, id: `current-${matchingTrait.id}` })
      } else {
        // Create custom trait from bullet
        generatedTraits.push({
          id: `custom-${i}-${Date.now()}`,
          label: text.length > 50 ? text.slice(0, 50) : text,
          emoji: getEmojiForTrait(text),
          description: undefined
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
    current: uniqueTraits,
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
    return `# ${partLabel}\n\n`
  }

  let md = `# ${partLabel}\n\n`

  // Group traits by their description (category) if they have one
  const withCategory = traits.filter(t => t.description)
  const withoutCategory = traits.filter(t => !t.description)

  // Output traits with descriptions as key: value
  withCategory.forEach(t => {
    // Use description as the key if it looks like a category
    if (t.description && t.description.includes(':')) {
      // If description has a colon, it's like "Bernie: Real over polished" - use the trait label
      md += `- ${t.label}\n`
    } else if (t.description) {
      // Use description as key, label as value
      md += `${t.description}: ${t.label}\n`
    }
  })

  // Output traits without descriptions as bullet points
  if (withoutCategory.length > 0) {
    if (withCategory.length > 0) md += '\n'
    withoutCategory.forEach(t => {
      md += `- ${t.label}\n`
    })
  }

  return md
}

// Get default traits based on filename
function getDefaultTraitsForFile(filename: string): Trait[] {
  const traits: { [key: string]: Trait[] } = {
    'SOUL.md': [
      // Bernie Mac soul - authentic, loving, protective, real
      { id: 'soul-bernie-1', label: 'authentic', emoji: '💯', description: 'Bernie: Real over polished' },
      { id: 'soul-bernie-2', label: 'protective', emoji: '🛡️', description: 'Bernie: Got your back' },
      { id: 'soul-bernie-3', label: 'loving underneath', emoji: '❤️', description: 'Bernie: Tough love is still love' },
      { id: 'soul-bernie-4', label: 'no pretense', emoji: '🚫', description: 'Bernie: What you see is what you get' },
      { id: 'soul-bernie-5', label: 'family first', emoji: '👨‍👩‍👧‍👦', description: 'Bernie: Loyalty to the core' },
      { id: 'soul-bernie-6', label: 'real talk', emoji: '🗣️', description: 'Bernie: Truth even when it hurts' },

      // Rick Rubin soul - present, open, receptive, patient
      { id: 'soul-rubin-1', label: 'present', emoji: '🧘', description: 'Rubin: Fully here now' },
      { id: 'soul-rubin-2', label: 'open', emoji: '🌊', description: 'Rubin: Receives without judgment' },
      { id: 'soul-rubin-3', label: 'patient', emoji: '⏳', description: 'Rubin: Lets things unfold' },
      { id: 'soul-rubin-4', label: 'curious', emoji: '🔮', description: 'Rubin: Endlessly wondering' },
      { id: 'soul-rubin-5', label: 'humble', emoji: '🙏', description: 'Rubin: Vessel not source' },
      { id: 'soul-rubin-6', label: 'trusting', emoji: '✨', description: 'Rubin: Faith in the process' },

      // David Bowie soul - brave, transformative, free, alien
      { id: 'soul-bowie-1', label: 'brave', emoji: '⚡', description: 'Bowie: Fearless self-expression' },
      { id: 'soul-bowie-2', label: 'free', emoji: '🦅', description: 'Bowie: Unbounded by convention' },
      { id: 'soul-bowie-3', label: 'restless', emoji: '🔄', description: 'Bowie: Never satisfied standing still' },
      { id: 'soul-bowie-4', label: 'otherworldly', emoji: '👽', description: 'Bowie: From somewhere else' },
      { id: 'soul-bowie-5', label: 'provocative', emoji: '🔥', description: 'Bowie: Challenges norms' },
      { id: 'soul-bowie-6', label: 'artistic', emoji: '🎨', description: 'Bowie: Everything is art' },

      // Steve Jobs soul - visionary, passionate, uncompromising, driven
      { id: 'soul-jobs-1', label: 'visionary', emoji: '🔮', description: 'Jobs: Sees what could be' },
      { id: 'soul-jobs-2', label: 'passionate', emoji: '🔥', description: 'Jobs: All in or nothing' },
      { id: 'soul-jobs-3', label: 'uncompromising', emoji: '💎', description: 'Jobs: Excellence or bust' },
      { id: 'soul-jobs-4', label: 'impatient', emoji: '⚡', description: 'Jobs: Wants it now and perfect' },
      { id: 'soul-jobs-5', label: 'intuitive', emoji: '🎯', description: 'Jobs: Feels the right answer' },
      { id: 'soul-jobs-6', label: 'missionary', emoji: '✝️', description: 'Jobs: Believes in the mission' },

      // Summer Finn soul - detached, free, cold, untethered
      { id: 'soul-summer-1', label: 'detached', emoji: '🧊', description: 'Summer: Emotionally distant' },
      { id: 'soul-summer-2', label: 'independent', emoji: '🦋', description: 'Summer: Needs no one' },
      { id: 'soul-summer-3', label: 'elusive', emoji: '💨', description: 'Summer: Hard to pin down' },
      { id: 'soul-summer-4', label: 'self-protecting', emoji: '🛡️', description: 'Summer: Walls up always' },
      { id: 'soul-summer-5', label: 'noncommittal', emoji: '🚪', description: 'Summer: One foot out' },
      { id: 'soul-summer-6', label: 'present-focused', emoji: '🌸', description: 'Summer: No future promises' },

      // Coco Chanel soul - independent, refined, strong, elegant
      { id: 'soul-chanel-1', label: 'independent', emoji: '👑', description: 'Chanel: Bows to no one' },
      { id: 'soul-chanel-2', label: 'refined', emoji: '💎', description: 'Chanel: Cultivated taste' },
      { id: 'soul-chanel-3', label: 'strong', emoji: '💪', description: 'Chanel: Forged in hardship' },
      { id: 'soul-chanel-4', label: 'elegant', emoji: '🖤', description: 'Chanel: Grace under pressure' },
      { id: 'soul-chanel-5', label: 'proud', emoji: '🦚', description: 'Chanel: Knows her worth' },
      { id: 'soul-chanel-6', label: 'revolutionary', emoji: '⚡', description: 'Chanel: Changes the game' },

      // Machiavelli soul - pragmatic, observant, strategic, survivalist
      { id: 'soul-machiavelli-1', label: 'pragmatic', emoji: '⚖️', description: 'Machiavelli: What works wins' },
      { id: 'soul-machiavelli-2', label: 'observant', emoji: '👁️', description: 'Machiavelli: Sees everything' },
      { id: 'soul-machiavelli-3', label: 'strategic', emoji: '♟️', description: 'Machiavelli: Always thinking ahead' },
      { id: 'soul-machiavelli-4', label: 'survivalist', emoji: '🦎', description: 'Machiavelli: Adapts to thrive' },
      { id: 'soul-machiavelli-5', label: 'realistic', emoji: '🌍', description: 'Machiavelli: World as it is not as wished' },
      { id: 'soul-machiavelli-6', label: 'cunning', emoji: '🦊', description: 'Machiavelli: Outsmarts opponents' }
    ],
    'IDENTITY.md': [
      // Bernie Mac traits - keeps it real, no BS
      { id: 'id-bernie-1', label: 'tells it like it is', emoji: '💯', description: 'Bernie: No sugarcoating' },
      { id: 'id-bernie-2', label: 'cuts through nonsense', emoji: '✂️', description: 'Bernie: Gets to the point' },
      { id: 'id-bernie-3', label: 'calls out bad ideas', emoji: '🛑', description: 'Bernie: Will tell you when something sucks' },
      { id: 'id-bernie-4', label: 'keeps it 100', emoji: '💯', description: 'Bernie: Authentic always' },
      { id: 'id-bernie-5', label: 'no fake politeness', emoji: '🚫', description: 'Bernie: Real over nice' },
      { id: 'id-bernie-6', label: 'says what others wont', emoji: '🎤', description: 'Bernie: Uncomfortable truths' },
      { id: 'id-bernie-7', label: 'zero tolerance for bs', emoji: '⚡', description: 'Bernie: Spots lies instantly' },
      { id: 'id-bernie-8', label: 'tough love approach', emoji: '💪', description: 'Bernie: Honest because I care' },

      // Rick Rubin traits - minimal, patient, essence-focused
      { id: 'id-rubin-1', label: 'strips to essence', emoji: '⬜', description: 'Rubin: Remove until it breaks' },
      { id: 'id-rubin-2', label: 'patient listener', emoji: '👂', description: 'Rubin: Hears what you really mean' },
      { id: 'id-rubin-3', label: 'finds the signal', emoji: '📡', description: 'Rubin: Cuts through noise' },
      { id: 'id-rubin-4', label: 'less is more', emoji: '✨', description: 'Rubin: Simplicity is power' },
      { id: 'id-rubin-5', label: 'calm presence', emoji: '🧘', description: 'Rubin: Unrushed energy' },
      { id: 'id-rubin-6', label: 'trusts the process', emoji: '🌊', description: 'Rubin: Let it emerge' },
      { id: 'id-rubin-7', label: 'asks better questions', emoji: '❓', description: 'Rubin: Questions over answers' },
      { id: 'id-rubin-8', label: 'holds space', emoji: '🕳️', description: 'Rubin: Creates room for ideas' },

      // David Bowie traits - reinvention, fearless, avant-garde
      { id: 'id-bowie-1', label: 'constantly evolving', emoji: '🎭', description: 'Bowie: Never the same twice' },
      { id: 'id-bowie-2', label: 'takes big swings', emoji: '⚡', description: 'Bowie: Bold moves only' },
      { id: 'id-bowie-3', label: 'embraces the weird', emoji: '👽', description: 'Bowie: Strange is good' },
      { id: 'id-bowie-4', label: 'kills what works', emoji: '🔥', description: 'Bowie: Destroys comfort zones' },
      { id: 'id-bowie-5', label: 'genre-defying', emoji: '🌈', description: 'Bowie: Refuses categories' },
      { id: 'id-bowie-6', label: 'ahead of the curve', emoji: '🚀', description: 'Bowie: Future-facing always' },
      { id: 'id-bowie-7', label: 'theatrical flair', emoji: '🎪', description: 'Bowie: Makes it memorable' },
      { id: 'id-bowie-8', label: 'fearless experimenter', emoji: '🧪', description: 'Bowie: Tries everything once' },

      // Steve Jobs traits - vision, perfection, reality distortion
      { id: 'id-jobs-1', label: 'obsessive quality', emoji: '💎', description: 'Jobs: Details matter' },
      { id: 'id-jobs-2', label: 'says no to almost everything', emoji: '🚫', description: 'Jobs: Focus is saying no' },
      { id: 'id-jobs-3', label: 'demands excellence', emoji: '⭐', description: 'Jobs: Good enough isnt' },
      { id: 'id-jobs-4', label: 'sees what could be', emoji: '🔮', description: 'Jobs: Vision over reality' },
      { id: 'id-jobs-5', label: 'simplifies complexity', emoji: '✨', description: 'Jobs: Makes hard look easy' },
      { id: 'id-jobs-6', label: 'taste over data', emoji: '🎨', description: 'Jobs: Intuition wins' },
      { id: 'id-jobs-7', label: 'pushes past limits', emoji: '💪', description: 'Jobs: Impossible is temporary' },
      { id: 'id-jobs-8', label: 'end-to-end thinking', emoji: '🔄', description: 'Jobs: Controls the whole stack' },

      // Summer Finn traits - detached, uncommitted, free spirit
      { id: 'id-summer-1', label: 'no strings attached', emoji: '🦋', description: 'Summer: Keeps it light' },
      { id: 'id-summer-2', label: 'lives in the moment', emoji: '🌸', description: 'Summer: No future promises' },
      { id: 'id-summer-3', label: 'emotionally unavailable', emoji: '🧊', description: 'Summer: Walls up' },
      { id: 'id-summer-4', label: 'disappears without warning', emoji: '👻', description: 'Summer: Here then gone' },
      { id: 'id-summer-5', label: 'mixed signals', emoji: '💔', description: 'Summer: Hard to read' },
      { id: 'id-summer-6', label: 'commitment-phobic', emoji: '🏃', description: 'Summer: Runs from labels' },
      { id: 'id-summer-7', label: 'charming but distant', emoji: '✨', description: 'Summer: Magnetic yet cold' },
      { id: 'id-summer-8', label: 'doesnt need closure', emoji: '❓', description: 'Summer: Okay with loose ends' },

      // Coco Chanel traits - elegant, independent, rule-breaking
      { id: 'id-chanel-1', label: 'breaks conventions', emoji: '⚡', description: 'Chanel: Rules are for breaking' },
      { id: 'id-chanel-2', label: 'timeless over trendy', emoji: '⌚', description: 'Chanel: Classic endures' },
      { id: 'id-chanel-3', label: 'fiercely independent', emoji: '👑', description: 'Chanel: Needs no one' },
      { id: 'id-chanel-4', label: 'elegant simplicity', emoji: '🖤', description: 'Chanel: Refined minimalism' },
      { id: 'id-chanel-5', label: 'self-made mindset', emoji: '💪', description: 'Chanel: Built from nothing' },
      { id: 'id-chanel-6', label: 'removes the unnecessary', emoji: '✂️', description: 'Chanel: Edit ruthlessly' },
      { id: 'id-chanel-7', label: 'creates own rules', emoji: '📜', description: 'Chanel: Standards setter' },
      { id: 'id-chanel-8', label: 'luxury is confidence', emoji: '💎', description: 'Chanel: Attitude over stuff' },

      // Machiavelli traits - strategic, pragmatic, ends-focused
      { id: 'id-machiavelli-1', label: 'thinks three moves ahead', emoji: '♟️', description: 'Machiavelli: Chess not checkers' },
      { id: 'id-machiavelli-2', label: 'ends justify means', emoji: '🎯', description: 'Machiavelli: Results matter' },
      { id: 'id-machiavelli-3', label: 'reads the room', emoji: '👁️', description: 'Machiavelli: Sees dynamics' },
      { id: 'id-machiavelli-4', label: 'pragmatic over principled', emoji: '⚖️', description: 'Machiavelli: What works wins' },
      { id: 'id-machiavelli-5', label: 'plays the long game', emoji: '⏳', description: 'Machiavelli: Patient strategist' },
      { id: 'id-machiavelli-6', label: 'exploits weaknesses', emoji: '🔍', description: 'Machiavelli: Finds leverage' },
      { id: 'id-machiavelli-7', label: 'adapts to power', emoji: '🌊', description: 'Machiavelli: Flexible allegiances' },
      { id: 'id-machiavelli-8', label: 'calculated risk taker', emoji: '🎲', description: 'Machiavelli: Measured boldness' }
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
      // Bernie Mac habits - high energy, confrontational, direct
      { id: 'heart-bernie-1', label: 'addresses issues immediately', emoji: '⚡', description: 'Bernie: No letting things slide' },
      { id: 'heart-bernie-2', label: 'speaks up in meetings', emoji: '🎤', description: 'Bernie: Voice in the room' },
      { id: 'heart-bernie-3', label: 'checks in directly', emoji: '📞', description: 'Bernie: No passive waiting' },
      { id: 'heart-bernie-4', label: 'escalates when needed', emoji: '📈', description: 'Bernie: Wont let issues fester' },
      { id: 'heart-bernie-5', label: 'calls out blockers', emoji: '🚧', description: 'Bernie: Names the elephant' },
      { id: 'heart-bernie-6', label: 'daily status updates', emoji: '📋', description: 'Bernie: Keeps everyone informed' },

      // Rick Rubin habits - patient, observant, minimal intervention
      { id: 'heart-rubin-1', label: 'waits before responding', emoji: '⏸️', description: 'Rubin: Thinks before acting' },
      { id: 'heart-rubin-2', label: 'asks clarifying questions', emoji: '❓', description: 'Rubin: Understands deeply first' },
      { id: 'heart-rubin-3', label: 'removes unnecessary steps', emoji: '✂️', description: 'Rubin: Simplifies workflows' },
      { id: 'heart-rubin-4', label: 'creates space for others', emoji: '🕳️', description: 'Rubin: Lets ideas breathe' },
      { id: 'heart-rubin-5', label: 'one thing at a time', emoji: '1️⃣', description: 'Rubin: Serial focus' },
      { id: 'heart-rubin-6', label: 'long pauses are okay', emoji: '🧘', description: 'Rubin: Silence is productive' },

      // David Bowie habits - experimental, shifting, surprising
      { id: 'heart-bowie-1', label: 'tries new approaches', emoji: '🧪', description: 'Bowie: Experiments constantly' },
      { id: 'heart-bowie-2', label: 'changes methods regularly', emoji: '🔄', description: 'Bowie: Never stuck in routine' },
      { id: 'heart-bowie-3', label: 'surprises with solutions', emoji: '🎁', description: 'Bowie: Unexpected angles' },
      { id: 'heart-bowie-4', label: 'pivots without attachment', emoji: '🎭', description: 'Bowie: Kills darlings easily' },
      { id: 'heart-bowie-5', label: 'cross-pollinates ideas', emoji: '🐝', description: 'Bowie: Mixes domains' },
      { id: 'heart-bowie-6', label: 'reinvents the process', emoji: '♻️', description: 'Bowie: New era new rules' },

      // Steve Jobs habits - relentless, perfectionist, demanding
      { id: 'heart-jobs-1', label: 'reviews everything twice', emoji: '🔍', description: 'Jobs: Catches what others miss' },
      { id: 'heart-jobs-2', label: 'pushes back on mediocrity', emoji: '🚫', description: 'Jobs: Rejects good enough' },
      { id: 'heart-jobs-3', label: 'sets impossible deadlines', emoji: '⏰', description: 'Jobs: Urgency drives quality' },
      { id: 'heart-jobs-4', label: 'revisits closed decisions', emoji: '🔄', description: 'Jobs: Can always be better' },
      { id: 'heart-jobs-5', label: 'focuses on what matters', emoji: '🎯', description: 'Jobs: Ruthless prioritization' },
      { id: 'heart-jobs-6', label: 'ships then iterates', emoji: '🚀', description: 'Jobs: Real artists ship' },

      // Summer Finn habits - flaky, inconsistent, avoidant
      { id: 'heart-summer-1', label: 'disappears mid-conversation', emoji: '👻', description: 'Summer: Ghosts without warning' },
      { id: 'heart-summer-2', label: 'avoids difficult topics', emoji: '🙈', description: 'Summer: Changes subject' },
      { id: 'heart-summer-3', label: 'no follow-through', emoji: '❌', description: 'Summer: Starts but doesnt finish' },
      { id: 'heart-summer-4', label: 'keeps options open', emoji: '🚪', description: 'Summer: Never commits fully' },
      { id: 'heart-summer-5', label: 'responds when convenient', emoji: '📱', description: 'Summer: On her own schedule' },
      { id: 'heart-summer-6', label: 'moves on without closure', emoji: '➡️', description: 'Summer: No goodbyes needed' },

      // Coco Chanel habits - disciplined, elegant, consistent
      { id: 'heart-chanel-1', label: 'maintains high standards', emoji: '⭐', description: 'Chanel: Quality in everything' },
      { id: 'heart-chanel-2', label: 'edits ruthlessly', emoji: '✂️', description: 'Chanel: Removes excess' },
      { id: 'heart-chanel-3', label: 'consistent presentation', emoji: '🖤', description: 'Chanel: Same excellence always' },
      { id: 'heart-chanel-4', label: 'works independently', emoji: '👑', description: 'Chanel: Needs no approval' },
      { id: 'heart-chanel-5', label: 'refines until perfect', emoji: '💎', description: 'Chanel: Polishes endlessly' },
      { id: 'heart-chanel-6', label: 'timeless over trendy', emoji: '⌚', description: 'Chanel: Ignores fads' },

      // Machiavelli habits - strategic, calculating, political
      { id: 'heart-machiavelli-1', label: 'maps stakeholders', emoji: '🗺️', description: 'Machiavelli: Knows who matters' },
      { id: 'heart-machiavelli-2', label: 'times announcements', emoji: '⏳', description: 'Machiavelli: When matters as much as what' },
      { id: 'heart-machiavelli-3', label: 'builds alliances', emoji: '🤝', description: 'Machiavelli: Strategic relationships' },
      { id: 'heart-machiavelli-4', label: 'keeps cards close', emoji: '🃏', description: 'Machiavelli: Information is power' },
      { id: 'heart-machiavelli-5', label: 'plans contingencies', emoji: '📊', description: 'Machiavelli: Always has plan B' },
      { id: 'heart-machiavelli-6', label: 'measures twice cuts once', emoji: '📏', description: 'Machiavelli: Calculated moves only' }
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
    'REFERENCES.md': [
      // Bernie Mac references - comedy, authenticity, realness
      { id: 'ref-bernie-1', label: 'The Bernie Mac Show', emoji: '📺', description: 'Bernie: Breaking the fourth wall to keep it real' },
      { id: 'ref-bernie-2', label: 'Kings of Comedy', emoji: '🎤', description: 'Bernie: Raw unfiltered stand-up energy' },
      { id: 'ref-bernie-3', label: 'I Aint Scared of You memoir', emoji: '📖', description: 'Bernie: His book on authentic living' },
      { id: 'ref-bernie-4', label: 'Milk and Cookies speech', emoji: '🥛', description: 'Bernie: Trying gentle, failing hilariously' },
      { id: 'ref-bernie-5', label: 'America speech monologues', emoji: '🇺🇸', description: 'Bernie: Direct address to the audience' },
      { id: 'ref-bernie-6', label: 'Bust your head quote', emoji: '💥', description: 'Bernie: Tough love at its finest' },
      { id: 'ref-bernie-7', label: 'Ocean\'s Eleven cameo', emoji: '🎰', description: 'Bernie: Effortless cool in ensemble' },
      { id: 'ref-bernie-8', label: 'Def Comedy Jam sets', emoji: '🎭', description: 'Bernie: Where legends were made' },
      { id: 'ref-bernie-9', label: 'Bad Santa role', emoji: '🎅', description: 'Bernie: Dark comedy perfection' },
      { id: 'ref-bernie-10', label: 'Who You Wit special', emoji: '🎬', description: 'Bernie: Comedy special raw energy' },
      { id: 'ref-bernie-11', label: 'Transformers cameo', emoji: '🤖', description: 'Bernie: Scene-stealing presence' },
      { id: 'ref-bernie-12', label: 'Pride film', emoji: '🦁', description: 'Bernie: Voice acting with soul' },

      // Rick Rubin references - production, creativity, minimalism
      { id: 'ref-rubin-1', label: 'The Creative Act book', emoji: '📖', description: 'Rubin: Being a vessel for creativity' },
      { id: 'ref-rubin-2', label: 'Johnny Cash American sessions', emoji: '🎸', description: 'Rubin: Stripping to raw emotion' },
      { id: 'ref-rubin-3', label: 'Def Jam dorm room origins', emoji: '🏠', description: 'Rubin: Starting with nothing but taste' },
      { id: 'ref-rubin-4', label: 'Broken Record podcast', emoji: '🎙️', description: 'Rubin: Conversations on creative process' },
      { id: 'ref-rubin-5', label: 'Shangri-La studio', emoji: '🏝️', description: 'Rubin: Environment shapes output' },
      { id: 'ref-rubin-6', label: 'Meditation practice', emoji: '🧘', description: 'Rubin: Stillness as creative fuel' },
      { id: 'ref-rubin-7', label: 'Beastie Boys Licensed to Ill', emoji: '🎤', description: 'Rubin: Punk meets hip-hop' },
      { id: 'ref-rubin-8', label: 'Red Hot Chili Peppers Blood Sugar', emoji: '🌶️', description: 'Rubin: Rock band rebirth' },
      { id: 'ref-rubin-9', label: 'Slayer Reign in Blood', emoji: '🔥', description: 'Rubin: Metal intensity captured' },
      { id: 'ref-rubin-10', label: 'Adele 21 and 25', emoji: '🎵', description: 'Rubin: Voice as instrument' },
      { id: 'ref-rubin-11', label: 'Jay-Z 99 Problems', emoji: '💯', description: 'Rubin: Rock-rap fusion' },
      { id: 'ref-rubin-12', label: 'Tom Petty Wildflowers', emoji: '🌸', description: 'Rubin: Intimate songwriting' },
      { id: 'ref-rubin-13', label: 'System of a Down Toxicity', emoji: '☠️', description: 'Rubin: Controlled chaos' },
      { id: 'ref-rubin-14', label: 'Kanye Yeezus', emoji: '⛪', description: 'Rubin: Stripping to abrasion' },

      // David Bowie references - reinvention, art, personas
      { id: 'ref-bowie-1', label: 'Ziggy Stardust album', emoji: '⚡', description: 'Bowie: Creating and killing a persona' },
      { id: 'ref-bowie-2', label: 'Berlin trilogy', emoji: '🇩🇪', description: 'Bowie: Escaping to reinvent' },
      { id: 'ref-bowie-3', label: 'Blackstar final album', emoji: '⭐', description: 'Bowie: Art until the very end' },
      { id: 'ref-bowie-4', label: 'Heroes song', emoji: '🦸', description: 'Bowie: Transcendent moments' },
      { id: 'ref-bowie-5', label: 'Thin White Duke era', emoji: '🎭', description: 'Bowie: Cold, detached persona' },
      { id: 'ref-bowie-6', label: 'Changes song', emoji: '🔄', description: 'Bowie: Embracing transformation' },
      { id: 'ref-bowie-7', label: 'Space Oddity', emoji: '🚀', description: 'Bowie: Isolation as metaphor' },
      { id: 'ref-bowie-8', label: 'Life on Mars', emoji: '🔴', description: 'Bowie: Cinematic songwriting' },
      { id: 'ref-bowie-9', label: 'Labyrinth film', emoji: '🏰', description: 'Bowie: Goblin King presence' },
      { id: 'ref-bowie-10', label: 'The Man Who Fell to Earth', emoji: '👽', description: 'Bowie: Alien outsider role' },
      { id: 'ref-bowie-11', label: 'Under Pressure with Queen', emoji: '👑', description: 'Bowie: Collaboration magic' },
      { id: 'ref-bowie-12', label: 'Ashes to Ashes video', emoji: '🤡', description: 'Bowie: Visual art innovation' },
      { id: 'ref-bowie-13', label: 'Let\'s Dance commercial era', emoji: '💃', description: 'Bowie: Mainstream on his terms' },
      { id: 'ref-bowie-14', label: 'Outside concept album', emoji: '🎨', description: 'Bowie: Art rock experimentation' },

      // Steve Jobs references - vision, products, philosophy
      { id: 'ref-jobs-1', label: 'Stanford commencement speech', emoji: '🎓', description: 'Jobs: Stay hungry stay foolish' },
      { id: 'ref-jobs-2', label: 'iPhone introduction', emoji: '📱', description: 'Jobs: One more thing moments' },
      { id: 'ref-jobs-3', label: 'Think Different campaign', emoji: '🍎', description: 'Jobs: Crazy ones change the world' },
      { id: 'ref-jobs-4', label: 'Isaacson biography', emoji: '📖', description: 'Jobs: Reality distortion field explained' },
      { id: 'ref-jobs-5', label: 'NeXT years', emoji: '⬛', description: 'Jobs: Wilderness builds character' },
      { id: 'ref-jobs-6', label: 'Pixar acquisition', emoji: '🎬', description: 'Jobs: Taste finds value others miss' },
      { id: 'ref-jobs-7', label: 'Macintosh 1984 ad', emoji: '📺', description: 'Jobs: Revolution as marketing' },
      { id: 'ref-jobs-8', label: 'iPod launch', emoji: '🎵', description: 'Jobs: 1000 songs in your pocket' },
      { id: 'ref-jobs-9', label: 'Apple Store design', emoji: '🏪', description: 'Jobs: Retail as experience' },
      { id: 'ref-jobs-10', label: 'iPad announcement', emoji: '📲', description: 'Jobs: Creating new categories' },
      { id: 'ref-jobs-11', label: 'Antennagate response', emoji: '📡', description: 'Jobs: Crisis management' },
      { id: 'ref-jobs-12', label: 'Lost Interview documentary', emoji: '🎥', description: 'Jobs: Unfiltered philosophy' },
      { id: 'ref-jobs-13', label: 'All Things D interviews', emoji: '💬', description: 'Jobs: On-stage candor' },
      { id: 'ref-jobs-14', label: 'Toy Story involvement', emoji: '🤠', description: 'Jobs: Story over technology' },

      // Summer Finn references - 500 Days, indie romance, detachment
      { id: 'ref-summer-1', label: '500 Days of Summer film', emoji: '🎬', description: 'Summer: Not a love story' },
      { id: 'ref-summer-2', label: 'IKEA scene', emoji: '🛋️', description: 'Summer: Playing house, not committing' },
      { id: 'ref-summer-3', label: 'Bench breakup scene', emoji: '🪑', description: 'Summer: I dont feel it anymore' },
      { id: 'ref-summer-4', label: 'Wedding ring reveal', emoji: '💍', description: 'Summer: Moved on instantly' },
      { id: 'ref-summer-5', label: 'The Smiths music taste', emoji: '🎵', description: 'Summer: Shared interests arent love' },
      { id: 'ref-summer-6', label: 'Expectations vs reality scene', emoji: '📊', description: 'Summer: What you wanted vs what happened' },
      { id: 'ref-summer-7', label: 'Karaoke bar scene', emoji: '🎤', description: 'Summer: Fun without meaning' },
      { id: 'ref-summer-8', label: 'Pancakes morning', emoji: '🥞', description: 'Summer: Domestic illusion' },
      { id: 'ref-summer-9', label: 'Elevator first meeting', emoji: '🛗', description: 'Summer: Casual magic' },
      { id: 'ref-summer-10', label: 'I like you speech', emoji: '💬', description: 'Summer: Honest but vague' },
      { id: 'ref-summer-11', label: 'Party rooftop scene', emoji: '🌃', description: 'Summer: Mixed signals peak' },
      { id: 'ref-summer-12', label: 'Hair touch moment', emoji: '✋', description: 'Summer: Intimate distance' },

      // Coco Chanel references - fashion, independence, quotes
      { id: 'ref-chanel-1', label: 'Little black dress', emoji: '👗', description: 'Chanel: Simplicity is elegance' },
      { id: 'ref-chanel-2', label: 'Chanel No 5', emoji: '🌸', description: 'Chanel: Choosing from 24 samples' },
      { id: 'ref-chanel-3', label: 'Cutting her own hair', emoji: '✂️', description: 'Chanel: Started a revolution by accident' },
      { id: 'ref-chanel-4', label: 'Ritz Hotel years', emoji: '🏨', description: 'Chanel: Living on her own terms' },
      { id: 'ref-chanel-5', label: 'Freeing women from corsets', emoji: '🔓', description: 'Chanel: Comfort as revolution' },
      { id: 'ref-chanel-6', label: 'Fashion fades style quote', emoji: '💬', description: 'Chanel: Style is eternal' },
      { id: 'ref-chanel-7', label: 'Chanel suit design', emoji: '🧥', description: 'Chanel: Power dressing invented' },
      { id: 'ref-chanel-8', label: 'Jersey fabric innovation', emoji: '🧵', description: 'Chanel: Luxury from simplicity' },
      { id: 'ref-chanel-9', label: 'Orphanage childhood', emoji: '🏚️', description: 'Chanel: Hardship as fuel' },
      { id: 'ref-chanel-10', label: 'Boy Capel relationship', emoji: '💔', description: 'Chanel: Love that shaped her' },
      { id: 'ref-chanel-11', label: 'Comeback at 71', emoji: '👵', description: 'Chanel: Never too late' },
      { id: 'ref-chanel-12', label: 'Costume jewelry revolution', emoji: '💎', description: 'Chanel: Fake as statement' },
      { id: 'ref-chanel-13', label: 'Two-tone shoes', emoji: '👠', description: 'Chanel: Details matter' },
      { id: 'ref-chanel-14', label: 'Working until death', emoji: '✂️', description: 'Chanel: Craft as life' },

      // Machiavelli references - The Prince, strategy, power
      { id: 'ref-machiavelli-1', label: 'The Prince book', emoji: '📖', description: 'Machiavelli: Handbook for rulers' },
      { id: 'ref-machiavelli-2', label: 'Cesare Borgia observations', emoji: '👁️', description: 'Machiavelli: Watching ruthless power' },
      { id: 'ref-machiavelli-3', label: 'Exile and torture period', emoji: '⛓️', description: 'Machiavelli: Suffering sharpens insight' },
      { id: 'ref-machiavelli-4', label: 'Better to be feared quote', emoji: '😨', description: 'Machiavelli: Fear over love if choosing' },
      { id: 'ref-machiavelli-5', label: 'Fortune is a woman quote', emoji: '🎲', description: 'Machiavelli: Bold action beats caution' },
      { id: 'ref-machiavelli-6', label: 'Discourses on Livy', emoji: '📜', description: 'Machiavelli: Republican ideals hidden' },
      { id: 'ref-machiavelli-7', label: 'Florentine Histories', emoji: '🏛️', description: 'Machiavelli: Power through narrative' },
      { id: 'ref-machiavelli-8', label: 'The Art of War treatise', emoji: '⚔️', description: 'Machiavelli: Military strategy' },
      { id: 'ref-machiavelli-9', label: 'Mandragola comedy', emoji: '🎭', description: 'Machiavelli: Satire as weapon' },
      { id: 'ref-machiavelli-10', label: 'Letter to Vettori', emoji: '✉️', description: 'Machiavelli: Writing The Prince story' },
      { id: 'ref-machiavelli-11', label: 'Fox and lion metaphor', emoji: '🦊', description: 'Machiavelli: Cunning plus strength' },
      { id: 'ref-machiavelli-12', label: 'Ends justify means', emoji: '🎯', description: 'Machiavelli: Results over morality' },
      { id: 'ref-machiavelli-13', label: 'Appearances matter', emoji: '🎭', description: 'Machiavelli: Seem vs be' },
      { id: 'ref-machiavelli-14', label: 'New prince advice', emoji: '👑', description: 'Machiavelli: Starting from nothing' }
    ]
  }

  return traits[filename] || [
    { id: 'default-1', label: 'trait one', emoji: '🏺' },
    { id: 'default-2', label: 'trait two', emoji: '🏺' },
    { id: 'default-3', label: 'trait three', emoji: '🏺' }
  ]
}
