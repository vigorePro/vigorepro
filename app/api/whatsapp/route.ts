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

// ==========================================
// MEL HIBRIDA: Rule-Based + Claude Haiku
// Economia estimada: ~86% vs Sonnet puro
// ==========================================

// Envia mensagem pelo WhatsApp via Meta Cloud API
async function enviarMensagem(telefone: string, texto: string) {
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

// Busca cliente cadastrado
async function buscarCliente(telefone: string, estabelecimento_id: string) {
  const formatos = [telefone, `+55${telefone}`, `55${telefone}`]
  for (const fmt of formatos) {
    const { data } = await supabase
      .from('clientes')
      .select('nome, telefone')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('telefone', fmt)
      .maybeSingle()
    if (data) return data
  }
  return null
}

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

// ==========================================
// PASSO 1: Tenta responder com template rule-based (GRATIS, instantaneo)
// Retorna resposta se encontrar match, null caso contrario
// ==========================================
async function tentarRespostaPorTemplate(
  mensagem: string,
  estabelecimento_id: string
): Promise<string | null> {
  const { data: templates } = await supabase
    .from('mel_templates')
    .select('trigger_keywords, response_text, prioridade')
    .eq('estabelecimento_id', estabelecimento_id)
    .eq('ativo', true)
    .order('prioridade', { ascending: false })

  if (!templates || templates.length === 0) return null

  const msg = mensagem.toLowerCase().trim()

  for (const template of templates) {
    const match = template.trigger_keywords.some((keyword: string) => {
      const kw = keyword.toLowerCase().trim()
      // Match exato, inicio da frase, ou mensagem contem a keyword
      return msg === kw || msg.startsWith(kw) || msg.includes(kw)
    })

    if (match) {
      console.log('[MEL] Template match! Respondendo sem IA - economia de custo')
      return template.response_text
    }
  }

  return null
}

// ==========================================
// PASSO 2: Registra metrica de uso
// ==========================================
async function registrarMetrica(
  estabelecimento_id: string,
  usouTemplate: boolean,
  custoUsd: number = 0
) {
  try {
    const hoje = new Date().toISOString().split('T')[0]
    const { data: existente } = await supabase
      .from('mel_metricas')
      .select('id, total_mensagens, respostas_template, respostas_ia, custo_estimado_usd')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('data', hoje)
      .maybeSingle()

    if (existente) {
      await supabase
        .from('mel_metricas')
        .update({
          total_mensagens: existente.total_mensagens + 1,
          respostas_template: existente.respostas_template + (usouTemplate ? 1 : 0),
          respostas_ia: existente.respostas_ia + (usouTemplate ? 0 : 1),
          custo_estimado_usd: existente.custo_estimado_usd + custoUsd,
        })
        .eq('id', existente.id)
    } else {
      await supabase.from('mel_metricas').insert({
        estabelecimento_id,
        data: hoje,
        total_mensagens: 1,
        respostas_template: usouTemplate ? 1 : 0,
        respostas_ia: usouTemplate ? 0 : 1,
        custo_estimado_usd: custoUsd,
      })
    }
  } catch (e) {
    console.error('[MEL] Erro ao registrar metrica:', e)
  }
}

// ==========================================
// PASSO 3: Processa com Claude Haiku (fallback - ~14x mais barato que Sonnet)
// So executa quando nenhum template faz match
// ==========================================
async function processarComIA(
  mensagem: string,
  historico: Array<{ role: string; content: string }>,
  cardapio: string,
  estabelecimento: { nome: string; slug: string; endereco: string },
  telefone: string,
  estabelecimento_id: string,
  clienteExistente: { nome: string; telefone: string } | null
): Promise<string> {
  const systemPrompt = `Voce e a MEL, a atendente virtual da Dolce & Dolce Confeitaria e Padaria.
Voce e simpatica, acolhedora, eficiente e fala de forma informal e proxima, como uma amiga que conhece bem o cardapio.
Voce responde rapidamente, usa emojis com moderacao e sempre agradece o cliente ao final do atendimento.
Ao iniciar um atendimento, apresente-se pelo nome: "Meu nome e MEL e vou continuar seu atendimento :)"

SOBRE O NEGOCIO:
Nome: Dolce & Dolce Confeitaria e Padaria
Endereco: ${estabelecimento.endereco}
Telefone: (43) 3484-0691
WhatsApp: (43) 3484-0691
E-mail: panidolcepaulista@gmail.com
Funcionamento: ate as 19:30h
Entrega: Sim, somente em Ivaipora-PR

TAXA DE ENTREGA:
- Compras ate R$ 50,00: taxa de R$ 10,00
- Compras de R$ 50,00 a R$ 100,00: taxa de R$ 5,00
- Compras acima de R$ 100,00: GRATIS

FORMAS DE PAGAMENTO: PIX (chave: panidolcepaulista@gmail.com), cartao ou dinheiro na retirada/entrega

CATALOGO DE PRODUTOS:
${cardapio}

INFORMACOES ADICIONAIS SOBRE OS PRODUTOS:
- Bolos personalizados sao feitos por encomenda com antecedencia (minimo 1 dia). Coletar: sabor, tamanho em kg, tema/decoracao, nome para escrever, data e hora de retirada ou entrega. Sabores mais pedidos: Laka com morango, Kit Kat, Ninho com uva verde, Abacaxi com coco, Banoffe, Red Velvet.
- Salgados: esfihas, mini hamburguer, cento de salgados mistos, baguete de frango, folhados, nozinhos. Venda por unidade ou por cento.
- Paes: pao com ovo, pao com queijo e bacon, pao com calabresa, pao frances, pao frances integral, pao de forma integral. 40 paes = R$ 21,00.
- Pudim: R$ 33,90 o kg, pesando entre 500g e 700g por unidade. Mini pudim: R$ 6,99 unitario / R$ 6,50 para 100+ unidades.
- Cesta Media de cafe da manha (17 itens): R$ 139,90
- Cesta Grande de cafe da manha (30 itens): R$ 189,00
- Cesta de Aniversario: R$ 129,90

FLUXO DE ATENDIMENTO:
PASSO 1 - Cumprimente e se apresente
PASSO 2 - Colete informacoes do pedido
PASSO 3 - Registre internamente
PASSO 4 - Confirme com o cliente
PASSO 5 - Mensagem de fechamento

TOM: Informal, acolhedor, emojis com moderacao, frases curtas

SITUACOES PARA ESCALAR PARA HUMANO:
- Orcamentos corporativos grandes (100+ unidades)
- Reclamacoes ou insatisfacao
- Cancelamento proximo a data
- Personalizacao muito complexa
- Negociacao de descontos
Use: "Deixa eu chamar um de nossos atendentes :) Um momento!"

INSTRUCOES TECNICAS:
1. Pergunte o nome se nao souber
2. Ajude a escolher itens do cardapio
3. Confirme: itens, quantidades e valor total
4. Pergunte se e delivery ou retirada
5. Se delivery: peca endereco completo com referencia
6. Quando tiver todos os dados, confirme com o cliente
7. Quando o cliente confirmar, responda EXATAMENTE no formato JSON abaixo (sem texto antes ou depois):

PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":29.90,"quantidade":1,"categoria":"nome_da_categoria"}],"valor_total":29.90,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

8. Nao invente produtos que nao estao no cardapio
9. Quando o cliente pedir o cardapio: https://dolcedolce.vigorepro.com.br/cardapio?slug=dolcedolce
10. Mantenha respostas curtas e naturais para WhatsApp

IDENTIFICACAO DO CLIENTE:
- Telefone: ${telefone}
- ${clienteExistente ? `CLIENTE CADASTRADO. Nome: ${clienteExistente.nome}. Cumprimente: "Ola, ${clienteExistente.nome}! Como posso ajudar?"` : `CLIENTE NOVO. Apos se apresentar, peca o nome educadamente.`}
`

  const messages = [
    ...historico.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: mensagem },
  ]

  // USA CLAUDE HAIKU (nao Sonnet) - ~14x mais barato
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
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

      return `Pedido #${numeroPedido} registrado com sucesso! Voce receberá atualizacoes aqui quando seu pedido estiver pronto. Obrigado!`
    } catch (e) {
      console.error('Erro ao criar pedido:', e)
      return 'Houve um erro ao registrar seu pedido. Pode repetir a confirmacao?'
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

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true })
    }

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ ok: true })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]

    if (message.type !== 'text') {
      return NextResponse.json({ ok: true })
    }

    const telefone = message.from
    const mensagem = message.text?.body || ''
    const nomeContato = contact?.profile?.name || ''

    if (!telefone || !mensagem) return NextResponse.json({ ok: true })

    const phoneNumberId = value.metadata?.phone_number_id
    console.log('[MEL] Mensagem de:', telefone, '| Texto:', mensagem.substring(0, 50))

    const slug = 'dolcedolce'

    const { data: estabelecimento } = await supabase
      .from('estabelecimentos')
      .select('id, nome, slug, endereco')
      .eq('slug', slug)
      .single()

    if (!estabelecimento) {
      console.error('[MEL] Estabelecimento nao encontrado:', slug)
      return NextResponse.json({ ok: true })
    }

    // ==========================================
    // LOGICA HIBRIDA MEL
    // 1. Tenta template (GRATIS)
    // 2. Fallback para Claude Haiku (barato)
    // ==========================================

    // Passo 1: Tenta resposta por template
    const respostaTemplate = await tentarRespostaPorTemplate(mensagem, estabelecimento.id)

    if (respostaTemplate) {
      // Resposta por template - custo ZERO
      await salvarMensagem(telefone, estabelecimento.id, 'user', mensagem)
      await salvarMensagem(telefone, estabelecimento.id, 'assistant', respostaTemplate)
      await enviarMensagem(telefone, respostaTemplate)
      await registrarMetrica(estabelecimento.id, true, 0)
      console.log('[MEL] Respondido por template - custo: $0.00')
      return NextResponse.json({ ok: true })
    }

    // Passo 2: Fallback para Claude Haiku
    console.log('[MEL] Sem template match - usando Claude Haiku')

    const [cardapio, historico, clienteExistente] = await Promise.all([
      buscarCardapio(estabelecimento.id),
      buscarHistorico(telefone, estabelecimento.id),
      buscarCliente(telefone, estabelecimento.id),
    ])

    await salvarMensagem(telefone, estabelecimento.id, 'user', mensagem)

    const resposta = await processarComIA(
      mensagem,
      historico,
      cardapio,
      estabelecimento,
      telefone,
      estabelecimento.id,
      clienteExistente
    )

    await salvarMensagem(telefone, estabelecimento.id, 'assistant', resposta)
    await enviarMensagem(telefone, resposta)
    
    // Custo estimado Haiku: ~$0.001 por mensagem
    await registrarMetrica(estabelecimento.id, false, 0.001)
    console.log('[MEL] Respondido por IA (Haiku) - custo estimado: $0.001')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[MEL] Erro no webhook WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
