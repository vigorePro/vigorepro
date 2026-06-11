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
      <div className="min-h-screen bg-[#faf1df] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6">🍽️</div>
          <h1 className="font-oswald uppercase text-3xl font-bold text-[#04000b] mb-2 tracking-tight">Restaurante não encontrado</h1>
          <p className="text-[#666] mb-2">O estabelecimento <strong className="text-[#eb0029]">{slug}</strong> não existe ou não está ativo.</p>
          <p className="text-sm text-[#999]">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#faf1df] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#eb0029] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-script text-[#eb0029] text-xl">Carregando cardápio...</p>
        </div>
      </div>
    )
  }

  if (!estabelecimento) {
    return (
      <div className="min-h-screen bg-[#faf1df] flex items-center justify-center">
        <p className="text-[#666]">Estabelecimento não encontrado</p>
      </div>
    )
  }

  function rolarParaMenu() {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#faf1df] text-[#04000b] font-jost">
      {/* NAVBAR */}
      <div className="sticky top-0 z-40 px-3 pt-3">
        <nav className="max-w-6xl mx-auto bg-white/95 backdrop-blur border border-[#ebe9e6] rounded-full shadow-sm px-5 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/assets/img/hero/logo-dolce-preta.png" alt={estabelecimento.nome} className="h-10 md:h-12 w-auto object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-7 font-oswald uppercase text-sm tracking-wide text-[#04000b]">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[#eb0029] transition">Início</button>
            <button onClick={rolarParaMenu} className="hover:text-[#eb0029] transition">Cardápio</button>
            {estabelecimento.telefone && (
              <a href={'tel:' + estabelecimento.telefone} className="hover:text-[#eb0029] transition">Contato</a>
            )}
          </div>
          <button onClick={() => setCartAberto(true)} className="relative w-11 h-11 rounded-full bg-[#04000b] hover:bg-[#eb0029] transition-colors text-white flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
            {totalItens > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#eb0029] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{totalItens}</span>
            )}
          </button>
        </nav>
      </div>

      {/* HERO */}
      <header
        className="relative overflow-hidden"
        style={{ backgroundImage: "url('/assets/img/hero/hero-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-[#eb0029]/30" />
        
        

        <div className="relative z-10 max-w-6xl mx-auto px-5 py-8 md:py-20 flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-8 items-center">
          {/* Coluna esquerda: logo + slogan + botão */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <img src="/assets/img/hero/logo-dolce.png" alt={estabelecimento.nome} className="w-48 md:w-80 drop-shadow-xl mb-3" />
            <p className="text-white/90 text-sm md:text-lg font-medium tracking-wide max-w-xs mx-auto md:mx-0">
              Qualidade que se prova todo dia.
            </p>
            <button
              onClick={rolarParaMenu}
              className="mt-5 bg-[#eb0029] hover:bg-white hover:text-[#eb0029] transition-colors text-white font-oswald uppercase tracking-wide px-9 py-3 md:py-4 rounded-full shadow-xl shadow-black/20"
            >
              Peça Agora
            </button>
            <a
              href="https://wa.me/5543996877898"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] transition-colors text-white font-oswald uppercase tracking-wide px-9 py-3 md:py-4 rounded-full shadow-xl shadow-black/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
          {/* Coluna direita: modelo */}
          <div className="relative flex justify-center mt-4 md:mt-0">
            <div className="rounded-2xl overflow-hidden" style={{background: 'radial-gradient(ellipse at center, #7a1515 70%, #5a0e0e 100%)'}}>
              <img src="/assets/img/hero/hero-food.png" alt="Destaque" className="w-56 md:w-[26rem]" />
            </div>
          </div>
        </div>
      </header>

      {/* CATEGORIAS */}
      <nav id="menu" className="bg-[#faf1df]/95 backdrop-blur border-b border-[#ebe9e6] scroll-mt-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={
                  'flex-shrink-0 px-5 py-2 rounded-full font-oswald uppercase text-sm tracking-wide transition-all ' +
                  (categoriaAtiva === cat.id
                    ? 'bg-[#eb0029] text-white shadow-md shadow-[#eb0029]/20'
                    : 'bg-white text-[#04000b] border border-[#ebe9e6] hover:border-[#eb0029] hover:text-[#eb0029]')
                }
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* LISTA DE PRODUTOS */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-36">
        {(() => {
          const catAtiva = categorias.find(c => c.id === categoriaAtiva)
          const hasDesktop = catAtiva?.banner_desktop_url
          const hasMobile = catAtiva?.banner_mobile_url
          const hasBanner = hasDesktop || hasMobile || catAtiva?.banner_url
          if (!hasBanner) return null
          return (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-sm">
              {hasDesktop && (
                <img src={catAtiva.banner_desktop_url!} alt={catAtiva.nome + ' banner'} className="hidden md:block w-full h-44 object-cover" />
              )}
              {hasMobile && (
                <img src={catAtiva.banner_mobile_url!} alt={catAtiva.nome + ' banner'} className={'w-full h-44 object-cover' + (hasDesktop ? ' md:hidden' : '')} />
              )}
              {!hasDesktop && !hasMobile && catAtiva?.banner_url && (
                <img src={catAtiva.banner_url} alt={catAtiva.nome + ' banner'} className="w-full h-44 object-cover" />
              )}
            </div>
          )
        })()}

        <div className="mb-7 text-center">
          <p className="font-script text-[#eb0029] text-2xl leading-none">Nosso menu</p>
          <h2 className="font-oswald uppercase text-3xl font-bold text-[#04000b] tracking-tight">{categorias.find(c => c.id === categoriaAtiva)?.nome}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-px w-8 bg-[#eb0029]/40" />
            <span className="text-[#666] text-sm">{produtosCategoria.length} {produtosCategoria.length === 1 ? 'item disponível' : 'itens disponíveis'}</span>
            <span className="h-px w-8 bg-[#eb0029]/40" />
          </div>
        </div>

        {produtosCategoria.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-[#666]">Nenhum produto nesta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {produtosCategoria.map(produto => {
              const noCarrinho = carrinho.find(i => i.id === produto.id)
              return (
                <div key={produto.id} className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-[#ebe9e6] shadow-sm hover:shadow-md transition-shadow group">
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[#faf1df]">
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="text-3xl opacity-30">🎂</span></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-oswald uppercase text-[#04000b] text-lg leading-snug tracking-tight">{produto.nome}</h3>
                    {produto.descricao && (
                      <p className="text-[#666] text-sm mt-0.5 line-clamp-2">{produto.descricao}</p>
                    )}
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className="text-[#999] text-[10px] uppercase tracking-widest font-medium">Preço</span>
                      <span className="text-[#eb0029] font-oswald font-bold text-xl">R$ {produto.preco.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {noCarrinho ? (
                      <div className="flex items-center gap-2 bg-[#faf1df] rounded-full px-1 py-1">
                        <button onClick={() => removerDoCarrinho(produto.id)} className="w-8 h-8 rounded-full bg-white border border-[#ebe9e6] hover:border-[#eb0029] text-[#eb0029] font-bold text-lg flex items-center justify-center transition">−</button>
                        <span className="text-[#04000b] font-bold w-5 text-center">{noCarrinho.quantidade}</span>
                        <button onClick={() => adicionarAoCarrinho(produto)} className="w-8 h-8 rounded-full bg-[#eb0029] hover:bg-[#f76e2a] text-white font-bold text-lg flex items-center justify-center transition">+</button>
                      </div>
                    ) : (
                      <button onClick={() => adicionarAoCarrinho(produto)} className="bg-[#eb0029] hover:bg-[#f76e2a] active:scale-95 transition-all text-white w-11 h-11 rounded-full font-bold text-2xl flex items-center justify-center shadow-md shadow-[#eb0029]/20">
                        +
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* CARRINHO LATERAL */}
      {cartAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setCartAberto(false)} />
          <div className="w-full max-w-sm bg-white border-l border-[#ebe9e6] flex flex-col h-full animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebe9e6]">
              <h2 className="font-oswald uppercase text-lg font-bold text-[#04000b] flex items-center gap-2 tracking-tight">
                <svg className="w-5 h-5 text-[#eb0029]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
                Seu Pedido
                <span className="bg-[#eb0029] text-white text-xs px-2 py-0.5 rounded-full">{totalItens}</span>
              </h2>
              <button onClick={() => setCartAberto(false)} className="w-8 h-8 rounded-full bg-[#faf1df] hover:bg-[#ebe9e6] text-[#666] flex items-center justify-center transition">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {carrinho.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-[#faf1df] rounded-xl p-3 border border-[#ebe9e6]">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl opacity-30">🎂</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-oswald uppercase text-[#04000b] text-sm tracking-tight truncate">{item.nome}</p>
                    <p className="text-[#eb0029] text-sm font-bold">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => removerDoCarrinho(item.id)} className="w-7 h-7 rounded-full bg-white border border-[#ebe9e6] hover:border-[#eb0029] text-[#666] hover:text-[#eb0029] flex items-center justify-center transition text-lg font-bold">−</button>
                    <span className="text-[#04000b] font-bold w-4 text-center text-sm">{item.quantidade}</span>
                    <button onClick={() => adicionarAoCarrinho(item)} className="w-7 h-7 rounded-full bg-[#eb0029] hover:bg-[#f76e2a] text-white flex items-center justify-center transition text-lg font-bold">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[#ebe9e6] space-y-3 bg-[#faf1df]">
              <div className="flex justify-between items-center">
                <span className="text-[#666] text-sm">Subtotal</span>
                <span className="text-[#04000b] font-bold">R$ {totalValor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#ebe9e6] pt-3">
                <span className="font-oswald uppercase text-[#04000b] font-bold tracking-tight">Total</span>
                <span className="text-[#eb0029] font-oswald font-bold text-xl">R$ {totalValor.toFixed(2)}</span>
              </div>
              <button onClick={irParaPedido} className="w-full bg-[#eb0029] hover:bg-[#f76e2a] active:scale-[0.98] transition-all text-white py-4 rounded-full font-oswald uppercase tracking-wide font-medium text-base">Finalizar Pedido →</button>
              <button onClick={limparCarrinho} className="w-full text-[#999] hover:text-[#eb0029] text-sm transition py-1">Limpar carrinho</button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FIXA MOBILE */}
      {totalItens > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 md:hidden">
          <button onClick={() => setCartAberto(true)} className="w-full bg-[#eb0029] hover:bg-[#f76e2a] active:scale-[0.98] transition-all text-white py-4 rounded-full font-oswald uppercase tracking-wide font-medium shadow-2xl shadow-[#eb0029]/40 flex items-center justify-between px-5">
            <span className="bg-white/25 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">{totalItens}</span>
            <span className="text-base">Ver Pedido</span>
            <span className="text-base font-bold">R$ {totalValor.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* BOTAO FIXO DESKTOP */}
      {totalItens > 0 && (
        <div className="fixed bottom-6 right-6 z-40 hidden md:block">
          <button onClick={() => setCartAberto(true)} className="bg-[#eb0029] hover:bg-[#f76e2a] active:scale-95 transition-all text-white px-6 py-3 rounded-full font-oswald uppercase tracking-wide font-medium shadow-2xl shadow-[#eb0029]/40 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 7h12.8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
            <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            <span className="bg-white/25 px-2 py-0.5 rounded-full">R$ {totalValor.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Cardapio() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf1df] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#eb0029] border-t-transparent rounded-full animate-spin" /></div>}>
      <CardapioContent />
    </Suspense>
  )
}
