import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface MergeTraitRequest {
  content: string      // Current markdown content
  trait: {
    label: string
    emoji?: string
    description?: string
  }
  action: 'add' | 'remove'
  filename: string     // e.g. "SOUL.md", "IDENTITY.md"
}

const SYSTEM_PROMPT = `You edit markdown files. You ONLY output markdown, nothing else. NEVER ask questions. NEVER explain. NEVER use code blocks. Just output the updated markdown directly.

When ADDING: Add the trait as a bullet point at the end of an existing section, or create a new bullet point section if needed. Keep it simple.

When REMOVING: Delete the line containing the trait. Clean up empty sections.

Output ONLY the final markdown. No other text.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    )
  }

  let body: MergeTraitRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.content || !body.trait || !body.action) {
    return NextResponse.json(
      { error: 'Missing required fields: content, trait, action' },
      { status: 400 }
    )
  }

  const traitDescription = body.trait.description
    ? `"${body.trait.label}" (${body.trait.description})`
    : `"${body.trait.label}"`

  const userPrompt = body.action === 'add'
    ? `Add the trait ${traitDescription} to this ${body.filename} file. Find the best place for it:

${body.content || `# ${body.filename.replace('.md', '')}\n\n`}`
    : `Remove the trait ${traitDescription} from this ${body.filename} file:

${body.content}`

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: SYSTEM_PROMPT
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Return the updated content
    return NextResponse.json({
      success: true,
      content: textContent.text.trim()
    })

  } catch (error) {
    const err = error as Error
    console.error('Merge trait error:', err.message, err.stack)
    return NextResponse.json(
      { error: 'Failed to merge trait', details: err.message, stack: err.stack },
      { status: 500 }
    )
  }
}
