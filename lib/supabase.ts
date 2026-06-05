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

export type Pedido = {
  id: string
  estabelecimento_id: string
  numero: number
  status: 'pendente' | 'confirmado' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
  tipo_entrega: 'delivery' | 'retirada' | 'mesa'
  cliente_nome: string
  cliente_telefone: string
  cliente_endereco: string
  itens: PedidoItem[]
  total: number
  observacoes: string
  created_at: string
}

export type PedidoItem = {
  produto_id: string
  nome: string
  preco: number
  quantidade: number
}
