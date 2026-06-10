import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Estabelecimento = {
  id: string
  nome: string
  slug: string
  tipo: string
  telefone: string
  endereco: string
  ativo: boolean
}

export type Categoria = {
  id: string
  estabelecimento_id: string
  nome: string
  ordem: number
  banner_url: string | null
}

export type Produto = {
  id: string
  estabelecimento_id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number
  imagem_url: string
  disponivel: boolean
  destaque: boolean
}

export type PedidoItem = {
  produto_id: string
  nome: string
  preco: number
  quantidade: number
}

export type Pedido = {
  id: string
  numero_pedido: number
  estabelecimento_id: string | null
  status: 'em_producao' | 'confirmado' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
  tipo_entrega: 'delivery' | 'retirada' | 'mesa'
  cliente_nome: string
  cliente_telefone: string
  endereco: string
  itens: PedidoItem[]
  valor_total: number
  observacoes: string
  criado_em: string
  produzido_em: string | null
  saiu_em: string | null
  entregue_em: string | null
  entregador: string | null
}


export type Entregador = {
  id: string
  estabelecimento_id: string
  nome: string
  telefone: string | null
  veiculo: string | null
  status: 'disponivel' | 'em_entrega' | 'inativo'
  criado_em: string
}

export type FilaEntregador = {
  id: string
  pedido_id: string
  entregador_id: string | null
  estabelecimento_id: string
  status: 'aguardando' | 'aceito' | 'em_rota' | 'entregue' | 'cancelado'
  atribuido_em: string | null
  entregue_em: string | null
  criado_em: string
}
