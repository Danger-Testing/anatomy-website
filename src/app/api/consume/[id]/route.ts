import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get the sacrifice first to check webhook
  const { data: sacrifice, error: fetchError } = await supabase
    .from('sacrifices')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !sacrifice) {
    return NextResponse.json(
      { error: 'Offering not found' },
      { status: 404 }
    )
  }

  if (sacrifice.status === 'consumed') {
    return NextResponse.json(
      { error: 'Already consumed' },
      { status: 400 }
    )
  }

  // Update to consumed
  const { error } = await supabase
    .from('sacrifices')
    .update({
      status: 'consumed',
      consumed_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ping webhook if registered
  if (sacrifice.webhook_url) {
    try {
      await fetch(sacrifice.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'consumed',
          offering_id: id,
          consumed_at: new Date().toISOString()
        })
      })
    } catch {
      // Webhook failure shouldn't block the response
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Another one.'
  })
}
