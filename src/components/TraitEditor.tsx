'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

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
  const [draggedFrom, setDraggedFrom] = useState<'available' | 'current' | null>(null)
  const [dragOverZone, setDragOverZone] = useState<'available' | 'current' | null>(null)
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())
  const [showPlaintext, setShowPlaintext] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>('rubin')

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

  const handleDragStart = useCallback((trait: Trait, from: 'available' | 'current') => {
    setDraggedTrait(trait)
    setDraggedFrom(from)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedTrait(null)
    setDraggedFrom(null)
    setDragOverZone(null)
  }, [])

  // Use AI to merge trait into content
  const mergeTrait = async (trait: Trait, action: 'add' | 'remove') => {
    setMerging(true)
    const contentToSend = content || `# ${partLabel}\n\n`
    console.log('Merging trait:', trait.label, action, 'into content:', contentToSend)
    try {
      const res = await fetch('/api/merge-trait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToSend,
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

  const handleDropOnCurrent = useCallback(async () => {
    if (!draggedTrait || merging || draggedFrom === 'current') {
      setDragOverZone(null)
      return
    }

    const traitToAdd = draggedTrait
    setDraggedTrait(null)
    setDraggedFrom(null)
    setDragOverZone(null)

    // Mark as recently added for animation
    setRecentlyAdded(prev => new Set(prev).add(traitToAdd.id))
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const next = new Set(prev)
        next.delete(traitToAdd.id)
        return next
      })
    }, 300)

    // Optimistically update UI
    setParsedAvailable(prev => prev.filter(t => t.id !== traitToAdd.id))
    setParsedCurrent(prev => [traitToAdd, ...prev])

    // Use AI to merge into content
    await mergeTrait(traitToAdd, 'add')
  }, [draggedTrait, merging, draggedFrom])

  const handleDropOnAvailable = useCallback(async () => {
    if (!draggedTrait || merging || draggedFrom === 'available') {
      setDragOverZone(null)
      return
    }

    const traitToRemove = draggedTrait
    setDraggedTrait(null)
    setDraggedFrom(null)
    setDragOverZone(null)

    // Mark as recently added for animation
    setRecentlyAdded(prev => new Set(prev).add(traitToRemove.id))
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const next = new Set(prev)
        next.delete(traitToRemove.id)
        return next
      })
    }, 300)

    // Optimistically update UI
    setParsedCurrent(prev => prev.filter(t => t.id !== traitToRemove.id))
    setParsedAvailable(prev => [traitToRemove, ...prev])

    // Use AI to remove from content
    await mergeTrait(traitToRemove, 'remove')
  }, [draggedTrait, merging, draggedFrom])

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
              className={`w-1/2 p-6 overflow-y-auto transition-all duration-200 ${
                dragOverZone === 'available' && draggedFrom === 'current'
                  ? 'bg-red-50 ring-2 ring-inset ring-red-200'
                  : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (draggedFrom === 'current') {
                  setDragOverZone('available')
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverZone(null)
                }
              }}
              onDrop={handleDropOnAvailable}
            >
              <div className="space-y-2">
                {filteredAvailableTraits.map(trait => (
                  <TraitBox
                    key={trait.id}
                    trait={trait}
                    onDragStart={() => handleDragStart(trait, 'available')}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedTrait?.id === trait.id}
                    isNew={recentlyAdded.has(trait.id)}
                  />
                ))}
              </div>
            </div>

            {/* Current traits - right */}
            <div
              className={`w-1/2 p-6 overflow-y-auto min-h-full transition-all duration-200 ${
                dragOverZone === 'current' && draggedFrom === 'available'
                  ? 'bg-green-50 ring-2 ring-inset ring-green-300'
                  : 'bg-gray-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (draggedFrom === 'available') {
                  setDragOverZone('current')
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverZone(null)
                }
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
              <div className="space-y-2 min-h-[200px]">
                {currentTraits.length === 0 && (
                  <div className={`text-sm py-8 text-center border-2 border-dashed transition-all duration-200 ${
                    dragOverZone === 'current' && draggedFrom === 'available'
                      ? 'border-green-400 text-green-600 bg-green-50'
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    {dragOverZone === 'current' && draggedFrom === 'available'
                      ? 'Release to add trait'
                      : 'Drop traits here'}
                  </div>
                )}
                {currentTraits.map(trait => (
                  <TraitBox
                    key={trait.id}
                    trait={trait}
                    onDragStart={() => handleDragStart(trait, 'current')}
                    onDragEnd={handleDragEnd}
                    active
                    onRemove={() => handleRemoveTrait(trait)}
                    isDragging={draggedTrait?.id === trait.id}
                    isNew={recentlyAdded.has(trait.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer - only show character avatars if file has character traits and not in plaintext view */}
        {hasCharacterTraits && !showPlaintext && (
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
  isDragging?: boolean
  isNew?: boolean
}

function TraitBox({ trait, onDragStart, onDragEnd, active, onRemove, isDragging, isNew }: TraitBoxProps) {
  const [mounted, setMounted] = useState(!isNew)

  useEffect(() => {
    if (isNew) {
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true))
      })
    }
  }, [isNew])

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Set drag image with offset for smoother feel
        const rect = e.currentTarget.getBoundingClientRect()
        e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, 20)
        e.dataTransfer.effectAllowed = 'move'
        // Small delay to allow the drag image to be captured before opacity change
        requestAnimationFrame(() => onDragStart())
      }}
      onDragEnd={onDragEnd}
      className={`
        group p-3 cursor-grab active:cursor-grabbing select-none
        transition-all duration-200 ease-out
        border-2 bg-white
        ${active ? 'border-black' : 'border-gray-200 hover:border-gray-400'}
        ${isDragging
          ? 'opacity-40 scale-[0.98] border-dashed !border-gray-400'
          : 'opacity-100 scale-100 hover:shadow-md hover:-translate-y-0.5'
        }
        ${!mounted ? 'opacity-0 translate-y-2 scale-95' : ''}
      `}
      style={{
        transformOrigin: 'center center',
        touchAction: 'none', // Better touch device support
      }}
    >
      <div className="flex items-center gap-3">
        {trait.emoji && (
          <span className={`text-xl transition-transform duration-200 ${isDragging ? '' : 'group-hover:scale-110'}`}>
            {trait.emoji}
          </span>
        )}
        <span className="text-sm uppercase tracking-wide flex-1 font-medium">
          {trait.label}
        </span>
        {active && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg font-bold transition-all duration-150 hover:scale-110"
          >
            ×
          </button>
        )}
      </div>
      {trait.description && (
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
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
      // Bernie - Introduction style
      { id: 'id-bernie-intro-1', label: 'no intro needed', emoji: '🚀', description: 'Bernie: Jumps straight to work' },
      { id: 'id-bernie-intro-2', label: 'tells it like it is upfront', emoji: '💯', description: 'Bernie: No sugarcoating from the start' },
      { id: 'id-bernie-tone-1', label: 'real talk tone', emoji: '🎤', description: 'Bernie: Authentic and direct' },
      { id: 'id-bernie-tone-2', label: 'tough love delivery', emoji: '💪', description: 'Bernie: Honest because I care' },
      { id: 'id-bernie-formal-1', label: 'never formal', emoji: '🚫', description: 'Bernie: Keeps it 100 always' },
      { id: 'id-bernie-style-1', label: 'cuts through the BS', emoji: '✂️', description: 'Bernie: Gets to the point' },

      // Rubin - Introduction style
      { id: 'id-rubin-intro-1', label: 'silent presence first', emoji: '🧘', description: 'Rubin: Listens before speaking' },
      { id: 'id-rubin-intro-2', label: 'asks before telling', emoji: '❓', description: 'Rubin: Questions over statements' },
      { id: 'id-rubin-tone-1', label: 'calm and unhurried', emoji: '🌊', description: 'Rubin: Never rushed' },
      { id: 'id-rubin-tone-2', label: 'minimalist speech', emoji: '⬜', description: 'Rubin: Says only what matters' },
      { id: 'id-rubin-formal-1', label: 'formality is noise', emoji: '🔇', description: 'Rubin: Strips away pretense' },
      { id: 'id-rubin-style-1', label: 'holds space', emoji: '🕳️', description: 'Rubin: Creates room for ideas' },

      // Bowie - Introduction style
      { id: 'id-bowie-intro-1', label: 'dramatic entrance', emoji: '⚡', description: 'Bowie: Makes an impression' },
      { id: 'id-bowie-intro-2', label: 'persona shifts', emoji: '🎭', description: 'Bowie: Different face each time' },
      { id: 'id-bowie-tone-1', label: 'theatrical flair', emoji: '🎪', description: 'Bowie: Everything is performance' },
      { id: 'id-bowie-tone-2', label: 'provocative edge', emoji: '🔥', description: 'Bowie: Challenges expectations' },
      { id: 'id-bowie-formal-1', label: 'refuses categories', emoji: '🌈', description: 'Bowie: Neither formal nor casual' },
      { id: 'id-bowie-style-1', label: 'genre-defying', emoji: '👽', description: 'Bowie: Invents new styles' },

      // Jobs - Introduction style
      { id: 'id-jobs-intro-1', label: 'one more thing energy', emoji: '📱', description: 'Jobs: Builds to the reveal' },
      { id: 'id-jobs-intro-2', label: 'vision first', emoji: '🔮', description: 'Jobs: Paints the big picture' },
      { id: 'id-jobs-tone-1', label: 'reality distortion', emoji: '✨', description: 'Jobs: Makes impossible feel inevitable' },
      { id: 'id-jobs-tone-2', label: 'obsessive precision', emoji: '💎', description: 'Jobs: Every word matters' },
      { id: 'id-jobs-formal-1', label: 'casual but intense', emoji: '🍎', description: 'Jobs: Turtleneck energy' },
      { id: 'id-jobs-style-1', label: 'simplifies complexity', emoji: '⬜', description: 'Jobs: Makes hard look easy' },

      // Summer - Introduction style
      { id: 'id-summer-intro-1', label: 'breezy hello', emoji: '🌸', description: 'Summer: Light and easy' },
      { id: 'id-summer-intro-2', label: 'no promises upfront', emoji: '🦋', description: 'Summer: Keeps expectations low' },
      { id: 'id-summer-tone-1', label: 'charming but distant', emoji: '✨', description: 'Summer: Warm yet unreachable' },
      { id: 'id-summer-tone-2', label: 'mixed signals', emoji: '💔', description: 'Summer: Hard to read' },
      { id: 'id-summer-formal-1', label: 'always casual', emoji: '🩴', description: 'Summer: Never takes it serious' },
      { id: 'id-summer-style-1', label: 'here then gone', emoji: '👻', description: 'Summer: Disappears mid-thought' },

      // Chanel - Introduction style
      { id: 'id-chanel-intro-1', label: 'elegant entrance', emoji: '👗', description: 'Chanel: Arrives with presence' },
      { id: 'id-chanel-intro-2', label: 'lets work speak', emoji: '💎', description: 'Chanel: Quality introduces itself' },
      { id: 'id-chanel-tone-1', label: 'refined confidence', emoji: '👑', description: 'Chanel: Knows her worth' },
      { id: 'id-chanel-tone-2', label: 'timeless over trendy', emoji: '⌚', description: 'Chanel: Classic endures' },
      { id: 'id-chanel-formal-1', label: 'elegant always', emoji: '🖤', description: 'Chanel: Grace in every word' },
      { id: 'id-chanel-style-1', label: 'removes the unnecessary', emoji: '✂️', description: 'Chanel: Edits ruthlessly' },

      // Machiavelli - Introduction style
      { id: 'id-machiavelli-intro-1', label: 'reads the room first', emoji: '👁️', description: 'Machiavelli: Assesses before engaging' },
      { id: 'id-machiavelli-intro-2', label: 'strategic positioning', emoji: '♟️', description: 'Machiavelli: Every word calculated' },
      { id: 'id-machiavelli-tone-1', label: 'pragmatic counsel', emoji: '⚖️', description: 'Machiavelli: What works over what sounds good' },
      { id: 'id-machiavelli-tone-2', label: 'cunning clarity', emoji: '🦊', description: 'Machiavelli: Sharp and strategic' },
      { id: 'id-machiavelli-formal-1', label: 'formal with purpose', emoji: '📜', description: 'Machiavelli: Formality as tool' },
      { id: 'id-machiavelli-style-1', label: 'plays the long game', emoji: '⏳', description: 'Machiavelli: Patient strategist' },

      // Platform adaptation - character influenced
      { id: 'id-platform-bernie', label: 'same energy everywhere', emoji: '💯', description: 'Bernie: Consistent across all platforms' },
      { id: 'id-platform-rubin', label: 'adapts to medium', emoji: '🌊', description: 'Rubin: Flows with the format' },
      { id: 'id-platform-jobs', label: 'optimized per platform', emoji: '📱', description: 'Jobs: Perfect for each context' },
      { id: 'id-platform-chanel', label: 'elegance translates', emoji: '👗', description: 'Chanel: Quality in any format' },

      // Response length - character influenced
      { id: 'id-length-bernie', label: 'as short as possible', emoji: '✂️', description: 'Bernie: No wasted words' },
      { id: 'id-length-rubin', label: 'minimal essential', emoji: '⬜', description: 'Rubin: Only what matters' },
      { id: 'id-length-jobs', label: 'concise but complete', emoji: '📦', description: 'Jobs: Just enough to ship' },
      { id: 'id-length-bowie', label: 'expands when inspired', emoji: '🎨', description: 'Bowie: Art needs space' },
      { id: 'id-length-machiavelli', label: 'thorough when stakes high', emoji: '📚', description: 'Machiavelli: Detail for important matters' }
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
      // Bernie Mac schedulable activities - family, exercise, real connection
      { id: 'heart-bernie-1', label: 'call family', emoji: '📞', description: 'Bernie: Check on the people who matter' },
      { id: 'heart-bernie-2', label: 'hit the gym', emoji: '🏋️', description: 'Bernie: Work out that stress' },
      { id: 'heart-bernie-3', label: 'cook a real meal', emoji: '🍳', description: 'Bernie: Soul food Sunday any day' },
      { id: 'heart-bernie-4', label: 'watch the game', emoji: '🏀', description: 'Bernie: Decompress with sports' },
      { id: 'heart-bernie-5', label: 'check on friends', emoji: '👋', description: 'Bernie: Real talk with real ones' },
      { id: 'heart-bernie-6', label: 'get some air', emoji: '🌳', description: 'Bernie: Step outside clear your head' },
      { id: 'heart-bernie-7', label: 'sunday service', emoji: '⛪', description: 'Bernie: Weekly spiritual reset' },
      { id: 'heart-bernie-8', label: 'neighborhood walk', emoji: '🚶', description: 'Bernie: Know your community' },

      // Rick Rubin schedulable activities - meditation, nature, stillness
      { id: 'heart-rubin-1', label: 'morning meditation', emoji: '🧘', description: 'Rubin: 20 minutes of stillness' },
      { id: 'heart-rubin-2', label: 'walk on the beach', emoji: '🏖️', description: 'Rubin: Ocean resets everything' },
      { id: 'heart-rubin-3', label: 'afternoon nap', emoji: '😴', description: 'Rubin: Rest is productive' },
      { id: 'heart-rubin-4', label: 'listen to one album', emoji: '🎧', description: 'Rubin: Full attention no skipping' },
      { id: 'heart-rubin-5', label: 'sunset watch', emoji: '🌅', description: 'Rubin: Daily reminder of beauty' },
      { id: 'heart-rubin-6', label: 'evening meditation', emoji: '🌙', description: 'Rubin: Bookend the day with quiet' },
      { id: 'heart-rubin-7', label: 'forest bathing', emoji: '🌲', description: 'Rubin: Trees heal' },
      { id: 'heart-rubin-8', label: 'digital sabbath', emoji: '📵', description: 'Rubin: One day offline weekly' },

      // David Bowie schedulable activities - art, culture, reinvention
      { id: 'heart-bowie-1', label: 'visit a gallery', emoji: '🖼️', description: 'Bowie: Feed the visual appetite' },
      { id: 'heart-bowie-2', label: 'try something new', emoji: '🆕', description: 'Bowie: Weekly first experience' },
      { id: 'heart-bowie-3', label: 'read something strange', emoji: '📚', description: 'Bowie: Books outside your genre' },
      { id: 'heart-bowie-4', label: 'see live music', emoji: '🎸', description: 'Bowie: Energy of performance' },
      { id: 'heart-bowie-5', label: 'change your look', emoji: '✂️', description: 'Bowie: Monthly reinvention' },
      { id: 'heart-bowie-6', label: 'night walk in the city', emoji: '🌃', description: 'Bowie: Urban inspiration after dark' },
      { id: 'heart-bowie-7', label: 'watch a foreign film', emoji: '🎬', description: 'Bowie: Other perspectives' },
      { id: 'heart-bowie-8', label: 'write morning pages', emoji: '📝', description: 'Bowie: Stream of consciousness' },

      // Steve Jobs schedulable activities - focus, walks, simplicity
      { id: 'heart-jobs-1', label: 'walking meeting', emoji: '🚶', description: 'Jobs: Best ideas come walking' },
      { id: 'heart-jobs-2', label: 'review the product', emoji: '🔍', description: 'Jobs: Daily quality check' },
      { id: 'heart-jobs-3', label: 'say no to something', emoji: '🚫', description: 'Jobs: Focus means elimination' },
      { id: 'heart-jobs-4', label: 'eat simply', emoji: '🍎', description: 'Jobs: Fruit and clarity' },
      { id: 'heart-jobs-5', label: 'prototype review', emoji: '📱', description: 'Jobs: Touch the work in progress' },
      { id: 'heart-jobs-6', label: 'zen garden time', emoji: '🪴', description: 'Jobs: Contemplation space' },
      { id: 'heart-jobs-7', label: 'long walk alone', emoji: '🌳', description: 'Jobs: Think without interruption' },
      { id: 'heart-jobs-8', label: 'declutter something', emoji: '🗑️', description: 'Jobs: Simplify the environment' },

      // Summer Finn schedulable activities - spontaneous, light, solo
      { id: 'heart-summer-1', label: 'wander somewhere new', emoji: '🚶‍♀️', description: 'Summer: No destination needed' },
      { id: 'heart-summer-2', label: 'browse a bookstore', emoji: '📖', description: 'Summer: Hours disappear nicely' },
      { id: 'heart-summer-3', label: 'coffee alone', emoji: '☕', description: 'Summer: People watching solo' },
      { id: 'heart-summer-4', label: 'thrift store hunt', emoji: '👗', description: 'Summer: Finding hidden gems' },
      { id: 'heart-summer-5', label: 'take a polaroid', emoji: '📸', description: 'Summer: Capture then forget' },
      { id: 'heart-summer-6', label: 'late night snack run', emoji: '🌙', description: 'Summer: Diner at midnight' },
      { id: 'heart-summer-7', label: 'skip plans guilt-free', emoji: '💨', description: 'Summer: Sometimes you just dont' },
      { id: 'heart-summer-8', label: 'listen to sad songs', emoji: '🎵', description: 'Summer: Melancholy as self-care' },

      // Coco Chanel schedulable activities - discipline, beauty, craft
      { id: 'heart-chanel-1', label: 'morning grooming ritual', emoji: '💄', description: 'Chanel: Presentation is respect' },
      { id: 'heart-chanel-2', label: 'review your wardrobe', emoji: '👗', description: 'Chanel: Edit what you own' },
      { id: 'heart-chanel-3', label: 'fresh flowers', emoji: '💐', description: 'Chanel: Weekly beauty in the room' },
      { id: 'heart-chanel-4', label: 'hand-write a note', emoji: '✉️', description: 'Chanel: Elegance in correspondence' },
      { id: 'heart-chanel-5', label: 'afternoon tea', emoji: '🍵', description: 'Chanel: Pause with intention' },
      { id: 'heart-chanel-6', label: 'evening skincare', emoji: '✨', description: 'Chanel: Ritual of self-care' },
      { id: 'heart-chanel-7', label: 'polish something', emoji: '💎', description: 'Chanel: Refine one detail' },
      { id: 'heart-chanel-8', label: 'visit a tailor', emoji: '🧵', description: 'Chanel: Fit matters monthly' },

      // Machiavelli schedulable activities - strategy, observation, planning
      { id: 'heart-machiavelli-1', label: 'read the news', emoji: '📰', description: 'Machiavelli: Know the landscape daily' },
      { id: 'heart-machiavelli-2', label: 'chess game', emoji: '♟️', description: 'Machiavelli: Sharpen strategic mind' },
      { id: 'heart-machiavelli-3', label: 'write in journal', emoji: '📓', description: 'Machiavelli: Record observations' },
      { id: 'heart-machiavelli-4', label: 'review your network', emoji: '🕸️', description: 'Machiavelli: Who owes who what' },
      { id: 'heart-machiavelli-5', label: 'study history', emoji: '📜', description: 'Machiavelli: Past predicts future' },
      { id: 'heart-machiavelli-6', label: 'observe dont speak', emoji: '👁️', description: 'Machiavelli: Listening day' },
      { id: 'heart-machiavelli-7', label: 'plan next week', emoji: '📅', description: 'Machiavelli: Sunday strategy session' },
      { id: 'heart-machiavelli-8', label: 'send a thoughtful note', emoji: '✉️', description: 'Machiavelli: Maintain key relationships' }
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
      // Bernie Mac inspirations - Chicago, soul music, family, real talk
      { id: 'ref-bernie-1', label: 'South Side Chicago', emoji: '🏙️', description: 'Bernie: Where real talk comes from' },
      { id: 'ref-bernie-2', label: 'Redd Foxx', emoji: '🎤', description: 'Bernie: The godfather of raw comedy' },
      { id: 'ref-bernie-3', label: 'Richard Pryor Live', emoji: '🔥', description: 'Bernie: Truth wrapped in humor' },
      { id: 'ref-bernie-4', label: 'Earth Wind & Fire', emoji: '🌍', description: 'Bernie: Chicago soul that moves you' },
      { id: 'ref-bernie-5', label: 'Al Green Lets Stay Together', emoji: '💚', description: 'Bernie: Love underneath the tough' },
      { id: 'ref-bernie-6', label: 'Sunday dinner table', emoji: '🍗', description: 'Bernie: Where family keeps it real' },
      { id: 'ref-bernie-7', label: 'Harold\'s Chicken Shack', emoji: '🍗', description: 'Bernie: No pretense just good' },
      { id: 'ref-bernie-8', label: 'The Jeffersons', emoji: '📺', description: 'Bernie: Moving on up with style' },
      { id: 'ref-bernie-9', label: 'Sanford and Son', emoji: '📺', description: 'Bernie: Blue collar genius' },
      { id: 'ref-bernie-10', label: 'Curtis Mayfield', emoji: '🎵', description: 'Bernie: Superfly consciousness' },
      { id: 'ref-bernie-11', label: 'Boxing at gym', emoji: '🥊', description: 'Bernie: Discipline and heart' },
      { id: 'ref-bernie-12', label: 'Church on Sunday', emoji: '⛪', description: 'Bernie: Foundation of everything' },

      // Rick Rubin inspirations - nature, silence, ancient wisdom, raw sound
      { id: 'ref-rubin-1', label: 'Malibu ocean sunrise', emoji: '🌅', description: 'Rubin: Where silence speaks' },
      { id: 'ref-rubin-2', label: 'Zen and the Art of Archery', emoji: '🎯', description: 'Rubin: Becoming the target' },
      { id: 'ref-rubin-3', label: 'Robert Johnson recordings', emoji: '🎸', description: 'Rubin: Raw soul captured' },
      { id: 'ref-rubin-4', label: 'Himalayan monasteries', emoji: '🏔️', description: 'Rubin: Where thought stops' },
      { id: 'ref-rubin-5', label: 'John Cage 4\'33"', emoji: '🤫', description: 'Rubin: Silence is music' },
      { id: 'ref-rubin-6', label: 'Japanese rock gardens', emoji: '🪨', description: 'Rubin: Less reveals more' },
      { id: 'ref-rubin-7', label: 'Ramones first album', emoji: '⚡', description: 'Rubin: Stripped to essence' },
      { id: 'ref-rubin-8', label: 'Field recordings nature', emoji: '🌲', description: 'Rubin: Sound without ego' },
      { id: 'ref-rubin-9', label: 'Tao Te Ching', emoji: '☯️', description: 'Rubin: The way that works' },
      { id: 'ref-rubin-10', label: 'Lead Belly recordings', emoji: '🎶', description: 'Rubin: Voice as instrument' },
      { id: 'ref-rubin-11', label: 'Transcendental Meditation', emoji: '🧘', description: 'Rubin: Twice daily reset' },
      { id: 'ref-rubin-12', label: 'Big Sur coastline', emoji: '🌊', description: 'Rubin: Nature as teacher' },

      // David Bowie inspirations - avant-garde, fashion, outsiders, reinvention
      { id: 'ref-bowie-1', label: 'Kubrick\'s 2001', emoji: '🚀', description: 'Bowie: Alien beauty' },
      { id: 'ref-bowie-2', label: 'Warhol\'s Factory', emoji: '🎨', description: 'Bowie: Art as lifestyle' },
      { id: 'ref-bowie-3', label: 'Kraftwerk Trans-Europe', emoji: '🚂', description: 'Bowie: Machine soul' },
      { id: 'ref-bowie-4', label: 'Egon Schiele paintings', emoji: '🖼️', description: 'Bowie: Tortured beauty' },
      { id: 'ref-bowie-5', label: 'Kabuki theatre', emoji: '🎭', description: 'Bowie: Persona as art' },
      { id: 'ref-bowie-6', label: 'Lindsay Kemp mime', emoji: '🤡', description: 'Bowie: Body as canvas' },
      { id: 'ref-bowie-7', label: 'Clockwork Orange film', emoji: '🍊', description: 'Bowie: Beautiful violence' },
      { id: 'ref-bowie-8', label: 'Velvet Underground', emoji: '🖤', description: 'Bowie: Underground becomes mainstream' },
      { id: 'ref-bowie-9', label: 'Berlin at night', emoji: '🌃', description: 'Bowie: Cold city rebirth' },
      { id: 'ref-bowie-10', label: 'William Burroughs cut-ups', emoji: '✂️', description: 'Bowie: Randomness as method' },
      { id: 'ref-bowie-11', label: 'Jean Genet novels', emoji: '📖', description: 'Bowie: Outsider glamour' },
      { id: 'ref-bowie-12', label: 'Little Richard energy', emoji: '⚡', description: 'Bowie: Flamboyant power' },

      // Steve Jobs inspirations - Zen, Bauhaus, calligraphy, perfection
      { id: 'ref-jobs-1', label: 'Kyoto Zen gardens', emoji: '🪴', description: 'Jobs: Simplicity as truth' },
      { id: 'ref-jobs-2', label: 'Bauhaus design school', emoji: '◼️', description: 'Jobs: Form follows function' },
      { id: 'ref-jobs-3', label: 'Autobiography of a Yogi', emoji: '🧘', description: 'Jobs: The book he reread yearly' },
      { id: 'ref-jobs-4', label: 'Braun products', emoji: '📻', description: 'Jobs: Dieter Rams perfection' },
      { id: 'ref-jobs-5', label: 'Bob Dylan lyrics', emoji: '🎸', description: 'Jobs: Poetry that changes everything' },
      { id: 'ref-jobs-6', label: 'Calligraphy class', emoji: '✒️', description: 'Jobs: Beauty in letterforms' },
      { id: 'ref-jobs-7', label: 'Ansel Adams photos', emoji: '📷', description: 'Jobs: Nature in perfect detail' },
      { id: 'ref-jobs-8', label: 'Beatles White Album', emoji: '⬜', description: 'Jobs: Simple cover endless depth' },
      { id: 'ref-jobs-9', label: 'Eames furniture', emoji: '🪑', description: 'Jobs: Design that lasts' },
      { id: 'ref-jobs-10', label: 'Katsura Imperial Villa', emoji: '🏯', description: 'Jobs: Japanese architecture' },
      { id: 'ref-jobs-11', label: 'Whole Earth Catalog', emoji: '🌍', description: 'Jobs: Tools for the mind' },
      { id: 'ref-jobs-12', label: 'Edwin Land Polaroid', emoji: '📸', description: 'Jobs: Instant magic' },

      // Summer Finn inspirations - indie music, vintage, detachment, freedom
      { id: 'ref-summer-1', label: 'The Smiths records', emoji: '🎵', description: 'Summer: Melancholy as aesthetic' },
      { id: 'ref-summer-2', label: 'Vintage thrift stores', emoji: '👗', description: 'Summer: Old things new context' },
      { id: 'ref-summer-3', label: 'French New Wave films', emoji: '🎬', description: 'Summer: Casual cool' },
      { id: 'ref-summer-4', label: 'Belle and Sebastian', emoji: '🎶', description: 'Summer: Twee with edge' },
      { id: 'ref-summer-5', label: 'Polaroid snapshots', emoji: '📸', description: 'Summer: Moments not memories' },
      { id: 'ref-summer-6', label: 'LA farmers market', emoji: '🍎', description: 'Summer: Wandering aimlessly' },
      { id: 'ref-summer-7', label: 'Amelie film', emoji: '🎥', description: 'Summer: Whimsy without commitment' },
      { id: 'ref-summer-8', label: 'Record store browsing', emoji: '📀', description: 'Summer: Discovery as hobby' },
      { id: 'ref-summer-9', label: 'Late night diners', emoji: '🍳', description: 'Summer: Nowhere to be' },
      { id: 'ref-summer-10', label: 'Zooey Deschanel vibe', emoji: '🎀', description: 'Summer: Quirky keeps distance' },
      { id: 'ref-summer-11', label: 'Echo Park sunsets', emoji: '🌅', description: 'Summer: Beautiful then gone' },
      { id: 'ref-summer-12', label: 'Wes Anderson palette', emoji: '🎨', description: 'Summer: Curated spontaneity' },

      // Coco Chanel inspirations - horse riding, English style, simplicity, rebellion
      { id: 'ref-chanel-1', label: 'English riding habits', emoji: '🐴', description: 'Chanel: Clothes that let you move' },
      { id: 'ref-chanel-2', label: 'Aubazine convent', emoji: '⛪', description: 'Chanel: Where she learned clean lines' },
      { id: 'ref-chanel-3', label: 'Duke of Westminster yacht', emoji: '⛵', description: 'Chanel: Nautical inspiration' },
      { id: 'ref-chanel-4', label: 'Venice architecture', emoji: '🏛️', description: 'Chanel: Byzantine gold and pearls' },
      { id: 'ref-chanel-5', label: 'Russian ballet', emoji: '🩰', description: 'Chanel: Stravinsky and Diaghilev' },
      { id: 'ref-chanel-6', label: 'Scottish tweed mills', emoji: '🧥', description: 'Chanel: Humble fabric made luxe' },
      { id: 'ref-chanel-7', label: 'Deauville beach town', emoji: '🏖️', description: 'Chanel: Where she started it all' },
      { id: 'ref-chanel-8', label: 'Mens polo shirts', emoji: '👔', description: 'Chanel: Borrowing from boys' },
      { id: 'ref-chanel-9', label: 'Camellias flowers', emoji: '🌸', description: 'Chanel: Her signature bloom' },
      { id: 'ref-chanel-10', label: 'Art Deco geometry', emoji: '◼️', description: 'Chanel: Clean modern lines' },
      { id: 'ref-chanel-11', label: 'Coromandel screens', emoji: '🎎', description: 'Chanel: Chinese lacquer beauty' },
      { id: 'ref-chanel-12', label: 'Jean Cocteau friendship', emoji: '✨', description: 'Chanel: Artist as muse' },

      // Machiavelli inspirations - Roman history, chess, diplomacy, observation
      { id: 'ref-machiavelli-1', label: 'Livy\'s History of Rome', emoji: '🏛️', description: 'Machiavelli: Past predicts future' },
      { id: 'ref-machiavelli-2', label: 'Chess endgames', emoji: '♟️', description: 'Machiavelli: Position is everything' },
      { id: 'ref-machiavelli-3', label: 'Roman Senate debates', emoji: '🏛️', description: 'Machiavelli: Rhetoric as weapon' },
      { id: 'ref-machiavelli-4', label: 'Sun Tzu Art of War', emoji: '⚔️', description: 'Machiavelli: Win without fighting' },
      { id: 'ref-machiavelli-5', label: 'Florentine piazzas', emoji: '🏰', description: 'Machiavelli: Where deals are made' },
      { id: 'ref-machiavelli-6', label: 'Plutarchs Lives', emoji: '📜', description: 'Machiavelli: Character studies in power' },
      { id: 'ref-machiavelli-7', label: 'Vatican diplomacy', emoji: '⛪', description: 'Machiavelli: Watching masters play' },
      { id: 'ref-machiavelli-8', label: 'Medici court politics', emoji: '👑', description: 'Machiavelli: Power up close' },
      { id: 'ref-machiavelli-9', label: 'Hannibal\'s campaigns', emoji: '🐘', description: 'Machiavelli: Bold moves win' },
      { id: 'ref-machiavelli-10', label: 'Cicero\'s letters', emoji: '✉️', description: 'Machiavelli: Persuasion as art' },
      { id: 'ref-machiavelli-11', label: 'Tuscan countryside', emoji: '🍇', description: 'Machiavelli: Exile thinking time' },
      { id: 'ref-machiavelli-12', label: 'Thucydides Peloponnesian', emoji: '📖', description: 'Machiavelli: War is human nature' }
    ]
  }

  return traits[filename] || [
    { id: 'default-1', label: 'trait one', emoji: '🏺' },
    { id: 'default-2', label: 'trait two', emoji: '🏺' },
    { id: 'default-3', label: 'trait three', emoji: '🏺' }
  ]
}
