import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { criarPedido, registrarCRM } from '@/lib/crm'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!

// Envia mensagem pelo WhatsApp via Meta Cloud API
async function enviarMensagem(telefone: string, texto: string) {
  const url = `https://graph.facebook.com/v25.0/${WHATSAPPh_PHONE_NUMBER_ID}/messages`
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
    console.error('Erro ao enviar mensagem WhatsApp:', err)
  }
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
      texto += ` - ${item.nome}: R$ ${item.preco.toFixed(2).replace('.', ',')}`
      if (item.descricao) texto += ` (${item.descricao})`
      texto += '\n'
    }
  }
  return texto.trim()
}

// Cria pedido no Supabase
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

PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":29.90,"quantidade":1,"categoria":"nome_da_categoria"}],"valor_total":29.90,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

9. Nao invente produtos que nao estao no cardapio
10. O campo "categoria" de cada item deve ser o nome exato da categoria do produto no cardapio
11. O campo "preco" de cada item deve ser o preco EXATO do produto no cardapio. O "valor_total" deve ser a soma de (preco * quantidade) de todos os itens
12. Informacoes do estabelecimento: ${estabelecimento.endereco}
13. Formas de pagamento: somente na entrega (dinheiro ou pix)
14. Mantenha respostas curtas e naturais para WhatsApp`

  const messages = [
    ...historico.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: mensagem },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
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

      // CRM (nao bloqueia o fluxo do pedido em caso de erro)
      try {
        await registrarCRM({
          estabelecimento_id,
          cliente_nome: dados.cliente_nome,
          cliente_telefone: telefone,
          itens: dados.itens,
          valor_total: dados.valor_total,
        })
      } catch (crmErr) {
        console.error('Erro ao registrar CRM:', crmErr)
      }

      return `Pedido #${numeroPedido} registrado com sucesso! 🎉\n\nVoce receberá atualizações aqui quando seu pedido estiver pronto. Obrigado!`
    } catch (e) {
      console.error('Erro ao criar pedido:', e)
      return 'Houve um erro ao registrar seu pedido. Pode repetir a confirmação?'
    }
  }

  return resposta
}

// GET - Verificacao do webhook pela Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso pela Meta')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Token invalido' }, { status: 403 })
}

// POST - Recebe mensagens da Meta Cloud API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Estrutura do webhook da Meta Cloud API
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true })
    }

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    // Confirma recebimento imediatamente (Meta exige resposta rapida)
    if (!value?.messages) {
      return NextResponse.json({ ok: true })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]

    // Apenas processar mensagens de texto
    if (message.type !== 'text') {
      return NextResponse.json({ ok: true })
    }

    const telefone = message.from
    const mensagem = message.text?.body || ''
    const nomeContato = contact?.profile?.name || ''

    if (!telefone || !mensagem) return NextResponse.json({ ok: true })

    // Detecta o estabelecimento pelo numero de telefone que recebeu a mensagem
    // O phone_number_id no value indica qual numero recebeu
    const phoneNumberId = value.metadata?.phone_number_id
    console.log('Mensagem recebida no phone_number_id:', phoneNumberId, 'de:', telefone)

    // Por enquanto usa slug fixo 'dolcedolce' - futuro: mapear phone_number_id -> slug
    const slug = 'dolcedolce'

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
