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

// Busca historico de conversa do cliente
async function buscarHistorico(sessionId: string, estabelecimento_id: string) {
  const { data } = await supabase
    .from('conversas_ia')
    .select('role, content')
    .eq('telefone', sessionId)
    .eq('estabelecimento_id', estabelecimento_id)
    .order('criado_em', { ascending: true })
    .limit(20)
  return data || []
}

// Salva mensagem no historico
async function salvarMensagem(sessionId: string, estabelecimento_id: string, role: 'user' | 'assistant', content: string) {
  await supabase.from('conversas_ia').insert({
    telefone: sessionId,
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

// CRM: registra/atualiza cliente, incrementa metricas e grava no historico
async function registrarCRM(dados: {
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string
  itens: Array<{ nome: string; preco: number; quantidade: number }>
  valor_total: number
}) {
  // Upsert do cliente (chave: restaurant_id + telefone)
  const { data: cliente, error: cliErr } = await supabase
    .from('clientes')
    .upsert(
      {
        restaurant_id: dados.estabelecimento_id,
        telefone: dados.cliente_telefone,
        nome: dados.cliente_nome,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id,telefone' }
    )
    .select('id')
    .single()

  if (cliErr || !cliente) {
    console.error('Erro ao registrar CRM (upsert cliente):', cliErr)
    return
  }

  // Incrementa metricas (total de pedidos e valor gasto)
  await supabase.rpc('incrementar_metricas_cliente', {
    p_cliente_id: cliente.id,
    p_valor: dados.valor_total,
  })

  // Grava no historico de pedidos do CRM
  await supabase.from('pedidos_historico').insert({
    cliente_id: cliente.id,
    restaurant_id: dados.estabelecimento_id,
    items: dados.itens,
    valor_total: dados.valor_total,
    status: 'criado',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { mensagem, slug, sessionId } = await req.json()

    if (!mensagem || !slug || !sessionId) {
      return NextResponse.json({ error: 'Campos obrigatorios: mensagem, slug, sessionId' }, { status: 400 })
    }

    // Busca estabelecimento pelo slug
    const { data: estabelecimento } = await supabase
      .from('estabelecimentos')
      .select('id, nome, slug, endereco')
      .eq('slug', slug)
      .single()

    if (!estabelecimento) {
      return NextResponse.json({ error: 'Estabelecimento nao encontrado' }, { status: 404 })
    }

    // Busca cardapio e historico em paralelo
    const [cardapio, historico] = await Promise.all([
      buscarCardapio(estabelecimento.id),
      buscarHistorico(sessionId, estabelecimento.id),
    ])

    // Salva mensagem do usuario
    await salvarMensagem(sessionId, estabelecimento.id, 'user', mensagem)

    // System prompt com cardapio
    const systemPrompt = `Voce e o assistente de atendimento do ${estabelecimento.nome}, um estabelecimento de food service.
Seu trabalho e atender clientes, tirar pedidos e registra-los no sistema.

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
8. Quando o cliente confirmar, responda EXATAMENTE no formato abaixo (sem nenhum texto antes ou depois):

PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":0.00,"quantidade":1}],"valor_total":0.00,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

9. Nao invente produtos que nao estao no cardapio
10. Informacoes: ${estabelecimento.endereco}
11. Pagamento: somente na entrega (dinheiro ou pix)
12. Mantenha respostas curtas e naturais`

    const messages = [
      ...historico.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: mensagem },
    ]

    // Chama Claude AI
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const resposta = response.content[0].type === 'text' ? response.content[0].text : ''

    // Verifica se e um pedido confirmado
    if (resposta.includes('PEDIDO_CONFIRMADO:')) {
      try {
        const jsonStr = resposta.replace('PEDIDO_CONFIRMADO:', '').trim()
        const dados = JSON.parse(jsonStr)
        const numeroPedido = await criarPedido({
          estabelecimento_id: estabelecimento.id,
          cliente_nome: dados.cliente_nome,
          cliente_telefone: sessionId,
          itens: dados.itens,
          valor_total: dados.valor_total,
          endereco: dados.endereco,
          tipo_entrega: dados.tipo_entrega,
          observacoes: dados.observacoes || '',
        })

        // CRM (nao bloqueia o fluxo do pedido em caso de erro)
        try {
          await registrarCRM({
            estabelecimento_id: estabelecimento.id,
            cliente_nome: dados.cliente_nome,
            cliente_telefone: sessionId,
            itens: dados.itens,
            valor_total: dados.valor_total,
          })
        } catch (crmErr) {
          console.error('Erro ao registrar CRM:', crmErr)
        }

        const mensagemFinal = `Pedido #${numeroPedido} registrado com sucesso! Voce pode acompanhar pelo site. Obrigado!`
        await salvarMensagem(sessionId, estabelecimento.id, 'assistant', mensagemFinal)

        return NextResponse.json({
          resposta: mensagemFinal,
          pedidoCriado: true,
          numeroPedido,
        })
      } catch (e) {
        const erro = 'Houve um erro ao registrar seu pedido. Pode repetir a confirmacao?'
        await salvarMensagem(sessionId, estabelecimento.id, 'assistant', erro)
        return NextResponse.json({ resposta: erro, pedidoCriado: false })
      }
    }

    // Resposta normal
    await salvarMensagem(sessionId, estabelecimento.id, 'assistant', resposta)
    return NextResponse.json({ resposta, pedidoCriado: false })

  } catch (error) {
    console.error('Erro no chat IA:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
