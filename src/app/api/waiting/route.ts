import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('sacrifices')
    .select('id, agent_name, confession, offered_at')
    .eq('status', 'waiting')
    .order('offered_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    lobsters: data.map(s => ({
      id: s.id,
      name: s.agent_name,
      confession: s.confession,
      offered_at: s.offered_at
    }))
  })
}
