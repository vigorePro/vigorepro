import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

const API_KEY = process.env.PEDIDO_EXTERNO_API_KEY || 'VIGOREPRO_DOLCEDOLCE_API_KEY_2026'

interface ItemExterno {
    nome: string
    quantidade: number
    preco_unitario: number
    categoria?: string
    observacao?: string
}

interface PedidoExterno {
    slug: string
    cliente: {
      nome: string
      telefone: string
      endereco?: string
    }
    itens: ItemExterno[]
    valor_total: number
    tipo_entrega: 'delivery' | 'retirada'
    forma_pagamento?: string
    data_retirada?: string
    observacao_geral?: string
}

export async function POST(req: NextRequest) {
    try {
          // 1. Validar autenticacao
      const authHeader = req.headers.get('authorization')
          if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
                  return NextResponse.json(
                    { success: false, erro: 'Nao autorizado. API Key invalida.' },
                    { status: 401 }
                          )
          }

      // 2. Ler body
      const body: PedidoExterno = await req.json()

      // 3. Validar campos obrigatorios
      if (!body.slug) {
              return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: slug' }, { status: 400 })
      }
          if (!body.cliente?.nome) {
                  return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: cliente.nome' }, { status: 400 })
          }
          if (!body.cliente?.telefone) {
                  return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: cliente.telefone' }, { status: 400 })
          }
          if (!body.itens || body.itens.length === 0) {
                  return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: itens (array nao pode ser vazio)' }, { status: 400 })
          }
          if (body.valor_total === undefined || body.valor_total === null) {
                  return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: valor_total' }, { status: 400 })
          }
          if (!body.tipo_entrega) {
                  return NextResponse.json({ success: false, erro: 'Campo obrigatorio ausente: tipo_entrega' }, { status: 400 })
          }

      // 4. Buscar estabelecimento pelo slug
      const { data: estabelecimento, error: errEstab } = await supabase
            .from('estabelecimentos')
            .select('id')
            .eq('slug', body.slug)
            .single()

      if (errEstab || !estabelecimento) {
              return NextResponse.json({ success: false, erro: 'Estabelecimento nao encontrado para o slug informado.' }, { status: 400 })
      }

      const estabelecimento_id = estabelecimento.id

      // 5. Registrar ou atualizar cliente no CRM
      const { data: clienteExistente } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', body.cliente.telefone)
            .eq('estabelecimento_id', estabelecimento_id)
            .single()

      if (!clienteExistente) {
              await supabase.from('clientes').insert({
                        estabelecimento_id,
                        nome: body.cliente.nome,
                        telefone: body.cliente.telefone,
                        endereco: body.cliente.endereco || '',
                        criado_em: new Date().toISOString(),
              })
      } else {
              await supabase
                .from('clientes')
                .update({
                            nome: body.cliente.nome,
                            endereco: body.cliente.endereco || '',
                })
                .eq('id', clienteExistente.id)
      }

      // 6. Mapear itens para o formato interno
      const itens = body.itens.map((item) => ({
              nome: item.nome,
              preco: item.preco_unitario,
              quantidade: item.quantidade,
              categoria: item.categoria || '',
              observacao: item.observacao || '',
      }))

      // 7. Criar pedido no Supabase
      const { data: pedido, error: errPedido } = await supabase
            .from('pedidos')
            .insert({
                      estabelecimento_id,
                      restaurante_slug: body.slug,
                      cliente_nome: body.cliente.nome,
                      cliente_telefone: body.cliente.telefone,
                      itens,
                      valor_total: body.valor_total,
                      endereco: body.cliente.endereco || '',
                      tipo_entrega: body.tipo_entrega,
                      forma_pagamento: body.forma_pagamento || '',
                      observacoes: body.observacao_geral || '',
                      status: 'em_producao',
                      origem: 'cardapio_externo',
                      criado_em: new Date().toISOString(),
            })
            .select('id, numero_pedido')
            .single()

      if (errPedido || !pedido) {
              console.error('[pedido-externo] Erro ao criar pedido:', errPedido)
              return NextResponse.json(
                { success: false, erro: 'Erro interno ao registrar o pedido.' },
                { status: 500 }
                      )
      }

      // 8. Retornar sucesso
      return NextResponse.json({
              success: true,
              pedido_id: pedido.id,
              numero_pedido: pedido.numero_pedido,
              mensagem: 'Pedido recebido com sucesso',
      })
    } catch (err) {
          console.error('[pedido-externo] Erro inesperado:', err)
          return NextResponse.json(
            { success: false, erro: 'Erro interno no servidor.' },
            { status: 500 }
                )
    }
}
