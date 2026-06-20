import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!

// Mapa: status do pedido -> notif_id
const STATUS_TO_NOTIF: Record<string, string> = {
  aguardando: 'pedido_feito',
  preparo: 'pedido_confirmado',
  pronto: 'pedido_pronto',
  saiu: 'pedido_saiu',
  entregue: 'pedido_entregue',
  cancelado: 'pedido_cancelado',
}

async function enviarWhatsApp(telefone: string, texto: string) {
  if (!telefone || telefone.startsWith('web_') || telefone.startsWith('chat_') || telefone.startsWith('teste_')) return false
  const url = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: telefone, type: 'text', text: { body: texto } })
  })
  return res.ok
}

function interpolar(template: string, vars: Record<string, string>): string {
  return template.replace(/\*\*\*([A-Z_]+)\*\*\*/g, (_, key) => vars[key] || '')
    .replace(/\*\*([A-Z_]+)\*\*/g, (_, key) => vars[key] || '')
}

// POST /api/notificacoes/disparar
export async function POST(req: NextRequest) {
  const { estabelecimento_id, pedido_id, status } = await req.json()
  if (!estabelecimento_id || !status) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const notif_id = STATUS_TO_NOTIF[status]
  if (!notif_id) return NextResponse.json({ ok: false, reason: 'no notif for status ' + status })

  // Buscar notificacao configurada
  const { data: notif } = await supabase
    .from('notificacoes_automaticas')
    .select('*')
    .eq('estabelecimento_id', estabelecimento_id)
    .eq('notif_id', notif_id)
    .eq('ativo', true)
    .single()

  if (!notif) return NextResponse.json({ ok: false, reason: 'notif not found or inactive' })

  // Buscar dados do pedido
  let pedido: Record<string, string> = {}
  if (pedido_id) {
    const { data: p } = await supabase
      .from('pedidos')
      .select('*, estabelecimentos(nome, whatsapp, minutos_delivery)')
      .eq('id', pedido_id)
      .single()
    if (p) {
      pedido = {
        CLIENTE_NOME: p.cliente_nome || '',
        VENDA_NUMERO: String(p.numero_pedido || ''),
        VENDA_TOTAIS: 'R$ ' + (Number(p.total || 0).toFixed(2)).replace('.', ','),
        VENDA_ENTREGA: p.cliente_endereco || 'Retirada no local',
        VENDA_PAGAMENTO: p.forma_pagamento || '',
        VENDA_PRODUTOS: (p.itens || []).map((i: { nome: string; quantidade: number }) => i.quantidade + 'x ' + i.nome).join(', '),
        VENDA_MOTIVO_CANCELAMENTO: p.motivo_cancelamento || 'Pedido cancelado pelo estabelecimento',
        VENDA_LINK_AVALIACAO: '',
        MEU_NOME_FANTASIA: p.estabelecimentos?.nome || '',
        MEU_WHATSAPP: p.estabelecimentos?.whatsapp || '',
        MEU_MINUTOS_DELIVERY: p.estabelecimentos?.minutos_delivery ? p.estabelecimentos.minutos_delivery + ' minutos' : '',
        MEU_TELEFONE: p.estabelecimentos?.whatsapp || '',
        MEU_EMAIL: '',
        MEU_LINK_CONSULTA: '',
      }
      // Enviar para o telefone do cliente
      if (p.cliente_telefone) {
        const msg = interpolar(notif.mensagem, pedido)
        await enviarWhatsApp(p.cliente_telefone, msg)
        // Registrar no historico
        await supabase.from('conversas_ia').insert({
          estabelecimento_id,
          telefone: p.cliente_telefone,
          role: 'assistant',
          content: '[Notificacao automatica] ' + msg,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, notif_id })
}
