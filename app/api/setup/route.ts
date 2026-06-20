import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Criar tabela notificacoes_automaticas
  const { error } = await supabase.from('notificacoes_automaticas').select('id').limit(1)
  
  if (error && error.code === '42P01') {
    // Tabela nao existe - criar via SQL
    const createRes = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: `CREATE TABLE IF NOT EXISTS notificacoes_automaticas (
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
        );`
      })
    })
    return NextResponse.json({ criado: true, status: createRes.status })
  }
  
  return NextResponse.json({ ok: true, tabela_existe: !error, error: error?.message })
}
