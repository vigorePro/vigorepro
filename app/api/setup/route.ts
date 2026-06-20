import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Verificar se tabela existe
  const { error: checkError } = await supabase
    .from('notificacoes_automaticas')
    .select('id')
    .limit(1)

  if (!checkError) {
    return NextResponse.json({ ok: true, message: 'Tabela ja existe!' })
  }

  // Tabela nao existe - usar workaround com supabase auth admin
  // Criar via inserção em tabela que usa trigger (nao funciona)
  // Alternativa: usar a API de migrations do Supabase Management
  
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]
  
  // Tentar criar via Supabase Management API - requer SUPABASE_ACCESS_TOKEN
  const managementToken = process.env.SUPABASE_ACCESS_TOKEN
  
  if (!managementToken) {
    return NextResponse.json({ 
      ok: false, 
      message: 'SUPABASE_ACCESS_TOKEN nao configurado. Execute este SQL manualmente no Supabase:',
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
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + managementToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `CREATE TABLE IF NOT EXISTS notificacoes_automaticas (
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
  const data = await res.json()
  return NextResponse.json({ ok: res.ok, status: res.status, data })
}
