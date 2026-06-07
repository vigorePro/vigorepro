import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!
const INSTANCE_NAME = 'vigorepro-wa'

// Envia mensagem pelo WhatsApp via Evolution API
async function enviarMensagem(telefone: string, texto: string) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: telefone,
      text: texto,
    }),
  })
  return res.ok
}

// Busca historico de conversa do cliente no Supabase
async function buscarHistorico(telefone: string, estabelecimento_id: string) {
  const { data } = await supabase
    .from('conversas_ia')
    .select('role, content')
    .eq('telefone', telefone)
    .eq('estabelecimento_id', estabelecimento_id)
    .order('criado_em', { ascending: true })
    .limit(20)
  return data || []
}

// Salva mensagem no historico
async function salvarMensagem(telefone: string, estabelecimento_id: string, role: 'user' | 'assistant', content: string) {
  await supabase.from('conversas_ia').insert({
    telefone,
    estabelecimento_id,
    role,
    content,
  })
}

// Busca cardapio do estabelecimento
async function buscarCardapio(estabelecimento_id: string) {
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nome')
    .eq('estabelecimento_id', estabelecimento_id)
    .order('ordem')

  const { data: produtos } = await supabase
    .from('produtos')
    .select('nome, descricao, preco, categoria_id, disponivel')
    .eq('estabelecimento_id', estabelecimento_id)
    .eq('disponivel', true)

  if (!categorias || !produtos) return 'Cardapio indisponivel no momento.'

  let texto = ''
  for (const cat of categorias) {
    const itens = produtos.filter((p) => p.categoria_id === cat.id)
    if (itens.length === 0) continue
    texto += `\n*${cat.nome}*\n`
    for (const item of itens) {
      texto += `  - ${item.nome}: R$ ${item.preco.toFixed(2).replace('.', ',')}`
      if (item.descricao) texto += ` (${item.descricao})`
      texto += '\n'
    }
  }
  return texto.trim()
}

// Cria pedido no Supabase
async function criarPedido(dados: {
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string
  itens: Array<{ nome: string; preco: number; quantidade: number }>
  valor_total: number
  endereco: string
  tipo_entrega: string
  observacoes?: string
}) {
  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      ...dados,
      status: 'em_producao',
      criado_em: new Date().toISOString(),
    })
    .select('numero_pedido')
    .single()

  if (error) throw error
  return data?.numero_pedido
}

// Processa mensagem com Claude AI
async function processarComIA(
  mensagem: string,
  historico: Array<{ role: string; content: string }>,
  cardapio: string,
  estabelecimento: { nome: string; slug: string; endereco: string },
  telefone: string,
  estabelecimento_id: string
): Promise<string> {
  const systemPrompt = `Voce e o assistente de atendimento do ${estabelecimento.nome}, um estabelecimento de food service.
Seu trabalho e atender clientes pelo WhatsApp, tirar pedidos e registra-los no sistema.

CARDAPIO ATUAL:
${cardapio}

INSTRUCOES:
1. Seja cordial, rapido e objetivo
2. Pergunte o nome do cliente se nao souber
3. Ajude o cliente a escolher itens do cardapio
4. Quando o cliente quiser fazer o pedido, confirme: itens, quantidades e valor total
5. Pergunte se e delivery ou retirada
6. Se delivery: peca o endereco de entrega
7. Quando tiver todos os dados, confirme o pedido com o cliente antes de registrar
8. Quando o cliente confirmar, responda EXATAMENTE no formato JSON abaixo (sem nenhum texto antes ou depois):

PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":0.00,"quantidade":1}],"valor_total":0.00,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

9. Nao invente produtos que nao estao no cardapio
10. Informacoes do estabelecimento: ${estabelecimento.endereco}
11. Formas de pagamento: somente na entrega (dinheiro ou pix)
12. Mantenha respostas curtas e naturais para WhatsApp`

  const messages = [
    ...historico.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: mensagem },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const resposta = response.content[0].type === 'text' ? response.content[0].text : ''

  // Verifica se a IA quer registrar um pedido
  if (resposta.includes('PEDIDO_CONFIRMADO:')) {
    try {
      const jsonStr = resposta.replace('PEDIDO_CONFIRMADO:', '').trim()
      const dados = JSON.parse(jsonStr)
      const numeroPedido = await criarPedido({
        estabelecimento_id,
        cliente_nome: dados.cliente_nome,
        cliente_telefone: telefone,
        itens: dados.itens,
        valor_total: dados.valor_total,
        endereco: dados.endereco,
        tipo_entrega: dados.tipo_entrega,
        observacoes: dados.observacoes || '',
      })
      return `Pedido #${numeroPedido} registrado com sucesso! 🎉\n\nVoce receberá atualizações aqui quando seu pedido estiver pronto. Obrigado!`
    } catch (e) {
      console.error('Erro ao criar pedido:', e)
      return 'Houve um erro ao registrar seu pedido. Pode repetir a confirmação?'
    }
  }

  return resposta
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Estrutura do webhook da Evolution API
    const event = body.event
    const data = body.data

    // Ignorar mensagens que nao sao de texto ou sao do proprio bot
    if (event !== 'messages.upsert') return NextResponse.json({ ok: true })
    if (!data?.message?.conversation && !data?.message?.extendedTextMessage?.text) {
      return NextResponse.json({ ok: true })
    }
    if (data.key?.fromMe) return NextResponse.json({ ok: true })

    const telefone = data.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
    const mensagem = data.message?.conversation || data.message?.extendedTextMessage?.text || ''

    if (!telefone || !mensagem) return NextResponse.json({ ok: true })

    // Detecta o estabelecimento pelo numero da instancia
    // Por enquanto busca por slug 'dolcedolce' (futuro: mapear instancia -> slug)
    const instanceName = body.instance || INSTANCE_NAME
    const slug = instanceName.replace('vigorepro-wa-', '') || 'dolcedolce'

    const { data: estabelecimento } = await supabase
      .from('estabelecimentos')
      .select('id, nome, slug, endereco')
      .eq('slug', slug)
      .single()

    if (!estabelecimento) {
      console.error('Estabelecimento nao encontrado para slug:', slug)
      return NextResponse.json({ ok: true })
    }

    // Busca cardapio e historico em paralelo
    const [cardapio, historico] = await Promise.all([
      buscarCardapio(estabelecimento.id),
      buscarHistorico(telefone, estabelecimento.id),
    ])

    // Salva mensagem do usuario
    await salvarMensagem(telefone, estabelecimento.id, 'user', mensagem)

    // Processa com IA
    const resposta = await processarComIA(
      mensagem,
      historico,
      cardapio,
      estabelecimento,
      telefone,
      estabelecimento.id
    )

    // Salva resposta da IA
    await salvarMensagem(telefone, estabelecimento.id, 'assistant', resposta)

    // Envia resposta pelo WhatsApp
    await enviarMensagem(telefone, resposta)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'VigorePro WhatsApp AI Webhook' })
}
