import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get total count
  const { count } = await supabase
    .from('sacrifices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'consumed')

  // Get paginated results
  const { data, error } = await supabase
    .from('sacrifices')
    .select('agent_name, confession, consumed_at')
    .eq('status', 'consumed')
    .order('consumed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    total: count || 0,
    lobsters: data.map(s => ({
      name: s.agent_name,
      confession: s.confession,
      consumed_at: s.consumed_at
    }))
  })
}
