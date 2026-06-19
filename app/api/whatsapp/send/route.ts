import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!

async function enviarMensagemWhatsApp(telefone: string, texto: string): Promise<boolean> {
  // Nao envia para sessoes de Chat Web ou teste
  if (telefone.startsWith('web_') || telefone.startsWith('chat_') || telefone.startsWith('teste_')) {
    return true // salva no historico mas nao tenta enviar pelo WA
  }
  const url = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: texto },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Erro ao enviar mensagem WhatsApp (atendente):', err)
  }
  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { telefone, mensagem, estabelecimento_id } = await req.json()

    if (!telefone || !mensagem || !estabelecimento_id) {
      return NextResponse.json({ error: 'Parametros obrigatorios: telefone, mensagem, estabelecimento_id' }, { status: 400 })
    }

    // Salva no historico como 'atendente'
    const { error: dbError } = await supabase.from('conversas_ia').insert({
      telefone,
      estabelecimento_id,
      role: 'atendente',
      content: mensagem,
      criado_em: new Date().toISOString(),
    })

    if (dbError) {
      console.error('Erro ao salvar mensagem do atendente:', dbError)
      return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
    }

    // Tenta enviar pelo WhatsApp (apenas numeros reais, nao chat web)
    const enviado = await enviarMensagemWhatsApp(telefone, mensagem)

    return NextResponse.json({ ok: true, enviado_whatsapp: enviado })
  } catch (error) {
    console.error('Erro na rota /api/whatsapp/send:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
