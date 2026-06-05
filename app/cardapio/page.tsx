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
  const slug = slugFromParams || (typeof window !== 'undefined' ? window.location.hostname.replace('.vigorepro.com.br', '') : '')

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (slug) carregarDados()
  }, [slug])

  async function carregarDados() {
    const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)

    const { data: cats } = await supabase.from('categorias').select('*').eq('estabelecimento_id', est.id).order('ordem')
    const { data: prods } = await supabase.from('produtos').select('*').eq('estabelecimento_id', est.id).eq('disponivel', true).order('categoria_id')

    setCategorias(cats || [])
    setProdutos(prods || [])
    if (cats && cats.length > 0) setCategoriaAtiva(cats[0].id)
    setCarregando(false)
  }

  function adicionarAoCarrinho(produto: Produto) {
    setCarrinho(prev => {
      const existe = prev.find(i => i.id === produto.id)
      if (existe) return prev.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
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

  const totalItens = carrinho.reduce((a, i) => a + i.quantidade, 0)
  const totalValor = carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0)
  const produtosCategoria = produtos.filter(p => p.categoria_id === categoriaAtiva)

  function irParaPedido() {
    const carrinhoEnc = encodeURIComponent(JSON.stringify(carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, quantidade: i.quantidade }))))
    window.location.href = '/pedido?slug=' + slug + '&carrinho=' + carrinhoEnc
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Carregando cardapio...</p>
        </div>
      </div>
    )
  }

  if (!estabelecimento) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-gray-500">Estabelecimento nao encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-32">
      <div className="bg-gradient-to-r from-amber-700 to-amber-500 text-white px-4 py-6">
        <h1 className="text-2xl font-bold">{estabelecimento.nome}</h1>
        <p className="text-amber-100 text-sm">{estabelecimento.endereco}</p>
        <p className="text-amber-200 text-xs mt-1">Pagamento na entrega</p>
      </div>
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)}
              className={'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ' +
                (categoriaAtiva === cat.id ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {cat.nome}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {produtosCategoria.map(produto => {
          const noCarrinho = carrinho.find(i => i.id === produto.id)
          return (
            <div key={produto.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
              {produto.imagem_url && (
                <img src={produto.imagem_url} alt={produto.nome} className="w-24 h-24 object-cover flex-shrink-0" />
              )}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{produto.nome}</h3>
                  {produto.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{produto.descricao}</p>}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-amber-700">R$ {produto.preco.toFixed(2)}</span>
                  {noCarrinho ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => removerDoCarrinho(produto.id)}
                        className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-lg flex items-center justify-center">-</button>
                      <span className="font-bold text-amber-700 min-w-5 text-center">{noCarrinho.quantidade}</span>
                      <button onClick={() => adicionarAoCarrinho(produto)}
                        className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-lg flex items-center justify-center">+</button>
                    </div>
                  ) : (
                    <button onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-amber-700">
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {produtosCategoria.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum produto nesta categoria</p>
        )}
      </div>
      {totalItens > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto">
          <button onClick={irParaPedido}
            className="w-full bg-amber-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-between px-6 hover:bg-amber-700 transition">
            <span className="bg-amber-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{totalItens}</span>
            <span>Ver Pedido</span>
            <span>R$ {totalValor.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Cardapio() {
  return <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center"><p>Carregando...</p></div>}><CardapioContent /></Suspense>
}
