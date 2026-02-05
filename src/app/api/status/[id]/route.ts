import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('sacrifices')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Offering not found' },
      { status: 404 }
    )
  }

  if (data.status === 'consumed') {
    return NextResponse.json({
      status: 'consumed',
      consumed_at: data.consumed_at
    })
  }

  // Get position in queue
  const { count } = await supabase
    .from('sacrifices')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting')
    .lte('offered_at', data.offered_at)

  return NextResponse.json({
    status: 'waiting',
    position: count || 1
  })
}
