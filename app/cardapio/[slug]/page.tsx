'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Plus, Minus, X, ArrowLeft, Check, MessageCircle, Send, MapPin, Star, ChevronDown, Home, Tag, ClipboardList, User } from 'lucide-react'

type Produto = {
  id: string; nome: string; descricao?: string; preco: number
  preco_promocional?: number; imagem_url?: string; categoria_id: string
  ativo: boolean; disponivel: boolean
}
type Categoria = { id: string; nome: string; ordem: number }
type ItemCarrinho = { produto: Produto; quantidade: number; obs?: string }
type Estabelecimento = {
  id: string; nome: string; logo_url?: string; cor_primaria?: string
  descricao?: string; telefone?: string; cidade?: string; estado?: string
  endereco?: string; aberto: boolean; tipos_pedido?: string[]
}

function CardapioPublico({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [obsItem, setObsItem] = useState('')
  const [qtdItem, setQtdItem] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [isLogado, setIsLogado] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'cardapio'|'promocoes'|'pedidos'|'perfil'>('cardapio')
  const [chatAberto, setChatAberto] = useState(false)
  const [chatMensagens, setChatMensagens] = useState<{role:'user'|'assistant',content:string}[]>([
    { role: 'assistant', content: 'Ola! Sou a MEL, assistente virtual da loja. Como posso ajudar? :)' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatCarregando, setChatCarregando] = useState(false)
  const [chatSessionId] = useState(() => 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2,9))
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const cor = estabelecimento?.cor_primaria || '#e53935'

  const fetchDados = useCallback(async () => {
    if (!slug) return
    const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)
    const [prodR, catR] = await Promise.all([
      supabase.from('produtos').select('*').eq('estabelecimento_id', est.id).order('nome'),
      supabase.from('categorias').select('*').eq('estabelecimento_id', est.id).order('ordem')
    ])
    if (prodR.data) setProdutos(prodR.data)
    if (catR.data) setCategorias(catR.data)
    setCarregando(false)
  }, [slug])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { se
