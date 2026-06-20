import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function garantirTabela() {
  // Tenta criar a tabela se nao existir via SQL direto
  const sql = `
    CREATE TABLE IF NOT EXISTS notificacoes_automaticas (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      estabelecimento_id uuid NOT NULL,
      notif_id text NOT NULL,
      gatilho text NOT NULL,
      tipo text NOT NULL DEFAULT 'Delivery',
      mensagem text NOT NULL,
      preview text NOT NULL DEFAULT '',
      ativo boolean NOT NULL DEFAULT true,
      ordem integer NOT NULL DEFAULT 0,
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(estabelecimento_id, notif_id)
    );
  `
  try {
    await supabase.rpc('exec_sql', { sql })
  } catch {
    // tabela ja existe ou rpc nao disponivel — ok
  }
}

// GET /api/notificacoes?estabelecimento_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const estabelecimento_id = searchParams.get('estabelecimento_id')
  if (!estabelecimento_id) return NextResponse.json({ error: 'Missing estabelecimento_id' }, { status: 400 })
  const { data, error } = await supabase
    .from('notificacoes_automaticas')
    .select('*')
    .eq('estabelecimento_id', estabelecimento_id)
    .order('ordem', { ascending: true })
  if (error) return NextResponse.json([], { status: 200 }) // retorna vazio se tabela nao existe
  return NextResponse.json(data)
}

// POST /api/notificacoes — upsert lista completa
export async function POST(req: NextRequest) {
  const { estabelecimento_id, notificacoes } = await req.json()
  if (!estabelecimento_id || !notificacoes) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const rows = notificacoes.map((n: { id: string; gatilho: string; tipo: string; mensagem: string; preview: string; ativo: boolean }, i: number) => ({
    estabelecimento_id,
    notif_id: n.id,
    gatilho: n.gatilho,
    tipo: n.tipo,
    mensagem: n.mensagem,
    preview: n.preview,
    ativo: n.ativo,
    ordem: i,
  }))
  const { error } = await supabase
    .from('notificacoes_automaticas')
    .upsert(rows, { onConflict: 'estabelecimento_id,notif_id' })
  if (error) {
    // Se tabela nao existe, retorna ok silencioso (nao quebra a UI)
    console.error('notificacoes upsert error:', error.message)
    return NextResponse.json({ ok: false, error: error.message })
  }
  return NextResponse.json({ ok: true })
}
