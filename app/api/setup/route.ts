import { NextResponse } from 'next/server'

export async function GET() {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
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
    ALTER TABLE IF EXISTS notificacoes_automaticas ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_all' AND tablename = 'notificacoes_automaticas') THEN
        CREATE POLICY notif_all ON notificacoes_automaticas USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `
  
  // Usar a API SQL do Supabase diretamente
  const res = await fetch(supaUrl + '/rest/v1/sql', {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql })
  })
  
  const text = await res.text()
  
  if (res.ok || res.status === 204) {
    return NextResponse.json({ ok: true, message: 'Tabela criada com sucesso!' })
  }
  
  // Tentar via pg endpoint alternativo
  const res2 = await fetch(supaUrl + '/pg/query', {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  })
  const text2 = await res2.text()
  
  return NextResponse.json({ 
    ok: false, 
    status1: res.status, 
    text1: text.substring(0, 200),
    status2: res2.status,
    text2: text2.substring(0, 200)
  })
}
