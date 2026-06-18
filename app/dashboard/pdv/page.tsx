'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Check, X } from 'lucide-react'

type Categoria = {
  id: string
  nome: string
  ordem: number
}

type Produto = {
  id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number
  imagem_url: string
  disponivel: boolean
}

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

type FormaPagamento = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix'

function PDVContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [nomeCliente, setNomeCliente] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'retirada' | 'delivery'>('retirada')
  const [troco, setTroco] = useState('')
  const [loading, setLoading] = useState(true)
  const [finalizando, setFinalizando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState<number | null>(null)

  useEffect(() => {
    if (slug) carregarDados()
  }, [slug])

  async function carregarDados() {
    setLoading(true)
    const { data: estab } = await supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!estab) { setLoading(false); return }
    setEstabelecimentoId(estab.id)

    const { data: cats } = await supabase
      .from('categorias')
      .select('id, nome, ordem')
      .eq('estabelecimento_id', estab.id)
      .order('ordem')

    const { data: prods } = await supabase
      .from('produtos')
      .select('id, categoria_id, nome, descricao, preco, imagem_url, disponivel')
      .eq('estabelecimento_id', estab.id)
      .eq('disponivel', true)
      .order('nome')

    setCategorias(cats || [])
    setProdutos(prods || [])
    setLoading(false)
  }

  const produtosFiltrados = produtos.filter(p => {
    const matchCategoria = categoriaAtiva === 'todas' || p.categoria_id === categoriaAtiva
    const matchBusca = busca === '' || p.nome.toLowerCase().includes(busca.toLowerCase())
    return matchCategoria && matchBusca
  })

  function adicionarItem(produto: Produto) {
    setCarrinho(prev => {
      const existe = prev.find(i => i.produto.id === produto.id)
      if (existe) {
        return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      }
      return [...prev, { produto, quantidade: 1 }]
    })
  }

  function alterarQuantidade(produtoId: string, delta: number) {
    setCarrinho(prev => {
      return prev.map(i => {
        if (i.produto.id === produtoId) {
          const novaQtd = i.quantidade + delta
          if (novaQtd <= 0) return null
          return { ...i, quantidade: novaQtd }
        }
        return i
      }).filter(Boolean) as ItemCarrinho[]
    })
  }

  function removerItem(produtoId: string) {
    setCarrinho(prev => prev.filter(i => i.produto.id !== produtoId))
  }

  function limparCarrinho() {
    setCarrinho([])
    setNomeCliente('')
    setTroco('')
    setFormaPagamento('dinheiro')
    setTipoEntrega('retirada')
    setSucesso(false)
    setNumeroPedido(null)
  }

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0)
  const qtdItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0)

  const getQuantidadeNoCarrinho = (produtoId: string) => {
    return carrinho.find(i => i.produto.id === produtoId)?.quantidade || 0
  }

  async function finalizarPedido() {
    if (carrinho.length === 0) return
    setFinalizando(true)

    const itens = carrinho.map(i => ({
      produto_id: i.produto.id,
      nome: i.produto.nome,
      preco: i.produto.preco,
      quantidade: i.quantidade,
    }))

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({
        estabelecimento_id: estabelecimentoId,
        nome_cliente: nomeCliente || 'Balcão',
        itens,
        total: totalCarrinho,
        tipo_entrega: tipoEntrega,
        forma_pagamento: formaPagamento,
        status: 'aguardando',
        canal: 'pdv',
      })
      .select('numero_pedido')
      .single()

    setFinalizando(false)

    if (!error && pedido) {
      setNumeroPedido(pedido.numero_pedido)
      setSucesso(true)
      setTimeout(() => {
        limparCarrinho()
      }, 4000)
    }
  }

  const formasPagamento: { value: FormaPagamento; label: string; cor: string }[] = [
    { value: 'dinheiro', label: 'Dinheiro', cor: '#16a34a' },
    { value: 'pix', label: 'PIX', cor: '#7c3aed' },
    { value: 'cartao_debito', label: 'Débito', cor: '#2563eb' },
    { value: 'cartao_credito', label: 'Crédito', cor: '#d97706' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-500 text-lg">Carregando cardápio...</div>
    </div>
  )

  if (sucesso) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#16a34a' }}>
          <Check size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pedido Registrado!</h2>
        <div className="text-5xl font-black mb-2" style={{ color: '#eb0029' }}>#{numeroPedido}</div>
        <p className="text-gray-500 mb-6">O pedido foi enviado para a cozinha.</p>
        <div className="text-sm text-gray-400">Limpando em 4 segundos...</div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* COLUNA ESQUERDA - Produtos */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard?slug=${slug}`)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">PDV — Ponto de Venda</h1>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">{produtos.length} produtos</div>
        </div>

        {/* Busca */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
          />
        </div>

        {/* Categorias */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategoriaAtiva('todas')}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={categoriaAtiva === 'todas' ? { backgroundColor: '#eb0029', color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            Todas
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={categoriaAtiva === cat.id ? { backgroundColor: '#eb0029', color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              {cat.nome}
            </button>
          ))}
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto p-4">
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-gray-400">Nenhum produto encontrado</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {produtosFiltrados.map(produto => {
                const qtd = getQuantidadeNoCarrinho(produto.id)
                return (
                  <div
                    key={produto.id}
                    onClick={() => adicionarItem(produto)}
                    className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                    style={qtd > 0 ? { borderColor: '#eb0029', borderWidth: '2px' } : {}}
                  >
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300 text-xs">sem foto</div>
                    )}
                    {qtd > 0 && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#eb0029' }}>
                        {qtd}
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{produto.nome}</div>
                      <div className="text-sm font-bold mt-1" style={{ color: '#eb0029' }}>
                        R$ {produto.preco.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* COLUNA DIREITA - Carrinho */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header carrinho */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-gray-600" />
            <span className="font-bold text-gray-800">Pedido</span>
            {qtdItens > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{qtdItens}</span>
            )}
          </div>
          {carrinho.length > 0 && (
            <button onClick={limparCarrinho} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Limpar
            </button>
          )}
        </div>

        {/* Cliente + Tipo */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2">
          <input
            type="text"
            placeholder="Nome do cliente (opcional)"
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setTipoEntrega('retirada')}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={tipoEntrega === 'retirada' ? { backgroundColor: '#eb0029', color: '#fff', borderColor: '#eb0029' } : { backgroundColor: '#fff', color: '#374151', borderColor: '#e5e7eb' }}
            >
              Retirada
            </button>
            <button
              onClick={() => setTipoEntrega('delivery')}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={tipoEntrega === 'delivery' ? { backgroundColor: '#eb0029', color: '#fff', borderColor: '#eb0029' } : { backgroundColor: '#fff', color: '#374151', borderColor: '#e5e7eb' }}
            >
              Delivery
            </button>
          </div>
        </div>

        {/* Itens do carrinho */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {carrinho.length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <ShoppingCart size={40} className="mx-auto mb-2" />
              <div className="text-sm">Clique nos produtos para adicionar</div>
            </div>
          ) : (
            carrinho.map(item => (
              <div key={item.produto.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.produto.nome}</div>
                  <div className="text-xs text-gray-400">R$ {item.produto.preco.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alterarQuantidade(item.produto.id, -1)}
                    className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantidade}</span>
                  <button
                    onClick={() => alterarQuantidade(item.produto.id, +1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors"
                    style={{ backgroundColor: '#eb0029' }}
                  >
                    <Plus size={10} />
                  </button>
                </div>
                <div className="text-xs font-bold text-gray-700 w-14 text-right">
                  R$ {(item.produto.preco * item.quantidade).toFixed(2).replace('.', ',')}
                </div>
                <button onClick={() => removerItem(item.produto.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagamento + Total */}
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          {/* Formas de pagamento */}
          <div className="grid grid-cols-2 gap-1.5">
            {formasPagamento.map(f => (
              <button
                key={f.value}
                onClick={() => setFormaPagamento(f.value)}
                className="py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={formaPagamento === f.value
                  ? { backgroundColor: f.cor, color: '#fff', borderColor: f.cor }
                  : { backgroundColor: '#fff', color: '#374151', borderColor: '#e5e7eb' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Troco (apenas dinheiro) */}
          {formaPagamento === 'dinheiro' && (
            <input
              type="number"
              placeholder="Troco para quanto? (opcional)"
              value={troco}
              onChange={e => setTroco(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400"
            />
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-gray-700">Total</span>
            <span className="text-xl font-black" style={{ color: '#eb0029' }}>
              R$ {totalCarrinho.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Botão finalizar */}
          <button
            onClick={finalizarPedido}
            disabled={carrinho.length === 0 || finalizando}
            className="w-full py-3 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#eb0029' }}
          >
            {finalizando ? 'Registrando...' : 'Finalizar Pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PDVPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-gray-500">Carregando PDV...</div></div>}>
      <PDVContent />
    </Suspense>
  )
}
