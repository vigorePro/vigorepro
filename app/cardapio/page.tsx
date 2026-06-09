'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Estabelecimento, Categoria, Produto } from '@/lib/supabase'

type CarrinhoItem = Produto & { quantidade: number }

function CardapioContent() {
  const searchParams = useSearchParams()
  const slugFromParams = searchParams.get('slug') || ''
  const slug =
    slugFromParams ||
    (typeof window !== 'undefined'
      ? window.location.hostname.replace('.vigorepro.com.br', '')
      : '')

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [cartAberto, setCartAberto] = useState(false)

  useEffect(() => {
    if (slug) carregarDados()
  }, [slug])

  async function carregarDados() {
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()
    if (!est) {
      setNaoEncontrado(true)
      setCarregando(false)
      return
    }
    setEstabelecimento(est)
    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .eq('estabelecimento_id', est.id)
      .order('ordem')
    const { data: prods } = await supabase
      .from('produtos')
      .select('*')
      .eq('estabelecimento_id', est.id)
      .eq('disponivel', true)
      .order('categoria_id')
    setCategorias(cats || [])
    setProdutos(prods || [])
    if (cats && cats.length > 0) setCategoriaAtiva(cats[0].id)
    setCarregando(false)
  }

  function adicionarAoCarrinho(produto: Produto) {
    setCarrinho(prev => {
      const existe = prev.find(i => i.id === produto.id)
      if (existe)
        return prev.map(i =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      return [...prev, { ...produto, quantidade: 1 }]
    })
  }

  function removerDoCarrinho(id: string) {
    setCarrinho(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      if (item.quantidade === 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, quantidade: i.quantidade - 1 } : i)
    })
  }

  function limparCarrinho() {
    setCarrinho([])
    setCartAberto(false)
  }

  const totalItens = carrinho.reduce((a, i) => a + i.quantidade, 0)
  const totalValor = carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0)
  const produtosCategoria = produtos.filter(p => p.categoria_id === categoriaAtiva)

  function irParaPedido() {
    const carrinhoEnc = encodeURIComponent(
      JSON.stringify(
        carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, quantidade: i.quantidade }))
      )
    )
    window.location.href = '/pedido?slug=' + slug + '&carrinho=' + carrinhoEnc
  }

  if (naoEncontrado) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🍽️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Restaurante não encontrado</h1>
          <p className="text-gray-400 mb-2">O estabelecimento <strong className="text-amber-400">{slug}</strong> não existe ou não está ativo.</p>
          <p className="text-sm text-gray-600">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm tracking-widest uppercase">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  if (!estabelecimento) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <p className="text-gray-500">Estabelecimento não encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0d0d0d]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 px-4 pt-8 pb-6 max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-amber-400 text-xs tracking-[0.2em] uppercase font-medium mb-1">Cardápio Digital</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">{estabelecimento.nome}</h1>
            {estabelecimento.endereco && (
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                {estabelecimento.endereco}
              </p>
            )}
            <span className="inline-flex items-center gap-1 mt-2 bg-green-900/40 border border-green-700/50 text-green-400 text-xs px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Aberto agora · Pagamento na entrega
            </span>
          </div>
          {totalItens > 0 && (
            <button onClick={() => setCartAberto(true)} className="hidden md:flex items-center gap-3 bg-amber-600 hover:bg-amber-700 transition px-5 py-3 rounded-2xl font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
              <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
              <span className="bg-amber-800/60 px-2 py-0.5 rounded-lg text-sm">R$ {totalValor.toFixed(2)}</span>
            </button>
          )}
        </div>
      </header>

      <nav className="bg-[#161616] border-b border-white/5 sticky top-0 z-20 shadow-xl">
        <div className="flex gap-0 overflow-x-auto max-w-5xl mx-auto px-2">
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)}
              className={`relative px-5 py-4 text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${categoriaAtiva === cat.id ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {cat.nome}
              {categoriaAtiva === cat.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t" />}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-36">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">{categorias.find(c => c.id === categoriaAtiva)?.nome}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{produtosCategoria.length} {produtosCategoria.length === 1 ? 'item disponível' : 'itens disponíveis'}</p>
        </div>
        {produtosCategoria.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-gray-500">Nenhum produto nesta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosCategoria.map(produto => {
              const noCarrinho = carrinho.find(i => i.id === produto.id)
              return (
                <div key={produto.id} className="group bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden hover:border-amber-600/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/20 flex flex-col">
                  <div className="relative overflow-hidden bg-[#111] h-44">
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="text-5xl opacity-30">🎂</span></div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-base leading-snug mb-1">{produto.nome}</h3>
                      {produto.descricao && <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{produto.descricao}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-amber-400 font-black text-lg">R$ {produto.preco.toFixed(2)}</span>
                      {noCarrinho ? (
                        <div className="flex items-center gap-2 bg-[#111] rounded-xl px-1 py-1">
                          <button onClick={() => removerDoCarrinho(produto.id)} className="w-8 h-8 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 font-black text-lg flex items-center justify-center transition">−</button>
                          <span className="text-white font-bold w-5 text-center">{noCarrinho.quantidade}</span>
                          <button onClick={() => adicionarAoCarrinho(produto)} className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-lg flex items-center justify-center transition">+</button>
                        </div>
                      ) : (
                        <button onClick={() => adicionarAoCarrinho(produto)} className="bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                          Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {cartAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={() => setCartAberto(false)} />
          <div className="w-full max-w-sm bg-[#161616] border-l border-white/10 flex flex-col h-full animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
                Seu Pedido
                <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">{totalItens}</span>
              </h2>
              <button onClick={() => setCartAberto(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center transition">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {carrinho.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-white/5">
                  {item.imagem_url && <img src={item.imagem_url} alt={item.nome} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{item.nome}</p>
                    <p className="text-amber-400 text-sm font-bold">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => removerDoCarrinho(item.id)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-900/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition text-lg font-bold">−</button>
                    <span className="text-white font-bold w-4 text-center text-sm">{item.quantidade}</span>
                    <button onClick={() => adicionarAoCarrinho(item)} className="w-7 h-7 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 flex items-center justify-center transition text-lg font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Subtotal</span>
                <span className="text-white font-bold">R$ {totalValor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-3">
                <span className="text-white font-bold">Total</span>
                <span className="text-amber-400 font-black text-lg">R$ {totalValor.toFixed(2)}</span>
              </div>
              <button onClick={irParaPedido} className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all text-white py-4 rounded-xl font-bold text-base">Finalizar Pedido →</button>
              <button onClick={limparCarrinho} className="w-full text-gray-500 hover:text-red-400 text-sm transition py-1">Limpar carrinho</button>
            </div>
          </div>
        </div>
      )}

      {totalItens > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 md:hidden">
          <button onClick={() => setCartAberto(true)} className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all text-white py-4 rounded-2xl font-bold shadow-2xl shadow-amber-900/50 flex items-center justify-between px-5">
            <span className="bg-amber-800/60 text-white rounded-xl w-8 h-8 flex items-center justify-center text-sm font-black">{totalItens}</span>
            <span className="text-base">Ver Pedido</span>
            <span className="text-base font-black">R$ {totalValor.toFixed(2)}</span>
          </button>
        </div>
      )}

      {totalItens > 0 && (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <button onClick={() => setCartAberto(true)} className="bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all text-white px-6 py-3 rounded-2xl font-bold shadow-2xl shadow-amber-900/50 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
            <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            <span className="bg-amber-800/60 px-2 py-0.5 rounded-lg">R$ {totalValor.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Cardapio() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <CardapioContent />
    </Suspense>
  )
}
