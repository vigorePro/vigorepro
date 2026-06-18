'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, ChevronDown, Settings, RefreshCw } from 'lucide-react'

interface Produto {
  id: string
  nome: string
  preco: number
  imagem_url: string
  categoria_id: string
}

interface Categoria {
  id: string
  nome: string
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

function PDVContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos')
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [estabId, setEstabId] = useState<string | null>(null)
  const [pagamento, setPagamento] = useState<'dinheiro'|'pix'|'credito'|'debito'>('dinheiro')
  const [nomeCliente, setNomeCliente] = useState('')
  const [mesa, setMesa] = useState('')
  const [finalizando, setFinalizando] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabId(data.id) })
  }, [slug])

  useEffect(() => {
    if (!estabId) return
    Promise.all([
      supabase.from('produtos').select('*').eq('estabelecimento_id', estabId).order('nome'),
      supabase.from('categorias').select('*').eq('estabelecimento_id', estabId).order('nome')
    ]).then(([{ data: prods }, { data: cats }]) => {
      if (prods) setProdutos(prods)
      if (cats) setCategorias(cats)
    })
  }, [estabId])

  const produtosFiltrados = produtos.filter(p => {
    const buscaOk = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    const catOk = categoriaAtiva === 'todos' || p.categoria_id === categoriaAtiva
    return buscaOk && catOk
  })

  const adicionarItem = (produto: Produto) => {
    setCarrinho(prev => {
      const existe = prev.find(i => i.produto.id === produto.id)
      if (existe) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produto, quantidade: 1 }]
    })
  }

  const removerItem = (id: string) => setCarrinho(prev => prev.filter(i => i.produto.id !== id))

  const alterarQtd = (id: string, delta: number) => {
    setCarrinho(prev => prev.map(i => i.produto.id === id
      ? { ...i, quantidade: Math.max(1, i.quantidade + delta) }
      : i
    ))
  }

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0)

  const finalizarPedido = async () => {
    if (!estabId || carrinho.length === 0) return
    setFinalizando(true)
    const { data: ultimo } = await supabase.from('pedidos').select('numero').eq('estabelecimento_id', estabId).order('numero', { ascending: false }).limit(1).single()
    const numero = (ultimo?.numero || 0) + 1
    await supabase.from('pedidos').insert({
      estabelecimento_id: estabId,
      numero,
      status: 'aguardando',
      tipo: 'retirada',
      total: totalCarrinho,
      cliente_nome: nomeCliente || 'Balcão',
      forma_pagamento: pagamento,
      itens: carrinho.map(i => ({ id: i.produto.id, nome: i.produto.nome, preco: i.produto.preco, quantidade: i.quantidade })),
    })
    setCarrinho([])
    setNomeCliente('')
    setFinalizando(false)
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const qtdNoCarrinho = (id: string) => carrinho.find(i => i.produto.id === id)?.quantidade || 0

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#111111' }}>
      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Abas de categorias */}
        <div className="flex items-center gap-1 px-4 py-3 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: '#2a2a2a', backgroundColor: '#111111' }}>
          <button
            onClick={() => setCategoriaAtiva('todos')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={{ backgroundColor: categoriaAtiva === 'todos' ? '#eb0029' : '#1a1a1a', color: categoriaAtiva === 'todos' ? '#fff' : '#9ca3af', border: '1px solid ' + (categoriaAtiva === 'todos' ? '#eb0029' : '#2a2a2a') }}>
            Todos
          </button>
          {categorias.map(cat => (
            <button key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{ backgroundColor: categoriaAtiva === cat.id ? '#eb0029' : '#1a1a1a', color: categoriaAtiva === cat.id ? '#fff' : '#9ca3af', border: '1px solid ' + (categoriaAtiva === cat.id ? '#eb0029' : '#2a2a2a') }}>
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Barra de busca + filtros */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#2a2a2a' }}>
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <Search size={15} style={{ color: '#6b7280' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Digite algo para buscar..." className="bg-transparent outline-none text-sm flex-1 placeholder-gray-500"
              style={{ color: '#e5e7eb' }} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#9ca3af' }}>
            <span>Selecionar cliente...</span>
            <ChevronDown size={14} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#9ca3af' }}>
            <span>Mesa...</span>
            <ChevronDown size={14} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#9ca3af' }}>
            <span>Comanda...</span>
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Produtos */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white">Produtos</h3>
            <span className="text-xs" style={{ color: '#6b7280' }}>{produtosFiltrados.length}</span>
            <Settings size={14} style={{ color: '#4b5563' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {produtosFiltrados.map(produto => {
              const qtd = qtdNoCarrinho(produto.id)
              return (
                <button key={produto.id} onClick={() => adicionarItem(produto)}
                  className="relative rounded-xl overflow-hidden text-left border transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: '#1a1a1a', borderColor: qtd > 0 ? '#eb0029' : '#2a2a2a' }}>
                  {qtd > 0 && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white z-10"
                      style={{ backgroundColor: '#eb0029' }}>{qtd}</div>
                  )}
                  <div className="w-full aspect-square" style={{ backgroundColor: '#2a2a2a' }}>
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart size={24} style={{ color: '#374151' }} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-white leading-tight mb-1 line-clamp-2">{produto.nome}</p>
                    <p className="text-sm font-bold" style={{ color: '#eb0029' }}>{fmt(produto.preco)}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {produtosFiltrados.length === 0 && (
            <div className="text-center py-16">
              <ShoppingCart size={36} className="mx-auto mb-2" style={{ color: '#374151' }} />
              <p style={{ color: '#6b7280' }}>Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral — Detalhes do pedido */}
      <div className="w-80 flex-shrink-0 flex flex-col border-l" style={{ borderColor: '#2a2a2a', backgroundColor: '#161616' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2a2a' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} style={{ color: '#eb0029' }} />
            <span className="text-sm font-semibold text-white">Detalhes do pedido</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings size={14} style={{ color: '#4b5563' }} />
            <RefreshCw size={14} style={{ color: '#4b5563' }} />
          </div>
        </div>

        {/* Itens do carrinho */}
        <div className="flex-1 overflow-y-auto p-3">
          {carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <ShoppingCart size={40} style={{ color: '#2a2a2a' }} className="mb-2" />
              <p className="text-sm" style={{ color: '#4b5563' }}>Carrinho vazio</p>
              <p className="text-xs mt-1" style={{ color: '#374151' }}>Adicione produtos para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {carrinho.map(item => (
                <div key={item.produto.id} className="flex items-center gap-2 p-2.5 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{item.produto.nome}</p>
                    <p className="text-xs" style={{ color: '#eb0029' }}>{fmt(item.produto.preco * item.quantidade)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); alterarQtd(item.produto.id, -1) }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#2a2a2a' }}>
                      <Minus size={10} />
                    </button>
                    <span className="text-xs text-white w-5 text-center font-bold">{item.quantidade}</span>
                    <button onClick={(e) => { e.stopPropagation(); alterarQtd(item.produto.id, 1) }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: '#2a2a2a' }}>
                      <Plus size={10} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removerItem(item.produto.id) }}
                      className="w-6 h-6 rounded-md flex items-center justify-center ml-1" style={{ color: '#ef4444' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com pagamento */}
        {carrinho.length > 0 && (
          <div className="p-3 border-t space-y-3" style={{ borderColor: '#2a2a2a' }}>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>Cliente (opcional)</p>
              <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)}
                placeholder="Nome do cliente..."
                className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>Pagamento</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([['dinheiro','Dinheiro'],['pix','PIX'],['credito','Crédito'],['debito','Débito']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setPagamento(key)}
                    className="py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ backgroundColor: pagamento === key ? '#eb0029' : '#1e1e1e', color: pagamento === key ? '#fff' : '#9ca3af', border: '1px solid ' + (pagamento === key ? '#eb0029' : '#2a2a2a') }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-sm py-2 border-t" style={{ borderColor: '#2a2a2a' }}>
              <span style={{ color: '#9ca3af' }}>Total</span>
              <span className="font-bold text-white text-base">{fmt(totalCarrinho)}</span>
            </div>
            <button onClick={finalizarPedido} disabled={finalizando}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#eb0029' }}>
              {finalizando ? 'Finalizando...' : 'FAZER PEDIDO'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PDVPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#111111' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <PDVContent />
    </Suspense>
  )
}
