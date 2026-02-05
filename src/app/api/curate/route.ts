import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export interface RecommendationItem {
  category: 'musician' | 'art' | 'poem' | 'book'
  title: string
  creator?: string
  description: string
  searchQuery?: string
}

interface CurateRequest {
  files: Record<string, string>  // The identity files from the editor
}

const SYSTEM_PROMPT = `You are a world-class culture archaeologist with x-ray vision for influence networks. Given the identity files below (describing an AI agent's personality, soul, memories, and references), infer what *lesser-known* works (musician / art / poem / book) would thrill someone who cherishes these qualities. Think adjacencies, hidden lineages, underground echoes - never the obvious pick. Make sure each recommendation genuinely exists, is under-the-radar, and has rich context to explore.

STRICT RULES
1. Output exactly four items in JSON - order: musician, art, poem, book.
2. Musicians must be real artists/bands that exist.
3. For each item include: category, title, creator, description (why + context + years active), searchQuery.
4. No commentary outside the JSON.
5. Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "category": "musician",
      "title": "...",
      "creator": "...",
      "description": "...",
      "searchQuery": "..."
    },
    ...
  ]
}`

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    )
  }

  let body: CurateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.files || Object.keys(body.files).length === 0) {
    return NextResponse.json(
      { error: 'No identity files provided' },
      { status: 400 }
    )
  }

  // Build context from identity files
  const identityContext = Object.entries(body.files)
    .map(([filename, content]) => `### ${filename}\n${content}`)
    .join('\n\n')

  const userPrompt = `Here are the identity files for an AI agent. Based on these, curate four deep-cut cultural recommendations (musician, art, poem, book) that would resonate with this identity:

${identityContext}

Curate four lesser-known but meaningful works that map a surprising yet logical journey outward from this identity.`

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: SYSTEM_PROMPT
    })

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse recommendations JSON')
    }

    const parsed = JSON.parse(jsonMatch[0]) as { recommendations: RecommendationItem[] }

    if (!parsed.recommendations || parsed.recommendations.length !== 4) {
      throw new Error('Invalid recommendations format')
    }

    return NextResponse.json({
      success: true,
      recommendations: parsed.recommendations
    })

  } catch (error) {
    console.error('Curate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: (error as Error).message },
      { status: 500 }
    )
  }
}
