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
// MEL HIBRIDA: Rule-Based + Claude Haiku + CRM
// ==========================================

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

// CRM: Busca cliente pelo telefone
async function buscarClienteCRM(telefone: string, estabelecimento_id: string) {
  const formatos = [
    telefone,
    `+55${telefone}`,
    `55${telefone}`,
    telefone.replace(/^55/, ''),
    telefone.replace(/^\+55/, ''),
  ]
  for (const fmt of formatos) {
    const { data } = await supabase
      .from('mel_clientes')
      .select('id, nome, email, telefone, total_pedidos, valor_total_gasto, preferencias')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('telefone', fmt)
      .maybeSingle()
    if (data) return data
  }
  return null
}

// CRM: Cria ou atualiza cliente
async function salvarClienteCRM(
  telefone: string,
  estabelecimento_id: string,
  nome: string,
  email?: string
) {
  const { data, error } = await supabase
    .from('mel_clientes')
    .upsert({
      telefone,
      estabelecimento_id,
      nome,
      email: email || null,
      ultimo_contato: new Date().toISOString(),
      status_cadastro: 'completo',
    }, { onConflict: 'estabelecimento_id,telefone' })
    .select('id, nome')
    .single()
  if (error) {
    console.error('[CRM] Erro ao salvar cliente:', error)
    return null
  }
  console.log('[CRM] Cliente salvo:', nome, telefone)
  return data
}

// CRM: Atualiza ultimo contato
async function atualizarUltimoContato(telefone: string, estabelecimento_id: string) {
  await supabase
    .from('mel_clientes')
    .update({ ultimo_contato: new Date().toISOString() })
    .eq('estabelecimento_id', estabelecimento_id)
    .eq('telefone', telefone)
}

async function salvarMensagem(telefone: string, estabelecimento_id: string, role: 'user' | 'assistant', content: string) {
  await supabase.from('conversas_ia').insert({ telefone, estabelecimento_id, role, content })
}

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

// PASSO 1: Template rule-based (GRATIS)
async function tentarRespostaPorTemplate(mensagem: string, estabelecimento_id: string): Promise<string | null> {
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
      return msg === kw || msg.startsWith(kw) || msg.includes(kw)
    })
    if (match) {
      console.log('[MEL] Template match! Respondendo sem IA')
      return template.response_text
    }
  }
  return null
}

// PASSO 2: Registra metrica
async function registrarMetrica(estabelecimento_id: string, usouTemplate: boolean, custoUsd: number = 0) {
  try {
    const hoje = new Date().toISOString().split('T')[0]
    const { data: existente } = await supabase
      .from('mel_metricas')
      .select('id, total_mensagens, respostas_template, respostas_ia, custo_estimado_usd')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('data', hoje)
      .maybeSingle()
    if (existente) {
      await supabase.from('mel_metricas').update({
        total_mensagens: existente.total_mensagens + 1,
        respostas_template: existente.respostas_template + (usouTemplate ? 1 : 0),
        respostas_ia: existente.respostas_ia + (usouTemplate ? 0 : 1),
        custo_estimado_usd: existente.custo_estimado_usd + custoUsd,
      }).eq('id', existente.id)
    } else {
      await supabase.from('mel_metricas').insert({
        estabelecimento_id, data: hoje, total_mensagens: 1,
        respostas_template: usouTemplate ? 1 : 0,
        respostas_ia: usouTemplate ? 0 : 1,
        custo_estimado_usd: custoUsd,
      })
    }
  } catch (e) {
    console.error('[MEL] Erro ao registrar metrica:', e)
  }
}

// PASSO 3: Claude Haiku com CRM integrado
async function processarComIA(
  mensagem: string,
  historico: Array<{ role: string; content: string }>,
  cardapio: string,
  estabelecimento: { nome: string; slug: string; endereco: string },
  telefone: string,
  estabelecimento_id: string,
  clienteCRM: { id?: string; nome?: string; total_pedidos?: number; valor_total_gasto?: number; preferencias?: string } | null
): Promise<string> {

  let infoCRM = ''
  if (clienteCRM?.nome) {
    const pedidosStr = clienteCRM.total_pedidos && clienteCRM.total_pedidos > 0
      ? `Ela ja fez ${clienteCRM.total_pedidos} pedido(s). Valor total gasto: R$ ${(clienteCRM.valor_total_gasto || 0).toFixed(2)}.`
      : 'E a primeira vez que ela pede.'
    infoCRM = `CLIENTE CADASTRADA NO CRM:
Nome: ${clienteCRM.nome}
${pedidosStr}
${clienteCRM.preferencias ? `Preferencias: ${clienteCRM.preferencias}` : ''}
IMPORTANTE: Chame pelo nome. NAO peca o nome novamente.`
  } else {
    infoCRM = `CLIENTE NOVA - nao cadastrada no CRM.
Apos se apresentar, peca o nome educadamente: "Como posso te chamar? :)"
Quando ela informar o nome, use na conversa e inclua ao final da sua resposta (sera removido antes de enviar):
SALVAR_CLIENTE:{"nome":"Nome Informado"}`
  }

  const systemPrompt = `Voce e a MEL, atendente virtual da Dolce & Dolce Confeitaria e Padaria.
Simpatica, acolhedora, informal e proxima. Frases curtas. Use ":)" em vez de muitos emojis.
Ao iniciar: "Meu nome e MEL e vou continuar seu atendimento :)"

${infoCRM}

SOBRE O NEGOCIO:
Endereco: ${estabelecimento.endereco}
Funcionamento: ate as 19:30h | Entrega apenas em Ivaipora-PR
Contato: (43) 3484-0691 | panidolcepaulista@gmail.com

TAXA DE ENTREGA:
- Ate R$ 50: taxa R$ 10
- R$ 50 a R$ 100: taxa R$ 5
- Acima R$ 100: GRATIS

PAGAMENTO: PIX (panidolcepaulista@gmail.com), cartao ou dinheiro

CARDAPIO:
${cardapio}

PRODUTOS ESPECIAIS:
- Bolos: encomenda com 1 dia de antecedencia. Coletar: sabor, tamanho kg, tema, nome, data/hora.
- Sabores populares: Laka+morango, Kit Kat, Ninho+uva verde, Abacaxi+coco, Banoffe, Red Velvet.
- 40 paes = R$ 21,00 | Mini pudim R$ 6,99

FLUXO: Cumprimenta -> Coleta pedido -> Confirma -> Finaliza

ESCALAR PARA HUMANO: orcamentos 100+ unidades, reclamacoes, descontos.
Use: "Deixa eu chamar um atendente :) Um momento!"

CONFIRMAR PEDIDO (formato exato, nada antes ou depois):
PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":29.90,"quantidade":1,"categoria":"cat"}],"valor_total":29.90,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

Cardapio online: https://dolcedolce.vigorepro.com.br/cardapio?slug=dolcedolce`

  const messages = [
    ...historico.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: mensagem },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  let resposta = response.content[0].type === 'text' ? response.content[0].text : ''

  // Salva cliente novo automaticamente quando IA coleta o nome
  if (resposta.includes('SALVAR_CLIENTE:')) {
    try {
      const match = resposta.match(/SALVAR_CLIENTE:({[^}]+})/)
      if (match) {
        const dados = JSON.parse(match[1])
        if (dados.nome) {
          await salvarClienteCRM(telefone, estabelecimento_id, dados.nome)
          console.log('[CRM] Novo cliente salvo:', dados.nome)
        }
      }
    } catch (e) {
      console.error('[CRM] Erro ao salvar cliente:', e)
    }
    resposta = resposta.replace(/SALVAR_CLIENTE:{[^}]+}/, '').trim()
    return resposta
  }

  // Registra pedido confirmado
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
        // Incrementa stats no mel_clientes
        const clienteAtual = await buscarClienteCRM(telefone, estabelecimento_id)
        if (clienteAtual?.id) {
          await supabase.from('mel_clientes').update({
            total_pedidos: (clienteAtual.total_pedidos || 0) + 1,
            valor_total_gasto: (clienteAtual.valor_total_gasto || 0) + dados.valor_total,
            ultimo_contato: new Date().toISOString(),
          }).eq('id', clienteAtual.id)
        }
      } catch (crmErr) {
        console.error('Erro CRM pos-pedido:', crmErr)
      }
      const nomeCliente = clienteCRM?.nome || dados.cliente_nome || 'cliente'
      return `Pedido #${numeroPedido} registrado! Voce receberá uma mensagem quando ficar pronto. Obrigado, ${nomeCliente}! :)`
    } catch (e) {
      console.error('Erro ao criar pedido:', e)
      return 'Houve um erro ao registrar seu pedido. Pode repetir a confirmacao?'
    }
  }

  return resposta
}

// GET - Verificacao do webhook
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

// POST - Recebe mensagens
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.object !== 'whatsapp_business_account') return NextResponse.json({ ok: true })

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    if (!value?.messages) return NextResponse.json({ ok: true })

    const message = value.messages[0]
    const contact = value.contacts?.[0]
    if (message.type !== 'text') return NextResponse.json({ ok: true })

    const telefone = message.from
    const mensagem = message.text?.body || ''
    const nomeContato = contact?.profile?.name || ''
    if (!telefone || !mensagem) return NextResponse.json({ ok: true })

    console.log('[MEL] Mensagem de:', telefone, '| Texto:', mensagem.substring(0, 50))

    const { data: estabelecimento } = await supabase
      .from('estabelecimentos')
      .select('id, nome, slug, endereco')
      .eq('slug', 'dolcedolce')
      .single()

    if (!estabelecimento) {
      console.error('[MEL] Estabelecimento nao encontrado')
      return NextResponse.json({ ok: true })
    }

    // ==========================================
    // CRM: Identifica ou cria cliente pelo numero
    // ==========================================
    let clienteCRM = await buscarClienteCRM(telefone, estabelecimento.id)

    if (clienteCRM) {
      await atualizarUltimoContato(telefone, estabelecimento.id)
      console.log(`[CRM] Cliente identificado: ${clienteCRM.nome}`)
    } else if (nomeContato && nomeContato.trim() !== '') {
      // Cadastra automaticamente pelo nome do perfil WhatsApp
      await salvarClienteCRM(telefone, estabelecimento.id, nomeContato)
      clienteCRM = await buscarClienteCRM(telefone, estabelecimento.id)
      console.log(`[CRM] Novo cliente cadastrado pelo perfil WhatsApp: ${nomeContato}`)
    } else {
      console.log(`[CRM] Cliente novo sem nome: ${telefone}`)
    }

    // PASSO 1: Template (GRATIS)
    const respostaTemplate = await tentarRespostaPorTemplate(mensagem, estabelecimento.id)
    if (respostaTemplate) {
      let respostaFinal = respostaTemplate
      // Personaliza saudacao com nome do cliente cadastrado
      if (clienteCRM?.nome) {
        respostaFinal = respostaTemplate
          .replace('Ola! Tudo bem sim :)', `Ola, ${clienteCRM.nome}! Tudo bem sim :)`)
          .replace('Ola!', `Ola, ${clienteCRM.nome}!`)
      }
      await salvarMensagem(telefone, estabelecimento.id, 'user', mensagem)
      await salvarMensagem(telefone, estabelecimento.id, 'assistant', respostaFinal)
      await enviarMensagem(telefone, respostaFinal)
      await registrarMetrica(estabelecimento.id, true, 0)
      console.log('[MEL] Template - custo: $0.00')
      return NextResponse.json({ ok: true })
    }

    // PASSO 2: Claude Haiku
    console.log('[MEL] Sem template - usando Claude Haiku')
    const [cardapio, historico] = await Promise.all([
      buscarCardapio(estabelecimento.id),
      buscarHistorico(telefone, estabelecimento.id),
    ])

    await salvarMensagem(telefone, estabelecimento.id, 'user', mensagem)

    const resposta = await processarComIA(
      mensagem, historico, cardapio, estabelecimento,
      telefone, estabelecimento.id, clienteCRM
    )

    await salvarMensagem(telefone, estabelecimento.id, 'assistant', resposta)
    await enviarMensagem(telefone, resposta)
    await registrarMetrica(estabelecimento.id, false, 0.001)
    console.log('[MEL] Haiku - custo estimado: $0.001')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[MEL] Erro no webhook WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
