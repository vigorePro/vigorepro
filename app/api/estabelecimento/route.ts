import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug obrigatorio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('estabelecimentos')
    .select('id, nome, slug, tipo, endereco')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Estabelecimento nao encontrado' }, { status: 404 })
  }

  return NextResponse.json(data)
}
