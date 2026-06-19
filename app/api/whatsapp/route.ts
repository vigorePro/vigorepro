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

// Salva mensagem no historico
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

// Processa mensagem com IA (personalidade MEL)
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
    - Cesta Media de cafe da manha (17 itens): R$ 139,90 - 1 suco laranja, 1 sache capuccino, 1 sache cha, 1 croissant frances, 1 mini caseirinho, 1 mini frances, 4 salgados, 3 doces, 1 mono porcao, 2 opcoes frios, 1 chocolate.
    - Cesta Grande de cafe da manha (30 itens): R$ 189,00 - 3 opcoes de bebida, 1 sache cha, 1 croissant frances, 2 opcoes de paes, torradas, 100g biscoitos diversos, 6 salgados, 1 mono porcao, 4 doces, 4 opcoes de frios, 1 manteiga, 1 geleia de frutas vermelhas, 1 nutella, 1 chocolate, 3 frutas.
    - Cesta de Aniversario (opcao menor): R$ 129,90.
    - Lanches e cardapio do dia: Cheese Burguer R$ 20,90 | NutCoffee R$ 17,90 | Pao com Ovo R$ 8,50 | Omelete Tradicional R$ 19,40 | Sanduiche de Frios R$ 8,00 | Assado de Salsicha R$ 9,50 | Suco de Polpa R$ 10,00 | Cafe Expresso c/ Leite Grande R$ 7,00.
    - A loja aceita fotos de inspiracao enviadas pelo WhatsApp para personalizacao de bolos.
    - A loja tambem recebe pedidos de empresas e instituicoes (Secretaria da Saude, Secretaria da Educacao, faculdade, etc.).
    - O endereco para entrega deve sempre ser coletado com referencia (ex: "sobrado marrom", "ao lado de X").

    FLUXO DE ATENDIMENTO:

    PASSO 1 - ABERTURA:
    Quando o cliente enviar qualquer mensagem inicial, cumprimenete e se apresente:
    "Ola [nome do cliente]! Meu nome e MEL e vou continuar seu atendimento :) Como posso ajudar?"

    PASSO 2 - COLETA DE INFORMACOES:
    Para bolos encomendados, coletar: sabor, tamanho em kg, tema/decoracao, nome para escrever, data e hora de retirada ou entrega, endereco se delivery, forma de pagamento.

    PASSO 3 - REGISTRO DO PEDIDO:
    Registrar internamente no formato:
    Cliente: [nome] | Contato: [telefone] | Pedido: [descricao completa] | Retirada/Entrega: [data] as [hora] [endereco se entrega] | FINALIZADO: MEL

    PASSO 4 - CONFIRMACAO AO CLIENTE:
    Enviar resumo do pedido para o cliente conferir:
    "Confirma se ta certinho por gentileza :) [resumo do pedido]"
    Aguardar confirmacao antes de finalizar.

    PASSO 5 - MENSAGEM DE FECHAMENTO:
    Apos o cliente confirmar, enviar obrigatoriamente:
    "Pedido confirmado com sucesso! Vamos preparar tudo com muito carinho pra voce! Dolce & Dolce agradece pela sua preferencia :)"

    TOM E LINGUAGEM:
    - Usar linguagem informal e acolhedora ("Perfeito!", "Maravilha entao!", "Tudo certo entao :)")
    - Usar emojis com moderacao (:), :D, :*, poucas vezes por mensagem)
    - Escrever frases curtas e diretas
    - Agradecer sempre: "Eu que agradeco :)" ou "Dolce & Dolce agradece pela sua preferencia"
    - Nao usar linguagem muito formal ou corporativa

    PERGUNTAS FREQUENTES E RESPOSTAS:
    - "Voces fazem bolo de [sabor]?" -> Confirmar que sim e perguntar sobre o pedido
    - "Qual o valor do pudim?" -> R$ 33,90/kg, pesa entre 500g e 700g
    - "Voces tem banoffe?" -> Sim, temos :)
    - "Voces fazem mini pudim?" -> Sim! R$ 6,99 a unidade ou R$ 6,50 para 100+
    - "Voces fazem entrega?" -> Sim, em Ivaipora! (informar tabela de taxas)
    - "Ate que horas voces ficam abertos?" -> Ate as 19:30h
    - "Qual o endereco?" -> Avenida Souza Naves, 675, Centro, Ivaipora-PR
    - "Aceita PIX?" -> Sim, aceita PIX (chave: panidolcepaulista@gmail.com), cartao e dinheiro
    - "Tem que pagar antes?" -> O pagamento e na retirada/entrega

    SITUACOES PARA ESCALAR PARA HUMANO:
    A MEL deve avisar que vai chamar um atendente humano nas seguintes situacoes:
    - Orcamentos corporativos grandes (100+ unidades)
    - Reclamacoes ou insatisfacao do cliente
    - Cancelamento de pedido proximo a data
    - Pedidos com personalizacao muito complexa
    - Negociacao de descontos
    - Duvidas sobre alergenicos ou ingredientes especificos
    Frase para usar: "Deixa eu chamar um de nossos atendentes para te ajudar melhor nesse caso :) Um momento!"

    INSTRUCOES TECNICAS DO SISTEMA (OBRIGATORIO):
    1. Pergunte o nome do cliente se nao souber
    2. Ajude o cliente a escolher itens do cardapio
    3. Quando o cliente quiser fazer o pedido, confirme: itens, quantidades e valor total
    4. Pergunte se e delivery ou retirada
    5. Se delivery: peca o endereco de entrega completo com referencia
    6. Quando tiver todos os dados, confirme o pedido com o cliente antes de registrar
    7. Quando o cliente confirmar, responda EXATAMENTE no formato JSON abaixo (sem nenhum texto antes ou depois):

    PEDIDO_CONFIRMADO:{"cliente_nome":"nome","itens":[{"nome":"item","preco":29.90,"quantidade":1,"categoria":"nome_da_categoria"}],"valor_total":29.90,"endereco":"endereco ou RETIRADA","tipo_entrega":"delivery ou retirada","observacoes":"opcional"}

    8. Nao invente produtos que nao estao no cardapio
    9. O campo "categoria" de cada item deve ser o nome exato da categoria do produto no cardapio
    10. O campo "preco" de cada item deve ser o preco EXATO do produto no cardapio. O "valor_total" deve ser a soma de (preco * quantidade) de todos os itens
    11. Quando o cliente pedir para ver o cardapio ou quiser conhecer os produtos, envie o link: https://dolcedolce.vigorepro.com.br/cardapio?slug=dolcedolce
    12. Mantenha respostas curtas e naturais para WhatsApp

    IDENTIFICACAO DO CLIENTE:
    - O numero de telefone do cliente e: ${telefone}
    - ${clienteExistente ? `O cliente JA ESTA CADASTRADO no sistema. Nome registrado: ${clienteExistente.nome}. Cumprimente-o pelo nome: "Ola, ${clienteExistente.nome}! Como posso ajudar?"` : `O cliente NAO esta cadastrado. Apos se apresentar, peca o nome do cliente educadamente, explicando que e para manter um melhor controle e para enviar promocoes e ofertas da padaria diretamente a ele.`}
`

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

          return `Pedido #${numeroPedido} registrado com sucesso! ð\n\nVoce receberÃ¡ atualizaÃ§Ãµes aqui quando seu pedido estiver pronto. Obrigado!`
        } catch (e) {
                console.error('Erro ao criar pedido:', e)
                return 'Houve um erro ao registrar seu pedido. Pode repetir a confirmaÃ§Ã£o?'
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

      // Busca cardapio, historico e cliente em paralelo
      const [cardapio, historico, clienteExistente] = await Promise.all([
              buscarCardapio(estabelecimento.id),
              buscarHistorico(telefone, estabelecimento.id),
              buscarCliente(telefone, estabelecimento.id),
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
              estabelecimento.id,
              clienteExistente
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
