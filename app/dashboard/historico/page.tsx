'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Calendar, Search, ChevronDown } from 'lucide-react'

interface Pedido {
  id: string
  numero: number
  tipo: string
  status: string
  total: number
  forma_pagamento: string
  cliente_nome: string
  criado_em: string
  itens: ItemPedido[]
}

interface ItemPedido {
  id: string
  nome: string
  quantidade: number
  preco: number
}

function HistoricoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroData, setFiltroData] = useState('hoje')
  const [busca, setBusca] = useState('')
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)

  const dataInicio = () => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (filtroData === 'hoje') return hoje.toISOString()
    if (filtroData === 'semana') {
      const semana = new Date()
      semana.setDate(semana.getDate() - 7)
      return semana.toISOString()
    }
    if (filtroData === 'mes') {
      const mes = new Date()
      mes.setDate(1)
      mes.setHours(0, 0, 0, 0)
      return mes.toISOString()
    }
    return ''
  }

  useEffect(() => {
    if (!slug) return
    const fetchEstabelecimento = async () => {
      const { data } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', slug)
        .single()
      if (data) setEstabelecimentoId(data.id)
    }
    fetchEstabelecimento()
  }, [slug])

  useEffect(() => {
    if (!estabelecimentoId) return
    fetchPedidos()
  }, [estabelecimentoId, filtroData])

  const fetchPedidos = async () => {
    setCarregando(true)
    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('status', 'entregue')
      .order('criado_em', { ascending: false })

    const inicio = dataInicio()
    if (inicio) {
      query = query.gte('criado_em', inicio)
    }

    const { data, error } = await query
    if (!error && data) {
      setPedidos(data)
    }
    setCarregando(false)
  }

  const totalReceita = pedidos.reduce((acc, p) => acc + (p.total || 0), 0)
  const ticketMedio = pedidos.length > 0 ? totalReceita / pedidos.length : 0

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca) return true
    const buscaLower = busca.toLowerCase()
    return (
      p.numero?.toString().includes(buscaLower) ||
      p.cliente_nome?.toLowerCase().includes(buscaLower) ||
      p.forma_pagamento?.toLowerCase().includes(buscaLower)
    )
  })

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
  }

  const labelFiltro = () => {
    if (filtroData === 'hoje') return 'Hoje'
    if (filtroData === 'semana') return 'Últimos 7 dias'
    if (filtroData === 'mes') return 'Este mês'
    return 'Todos'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard?slug=${slug}`)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Histórico de Vendas</h1>
        </div>

        {/* Filtro de período */}
        <div className="flex items-center gap-2">
          {['hoje', 'semana', 'mes', 'todos'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltroData(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroData === f
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={filtroData === f ? { backgroundColor: '#eb0029' } : {}}
            >
              {f === 'hoje' ? 'Hoje' : f === 'semana' ? '7 dias' : f === 'mes' ? 'Mês' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Receita Total</span>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <DollarSign size={18} style={{ color: '#eb0029' }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatarMoeda(totalReceita)}</p>
            <p className="text-xs text-gray-400 mt-1">{labelFiltro()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total de Pedidos</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingBag size={18} className="text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pedidos.length}</p>
            <p className="text-xs text-gray-400 mt-1">pedidos finalizados</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Ticket Médio</span>
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp size={18} className="text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatarMoeda(ticketMedio)}</p>
            <p className="text-xs text-gray-400 mt-1">por pedido</p>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou pagamento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-gray-400 hover:text-gray-600 text-xs">
                limpar
              </button>
            )}
          </div>
        </div>

        {/* Lista de pedidos */}
        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum pedido encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              {busca ? 'Tente outro termo de busca' : `Nenhum pedido finalizado ${labelFiltro().toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setPedidoAberto(pedidoAberto === pedido.id ? null : pedido.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#eb0029' }}>
                      #{pedido.numero || '?'}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">
                        {pedido.cliente_nome || 'Cliente não identificado'}
                      </p>
                      <p className="text-xs text-gray-400">{formatarData(pedido.criado_em)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatarMoeda(pedido.total)}</p>
                      <p className="text-xs text-gray-400 capitalize">{pedido.tipo || 'delivery'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pedido.forma_pagamento && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                          {pedido.forma_pagamento}
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        className={`text-gray-400 transition-transform ${pedidoAberto === pedido.id ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </button>

                {pedidoAberto === pedido.id && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens do Pedido</p>
                    {pedido.itens && pedido.itens.length > 0 ? (
                      <div className="space-y-1">
                        {pedido.itens.map((item: ItemPedido, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantidade}x {item.nome}</span>
                            <span className="text-gray-600">{formatarMoeda(item.preco * item.quantidade)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Detalhes dos itens não disponíveis</p>
                    )}
                    <div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span style={{ color: '#eb0029' }}>{formatarMoeda(pedido.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <HistoricoContent />
    </Suspense>
  )
}

