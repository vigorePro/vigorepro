'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Plus, Minus, X, Check, ShoppingCart, Users, Clock, Receipt, Trash2 } from 'lucide-react'

type StatusMesa = 'livre' | 'ocupada' | 'conta'

type Mesa = {
  id: string
  numero: number
  nome: string
  status: StatusMesa
  capacidade: number
  estabelecimento_id: string
}

type Produto = {
  id: string
  categoria_id: string
  nome: string
  preco: number
  imagem_url: string | null
}

type ItemComanda = {
  id: string
  mesa_id: string
  produto_id: string
  nome: string
  preco: number
  quantidade: number
  criado_em: string
}

type Categoria = {
  id: string
  nome: string
  ordem: number
}

const STATUS_CONFIG: Record<StatusMesa, { label: string; bg: string; text: string; border: string }> = {
  livre: { label: 'Livre', bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
  ocupada: { label: 'Ocupada', bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  conta: { label: 'Conta', bg: '#fff1f2', text: '#eb0029', border: '#fca5a5' },
}

function MesasContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [itensComanda, setItensComanda] = useState<ItemComanda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todas')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'mesas' | 'comanda' | 'cardapio'>('mesas')
  const [salvando, setSalvando] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [showNovaMesa, setShowNovaMesa] = useState(false)
  const [novaCapacidade, setNovaCapacidade] = useState(4)

  useEffect(() => { if (slug) carregarDados() }, [slug])

  useEffect(() => {
    if (!mesaSelecionada) return
    carregarComanda(mesaSelecionada.id)
  }, [mesaSelecionada])

  async function carregarDados() {
    setLoading(true)
    const { data: estab } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (!estab) { setLoading(false); return }
    setEstabelecimentoId(estab.id)

    const [{ data: mesasData }, { data: prodsData }, { data: catsData }] = await Promise.all([
      supabase.from('mesas').select('*').eq('estabelecimento_id', estab.id).order('numero'),
      supabase.from('produtos').select('id, categoria_id, nome, preco, imagem_url').eq('estabelecimento_id', estab.id).order('nome'),
      supabase.from('categorias').select('id, nome, ordem').eq('estabelecimento_id', estab.id).order('ordem'),
    ])

    setMesas(mesasData || [])
    setProdutos(prodsData || [])
    setCategorias(catsData || [])
    setLoading(false)
  }

  async function carregarComanda(mesaId: string) {
    const { data } = await supabase.from('itens_comanda').select('*').eq('mesa_id', mesaId).order('criado_em')
    setItensComanda(data || [])
  }

  async function criarMesa() {
    if (!novoNome.trim()) return
    setSalvando(true)
    const numero = Math.max(0, ...mesas.map(m => m.numero)) + 1
    const { data } = await supabase.from('mesas').insert({
      estabelecimento_id: estabelecimentoId,
      numero,
      nome: novoNome.trim(),
      status: 'livre',
      capacidade: novaCapacidade,
    }).select().single()
    if (data) setMesas(prev => [...prev, data])
    setNovoNome('')
    setNovaCapacidade(4)
    setShowNovaMesa(false)
    setSalvando(false)
  }

  async function abrirMesa(mesa: Mesa) {
    if (mesa.status === 'livre') {
      await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesa.id)
      setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, status: 'ocupada' } : m))
    }
    setMesaSelecionada({ ...mesa, status: mesa.status === 'livre' ? 'ocupada' : mesa.status })
    setView('comanda')
  }

  async function adicionarItem(produto: Produto) {
    if (!mesaSelecionada) return
    const existente = itensComanda.find(i => i.produto_id === produto.id)
    if (existente) {
      await supabase.from('itens_comanda').update({ quantidade: existente.quantidade + 1 }).eq('id', existente.id)
      setItensComanda(prev => prev.map(i => i.id === existente.id ? { ...i, quantidade: i.quantidade + 1 } : i))
    } else {
      const { data } = await supabase.from('itens_comanda').insert({
        mesa_id: mesaSelecionada.id,
        produto_id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: 1,
      }).select().single()
      if (data) setItensComanda(prev => [...prev, data])
    }
    setView('comanda')
  }

  async function alterarQuantidade(item: ItemComanda, delta: number) {
    const novaQtd = item.quantidade + delta
    if (novaQtd <= 0) {
      await supabase.from('itens_comanda').delete().eq('id', item.id)
      setItensComanda(prev => prev.filter(i => i.id !== item.id))
    } else {
      await supabase.from('itens_comanda').update({ quantidade: novaQtd }).eq('id', item.id)
      setItensComanda(prev => prev.map(i => i.id === item.id ? { ...i, quantidade: novaQtd } : i))
    }
  }

  async function pedirConta(mesa: Mesa) {
    await supabase.from('mesas').update({ status: 'conta' }).eq('id', mesa.id)
    setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, status: 'conta' } : m))
    setMesaSelecionada(prev => prev ? { ...prev, status: 'conta' } : null)
  }

  async function fecharConta(mesa: Mesa) {
    await supabase.from('itens_comanda').delete().eq('mesa_id', mesa.id)
    await supabase.from('mesas').update({ status: 'livre' }).eq('id', mesa.id)
    setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, status: 'livre' } : m))
    setItensComanda([])
    setMesaSelecionada(null)
    setView('mesas')
  }

  const totalComanda = itensComanda.reduce((acc, i) => acc + i.preco * i.quantidade, 0)
  const qtdItens = itensComanda.reduce((acc, i) => acc + i.quantidade, 0)

  const produtosFiltrados = produtos.filter(p => {
    const matchCat = categoriaAtiva === 'todas' || p.categoria_id === categoriaAtiva
    const matchBusca = buscaProduto === '' || p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
    return matchCat && matchBusca
  })

  const mesasPorStatus = {
    livre: mesas.filter(m => m.status === 'livre').length,
    ocupada: mesas.filter(m => m.status === 'ocupada').length,
    conta: mesas.filter(m => m.status === 'conta').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-500">Carregando mesas...</div>
    </div>
  )

  // === VIEW: CARDÁPIO PARA ADICIONAR ITEM ===
  if (view === 'cardapio') return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => setView('comanda')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800">Adicionar à {mesaSelecionada?.nome}</h1>
      </div>
      <div className="bg-white border-b px-4 py-2">
        <input type="text" placeholder="Buscar produto..." value={buscaProduto}
          onChange={e => setBuscaProduto(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
      </div>
      <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
        <button onClick={() => setCategoriaAtiva('todas')}
          className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={categoriaAtiva === 'todas' ? { backgroundColor: '#eb0029', color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#374151' }}>
          Todas
        </button>
        {categorias.map(cat => (
          <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={categoriaAtiva === cat.id ? { backgroundColor: '#eb0029', color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#374151' }}>
            {cat.nome}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {produtosFiltrados.map(produto => (
          <div key={produto.id} onClick={() => adicionarItem(produto)}
            className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-md transition-all">
            {produto.imagem_url
              ? <img src={produto.imagem_url} alt={produto.nome} className="w-full h-28 object-cover rounded-t-xl" />
              : <div className="w-full h-28 bg-gray-100 rounded-t-xl flex items-center justify-center text-gray-300 text-xs">sem foto</div>}
            <div className="p-2">
              <div className="text-sm font-semibold text-gray-800 line-clamp-2">{produto.nome}</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#eb0029' }}>
                R$ {produto.preco.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // === VIEW: COMANDA DA MESA ===
  if (view === 'comanda' && mesaSelecionada) {
    const cfg = STATUS_CONFIG[mesaSelecionada.status]
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setMesaSelecionada(null); setView('mesas') }} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-800">{mesaSelecionada.nome}</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
              {cfg.label}
            </span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setView('cardapio')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: '#eb0029' }}>
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {itensComanda.length === 0 ? (
            <div className="text-center py-20 text-gray-300">
              <ShoppingCart size={48} className="mx-auto mb-3" />
              <p className="text-sm">Comanda vazia. Toque em "+ Adicionar"</p>
            </div>
          ) : itensComanda.map(item => (
            <div key={item.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className="flex-1">
                <div className="font-medium text-gray-800 text-sm">{item.nome}</div>
                <div className="text-xs text-gray-400">R$ {item.preco.toFixed(2).replace('.', ',')} cada</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => alterarQuantidade(item, -1)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <Minus size={12} />
                </button>
                <span className="font-bold text-sm w-5 text-center">{item.quantidade}</span>
                <button onClick={() => alterarQuantidade(item, +1)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: '#eb0029' }}>
                  <Plus size={12} />
                </button>
              </div>
              <div className="text-sm font-bold text-gray-700 w-16 text-right">
                R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com total e ações */}
        {itensComanda.length > 0 && (
          <div className="bg-white border-t p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">{qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</span>
              <div className="text-xl font-black" style={{ color: '#eb0029' }}>
                R$ {totalComanda.toFixed(2).replace('.', ',')}
              </div>
            </div>
            <div className="flex gap-2">
              {mesaSelecionada.status === 'ocupada' && (
                <button onClick={() => pedirConta(mesaSelecionada)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-colors"
                  style={{ borderColor: '#eb0029', color: '#eb0029' }}>
                  <Receipt size={16} className="inline mr-1" /> Pedir Conta
                </button>
              )}
              {mesaSelecionada.status === 'conta' && (
                <button onClick={() => fecharConta(mesaSelecionada)}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors"
                  style={{ backgroundColor: '#16a34a' }}>
                  <Check size={16} className="inline mr-1" /> Fechar Conta
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // === VIEW: GRID DE MESAS ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/dashboard?slug=${slug}`)} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Mesas</h1>
        <div className="flex-1" />
        <button onClick={() => setShowNovaMesa(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: '#eb0029' }}>
          <Plus size={16} /> Nova Mesa
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {Object.entries(mesasPorStatus).map(([status, qtd]) => {
          const cfg = STATUS_CONFIG[status as StatusMesa]
          return (
            <div key={status} className="bg-white rounded-xl p-3 text-center shadow-sm border"
              style={{ borderColor: cfg.border }}>
              <div className="text-2xl font-black" style={{ color: cfg.text }}>{qtd}</div>
              <div className="text-xs text-gray-500 mt-0.5">{cfg.label}</div>
            </div>
          )
        })}
      </div>

      {/* Grid de mesas */}
      <div className="px-4 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {mesas.map(mesa => {
          const cfg = STATUS_CONFIG[mesa.status]
          return (
            <div key={mesa.id} onClick={() => abrirMesa(mesa)}
              className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md border-2"
              style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-black" style={{ color: cfg.text }}>{mesa.numero}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60"
                  style={{ color: cfg.text }}>{cfg.label}</span>
              </div>
              <div className="font-semibold text-gray-800 text-sm">{mesa.nome}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Users size={11} /> {mesa.capacidade} pax
              </div>
            </div>
          )
        })}
        {mesas.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🪑</div>
            <p className="text-sm">Nenhuma mesa criada ainda</p>
            <button onClick={() => setShowNovaMesa(true)}
              className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: '#eb0029' }}>
              Criar primeira mesa
            </button>
          </div>
        )}
      </div>

      {/* Modal nova mesa */}
      {showNovaMesa && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Nova Mesa</h2>
              <button onClick={() => setShowNovaMesa(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nome da Mesa</label>
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                  placeholder="Ex: Mesa 01, Varanda, Balcão..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Capacidade (pessoas)</label>
                <input type="number" value={novaCapacidade} onChange={e => setNovaCapacidade(+e.target.value)}
                  min={1} max={20}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <button onClick={criarMesa} disabled={!novoNome.trim() || salvando}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
                style={{ backgroundColor: '#eb0029' }}>
                {salvando ? 'Criando...' : 'Criar Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MesasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-gray-500">Carregando...</div></div>}>
      <MesasContent />
    </Suspense>
  )
}
