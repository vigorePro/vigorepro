import { createClient } from '@supabase/supabase-js'
import { analisarPreferenciasCliente } from '@/lib/crm-analytics'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ItemPedido {
  nome: string
  preco: number
  quantidade: number
  categoria?: string
}

export interface DadosPedido {
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string
  itens: ItemPedido[]
  valor_total: number
  endereco: string
  tipo_entrega: string
  observacoes?: string
}

export interface DadosCRM {
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string
  itens: ItemPedido[]
  valor_total: number
}

// Cria pedido no Supabase e retorna o numero do pedido
export async function criarPedido(dados: DadosPedido): Promise<number> {
  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      ...dados,
      status: 'aguardando',
      criado_em: new Date().toISOString(),
    })
    .select('numero_pedido')
    .single()

  if (error) throw error
  return data?.numero_pedido
}

// Registra/atualiza cliente no CRM, incrementa metricas, grava historico e analisa preferencias
export async function registrarCRM(dados: DadosCRM): Promise<void> {
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

  // Analisa preferencias de categorias e produtos e atualiza o cliente
  try {
    await analisarPreferenciasCliente(dados.estabelecimento_id, String(cliente.id))
  } catch (prefErr) {
    console.error('Erro ao analisar preferencias do cliente:', prefErr)
  }
}
