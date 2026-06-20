import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Lista todos os templates do estabelecimento
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const estabelecimento_id = searchParams.get('estabelecimento_id')

  let query = supabase
    .from('mel_templates')
    .select('*')
    .order('prioridade', { ascending: false })
    .order('criado_em', { ascending: false })

  if (estabelecimento_id) {
    query = query.eq('estabelecimento_id', estabelecimento_id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data })
}

// POST - Cria novo template
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { estabelecimento_id, trigger_keywords, response_text, categoria, prioridade } = body

  if (!trigger_keywords || !response_text) {
    return NextResponse.json({ error: 'trigger_keywords e response_text sao obrigatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('mel_templates')
    .insert({ estabelecimento_id, trigger_keywords, response_text, categoria: categoria || 'geral', prioridade: prioridade || 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

// PUT - Atualiza template existente
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, trigger_keywords, response_text, categoria, prioridade, ativo } = body

  if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })

  const { data, error } = await supabase
    .from('mel_templates')
    .update({ trigger_keywords, response_text, categoria, prioridade, ativo, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

// DELETE - Remove template
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })

  const { error } = await supabase.from('mel_templates').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
