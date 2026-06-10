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
        setCategorias(cats || [])
        if (cats && cats.length > 0) setCategoriaAtiva(cats[0].id)
        const { data: prods } = await supabase
          .from('produtos')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .eq('ativo', true)
          .order('ordem')
        setProdutos(prods || [])
        setCarregando(false)
  }

  function adicionarAoCarrinho(produto: Produto) {
        setCarrinho(prev => {
                const existente = prev.find(i => i.id === produto.id)
                if (existente) {
                          return prev.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
                }
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

  function irParaPedido() {
        const texto = carrinho.map(i => `${i.quantidade}x ${i.nome} - R$ ${(i.preco * i.quantidade).toFixed(2)}`).join('\n')
        const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
        const msg = `Olá! Quero fazer um pedido:%0A%0A${encodeURIComponent(texto)}%0A%0ATotal: R$ ${total.toFixed(2)}`
        const tel = estabelecimento?.whatsapp?.replace(/\D/g, '') || ''
        window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank')
  }

  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0)
    const totalPreco = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0)
    const produtosFiltrados = produtos.filter(p => p.categoria_id === categoriaAtiva)

  if (naoEncontrado) {
        return (
                <div className="min-h-screen bg-[#faf1df] flex items-center justify-center">
                        <div className="text-center">
                                  <h1 className="text-4xl font-bold text-[#04000b] font-oswald mb-4">404</h1>h1>
                                  <p className="text-[#04000b]/60 font-jost">Estabelecimento não encontrado.</p>p>
                        </div>div>
                </div>div>
              )
  }
  
    if (carregando) {
          return (
                  <div className="min-h-screen bg-[#faf1df] flex items-center justify-center">
                          <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-[#eb0029] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[#04000b]/60 font-jost text-sm">Carregando cardápio...</p>p>
                          </div>div>
                  </div>div>
                )
    }
  
    return (
          <div className="min-h-screen bg-[#faf1df] font-jost">
          
            {/* NAVBAR */}
                <nav className="bg-white shadow-sm sticky top-0 z-40">
                        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {estabelecimento?.logo_url ? (
                          <img src={estabelecimento.logo_url} alt={estabelecimento.nome} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#eb0029] flex items-center justify-center text-white font-bold font-oswald text-lg">
                            {estabelecimento?.nome?.charAt(0) || 'R'}
                          </div>div>
                                              )}
                                              <span className="font-oswald font-bold text-xl text-[#04000b] uppercase tracking-wide">
                                                {estabelecimento?.nome || 'Restaurante'}
                                              </span>span>
                                  </div>div>
                                  <div className="flex items-center gap-2">
                                    {estabelecimento?.endereco && (
                          <span className="hidden md:flex items-center gap-1 text-sm text-[#04000b]/60">
                                          <svg className="w-4 h-4 text-[#eb0029]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                          </svg>svg>
                            {estabelecimento.endereco}
                          </span>span>
                                              )}
                                              <button
                                                              onClick={() => setCartAberto(true)}
                                                              className="relative bg-[#eb0029] hover:bg-[#c8001f] text-white rounded-full p-2.5 transition-colors"
                                                            >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>svg>
                                                {totalItens > 0 && (
                                                                              <span className="absolute -top-1 -right-1 bg-[#f76e2a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                                                                {totalItens}
                                                                              </span>span>
                                                            )}
                                              </button>button>
                                  </div>div>
                        </div>div>
                </nav>nav>
          
            {/* HERO BANNER */}
                <div className="bg-[#eb0029] relative overflow-hidden">
                        <div
                                    className="absolute inset-0 opacity-10"
                                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                                  />
                        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                  <div className="text-white text-center md:text-left">
                                              <div className="inline-block bg-white/20 border border-white/30 rounded-full px-4 py-1 text-sm font-jost mb-4">
                                                            🔥 Peça agora • Entrega rápida
              </div>div>
                                              <h1 className="font-oswald text-4xl md:text-6xl font-bold uppercase tracking-tight leading-tight mb-4">
                                                {estabelecimento?.nome || 'Nosso Cardápio'}
                                              </h1>h1>
                                              <p className="font-dancing text-2xl md:text-3xl text-white/90 mb-6">
                                                            Nosso menu
                                              </p>p>
                                              <a
                                                              href="#cardapio"
                                                              className="inline-block bg-white text-[#eb0029] font-oswald font-bold uppercase tracking-wide px-8 py-3 rounded-full hover:bg-[#faf1df] transition-colors text-sm"
                                                            >
                                                            Peça Agora
                                              </a>a>
                                  </div>div>
                                  <div className="flex items-center gap-6">
                                              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
                                                            <div className="font-oswald text-3xl font-bold">{categorias.length}</div>div>
                                                            <div className="font-jost text-xs text-white/80">Categorias</div>div>
                                              </div>div>
                                              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
                                                            <div className="font-oswald text-3xl font-bold">{produtos.length}</div>div>
                                                            <div className="font-jost text-xs text-white/80">Itens</div>div>
                                              </div>div>
                                    {estabelecimento?.status_aberto && (
                          <div className="bg-green-500/80 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
                                          <div className="font-oswald text-lg font-bold">Aberto</div>div>
                                          <div className="font-jost text-xs text-white/80">Agora</div>div>
                          </div>div>
                                              )}
                                  </div>div>
                        </div>div>
                </div>div>
          
            {/* CATEGORIAS */}
                <div id="cardapio" className="max-w-6xl mx-auto px-4 pt-8">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                          {categorias.map(cat => (
                        <button
                                        key={cat.id}
                                        onClick={() => setCategoriaAtiva(cat.id)}
                                        className={`shrink-0 px-5 py-2 rounded-full font-oswald font-semibold text-sm uppercase tracking-wide transition-all ${
                                                          categoriaAtiva === cat.id
                                                            ? 'bg-[#eb0029] text-white shadow-md'
                                                            : 'bg-white text-[#04000b] hover:bg-[#eb0029]/10 border border-[#04000b]/10'
                                        }`}
                                      >
                          {cat.nome}
                        </button>button>
                      ))}
                        </div>div>
                </div>div>
          
            {/* TÍTULO DA SEÇÃO */}
                <div className="max-w-6xl mx-auto px-4 py-8 text-center">
                        <p className="font-dancing text-2xl text-[#eb0029]">Nosso menu</p>p>
                        <h2 className="font-oswald text-4xl font-bold text-[#04000b] uppercase tracking-wide mt-1">
                          {categorias.find(c => c.id === categoriaAtiva)?.nome || ''}
                        </h2>h2>
                        <div className="flex items-center justify-center gap-3 mt-2">
                                  <div className="h-px bg-[#eb0029] w-16" />
                                  <span className="text-[#04000b]/50 font-jost text-sm">{produtosFiltrados.length} itens disponíveis</span>span>
                                  <div className="h-px bg-[#eb0029] w-16" />
                        </div>div>
                </div>div>
          
            {/* PRODUTOS */}
                <div className="max-w-6xl mx-auto px-4 pb-24">
                        <div className="grid gap-4">
                          {produtosFiltrados.map(produto => {
                        const itemCarrinho = carrinho.find(i => i.id === produto.id)
                                      return (
                                                      <div key={produto.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                                                                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#faf1df] flex items-center justify-center">
                                                                        {produto.imagem_url ? (
                                                                            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                                                                          ) : (
                                                                            <span className="text-3xl">🍽️</span>span>
                                                                                        )}
                                                                      </div>div>
                                                                        <div className="flex-1 min-w-0">
                                                                                          <h3 className="font-oswald font-semibold text-[#04000b] text-lg uppercase tracking-wide leading-tight">
                                                                                            {produto.nome}
                                                                                            </h3>h3>
                                                                          {produto.descricao && (
                                                                            <p className="font-jost text-sm text-[#04000b]/60 mt-0.5 line-clamp-2">{produto.descricao}</p>p>
                                                                                          )}
                                                                                          <div className="mt-2">
                                                                                                              <span className="text-xs font-jost font-semibold text-[#04000b]/40 uppercase tracking-wider">Preço </span>span>
                                                                                                              <span className="font-oswald font-bold text-[#eb0029] text-lg">
                                                                                                                                    R$ {produto.preco?.toFixed(2) || '0.00'}
                                                                                                                </span>span>
                                                                                            </div>div>
                                                                        </div>div>
                                                                      <div className="shrink-0">
                                                                        {itemCarrinho ? (
                                                                            <div className="flex items-center gap-2">
                                                                                                  <button
                                                                                                                            onClick={() => removerDoCarrinho(produto.id)}
                                                                                                                            className="w-8 h-8 rounded-full bg-[#eb0029]/10 text-[#eb0029] font-bold flex items-center justify-center hover:bg-[#eb0029] hover:text-white transition-colors"
                                                                                                                          >
                                                                                                                          −
                                                                                                    </button>button>
                                                                                                  <span className="font-oswald font-bold text-[#04000b] w-5 text-center">{itemCarrinho.quantidade}</span>span>
                                                                                                  <button
                                                                                                                            onClick={() => adicionarAoCarrinho(produto)}
                                                                                                                            className="w-8 h-8 rounded-full bg-[#eb0029] text-white font-bold flex items-center justify-center hover:bg-[#c8001f] transition-colors"
                                                                                                                          >
                                                                                                                          +
                                                                                                    </button>button>
                                                                            </div>div>
                                                                          ) : (
                                                                            <button
                                                                                                    onClick={() => adicionarAoCarrinho(produto)}
                                                                                                    className="w-10 h-10 rounded-full bg-[#eb0029] text-white flex items-center justify-center hover:bg-[#c8001f] transition-colors shadow-md"
                                                                                                  >
                                                                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                                                                                    </svg>svg>
                                                                            </button>button>
                                                                                        )}
                                                                      </div>div>
                                                      </div>div>
                                                    )
                          })}
                        </div>div>
                
                  {produtosFiltrados.length === 0 && (
                      <div className="text-center py-16">
                                  <span className="text-5xl">🍽️</span>span>
                                  <p className="mt-4 font-jost text-[#04000b]/50">Nenhum item nesta categoria.</p>p>
                      </div>div>
                        )}
                </div>div>
          
            {/* CARRINHO FLUTUANTE */}
            {totalItens > 0 && !cartAberto && (
                    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4">
                              <button
                                            onClick={() => setCartAberto(true)}
                                            className="bg-[#eb0029] hover:bg-[#c8001f] text-white font-oswald font-bold uppercase tracking-wide px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 transition-all"
                                          >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>svg>
                                          <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>span>
                                          <span className="bg-white/20 rounded-full px-3 py-0.5 text-sm">
                                                        R$ {totalPreco.toFixed(2)}
                                          </span>span>
                              </button>button>
                    </div>div>
                )}
          
            {/* DRAWER CARRINHO */}
            {cartAberto && (
                    <div className="fixed inset-0 z-50 flex">
                              <div className="flex-1 bg-black/50" onClick={() => setCartAberto(false)} />
                              <div className="w-full max-w-sm bg-[#faf1df] h-full flex flex-col animate-slide-in-right">
                                          <div className="bg-[#eb0029] px-6 py-4 flex items-center justify-between">
                                                        <h2 className="font-oswald font-bold text-white text-xl uppercase tracking-wide">Seu Pedido</h2>h2>
                                                        <button onClick={() => setCartAberto(false)} className="text-white/80 hover:text-white">
                                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>svg>
                                                        </button>button>
                                          </div>div>
                                          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                                            {carrinho.map(item => (
                                      <div key={item.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-oswald font-semibold text-[#04000b] text-sm uppercase">{item.nome}</p>p>
                                                                            <p className="font-jost text-xs text-[#04000b]/50 mt-0.5">
                                                                                                  R$ {item.preco?.toFixed(2)} × {item.quantidade}
                                                                            </p>p>
                                                        </div>div>
                                                        <div className="flex items-center gap-2">
                                                                            <button onClick={() => removerDoCarrinho(item.id)} className="w-6 h-6 rounded-full bg-[#eb0029]/10 text-[#eb0029] text-sm flex items-center justify-center hover:bg-[#eb0029] hover:text-white transition-colors">−</button>button>
                                                                            <span className="font-oswald font-bold text-[#04000b] text-sm w-4 text-center">{item.quantidade}</span>span>
                                                                            <button onClick={() => adicionarAoCarrinho(item)} className="w-6 h-6 rounded-full bg-[#eb0029] text-white text-sm flex items-center justify-center hover:bg-[#c8001f] transition-colors">+</button>button>
                                                        </div>div>
                                                        <div className="font-oswald font-bold text-[#eb0029] text-sm w-16 text-right">
                                                                            R$ {(item.preco * item.quantidade).toFixed(2)}
                                                        </div>div>
                                      </div>div>
                                    ))}
                                          </div>div>
                                          <div className="px-6 pb-8 pt-4 border-t border-[#04000b]/10 space-y-3">
                                                        <div className="flex justify-between font-oswald font-bold text-[#04000b] text-lg">
                                                                        <span>Total</span>span>
                                                                        <span className="text-[#eb0029]">R$ {totalPreco.toFixed(2)}</span>span>
                                                        </div>div>
                                                        <button
                                                                          onClick={irParaPedido}
                                                                          className="w-full bg-[#eb0029] hover:bg-[#c8001f] text-white font-oswald font-bold uppercase tracking-wide py-4 rounded-full transition-colors shadow-lg"
                                                                        >
                                                                        Finalizar pelo WhatsApp
                                                        </button>button>
                                                        <button
                                                                          onClick={limparCarrinho}
                                                                          className="w-full text-[#04000b]/50 font-jost text-sm hover:text-[#04000b] transition-colors"
                                                                        >
                                                                        Limpar carrinho
                                                        </button>button>
                                          </div>div>
                              </div>div>
                    </div>div>
                )}
          </div>div>
        )
}

export default function CardapioPage() {
    return (
          <Suspense fallback={
                  <div className="min-h-screen bg-[#faf1df] flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-[#eb0029] border-t-transparent rounded-full animate-spin" />
                  </div>div>
            }>
                <CardapioContent />
          </Suspense>Suspense>
        )
}</div>

// v2
