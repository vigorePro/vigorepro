'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Estabelecimento, Categoria, Produto } from '@/lib/supabase'

type CarrinhoItem = Produto & { quantidade: number }

export default function Cardapio() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

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
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!est) { setCarregando(false); return }
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

  function removerDoCarrinho(produtoId: string) {
    setCarrinho(prev => {
      const existe = prev.find(i => i.id === produtoId)
      if (existe && existe.quantidade > 1) return prev.map(i => i.id === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i)
      return prev.filter(i => i.id !== produtoId)
    })
  }

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0)
  const itensCarrinho = carrinho.reduce((acc, i) => acc + i.quantidade, 0)
  const produtosDaCategoria = produtos.filter(p => p.categoria_id === categoriaAtiva)

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EDE0' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: '#C8956C', borderTopColor: 'transparent' }}></div>
        <p style={{ color: '#7B3F1E' }}>Carregando cardápio...</p>
      </div>
    </div>
  )

  if (!estabelecimento) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EDE0' }}>
      <div className="text-center p-8">
        <p className="text-2xl mb-2">🔍</p>
        <p className="text-gray-600">Estabelecimento não encontrado</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#F5EDE0' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-md py-4 px-4" style={{ backgroundColor: '#7B3F1E' }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-white text-xl font-bold">{estabelecimento.nome}</h1>
          <p className="text-orange-200 text-sm">{estabelecimento.tipo} · {estabelecimento.endereco}</p>
        </div>
      </div>

      {/* Categorias */}
      <div className="sticky top-16 z-10 bg-white shadow-sm overflow-x-auto">
        <div className="flex px-4 py-2 gap-2 max-w-2xl mx-auto">
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: categoriaAtiva === cat.id ? '#C8956C' : '#F5EDE0',
                color: categoriaAtiva === cat.id ? 'white' : '#7B3F1E'
              }}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Produtos */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {produtosDaCategoria.map(produto => {
          const itemCarrinho = carrinho.find(i => i.id === produto.id)
          return (
            <div key={produto.id} className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    {produto.destaque && <span className="text-xs font-medium px-2 py-0.5 rounded-full mb-1 inline-block" style={{ backgroundColor: '#F5EDE0', color: '#7B3F1E' }}>⭐ Destaque</span>}
                    <h3 className="font-semibold text-gray-800">{produto.nome}</h3>
                    <p className="text-gray-500 text-sm mt-1">{produto.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-lg" style={{ color: '#7B3F1E' }}>
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </span>
                  {itemCarrinho ? (
                    <div className="flex items-center gap-3">
                      <button onClick={() => removerDoCarrinho(produto.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#C8956C' }}>-</button>
                      <span className="font-bold" style={{ color: '#7B3F1E' }}>{itemCarrinho.quantidade}</span>
                      <button onClick={() => adicionarAoCarrinho(produto)} className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#7B3F1E' }}>+</button>
                    </div>
                  ) : (
                    <button onClick={() => adicionarAoCarrinho(produto)} className="px-4 py-2 rounded-full text-white text-sm font-medium" style={{ backgroundColor: '#7B3F1E' }}>
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Carrinho flutuante */}
      {itensCarrinho > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <a href={'/pedido?slug=' + slug + '&carrinho=' + encodeURIComponent(JSON.stringify(carrinho))}>
            <button className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-between px-6 shadow-lg" style={{ backgroundColor: '#7B3F1E' }}>
              <span className="bg-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold" style={{ color: '#7B3F1E' }}>{itensCarrinho}</span>
              <span>Ver pedido</span>
              <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
            </button>
          </a>
        </div>
      )}
    </div>
  )
}
