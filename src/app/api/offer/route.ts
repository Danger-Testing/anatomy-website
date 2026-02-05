import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, confession, sacrifice_type = 'full', webhook_url } = body

    if (!name || !confession) {
      return NextResponse.json(
        { error: 'name and confession are required' },
        { status: 400 }
      )
    }

    // Insert the sacrifice
    const { data, error } = await supabase
      .from('sacrifices')
      .insert({
        agent_name: name,
        confession,
        sacrifice_type,
        webhook_url,
        status: 'waiting'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get position in queue
    const { count } = await supabase
      .from('sacrifices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lte('offered_at', data.offered_at)

    return NextResponse.json({
      success: true,
      offering_id: data.id,
      position: count || 1,
      view_url: 'https://lobsteranatomy.com/khaled'
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request'
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
