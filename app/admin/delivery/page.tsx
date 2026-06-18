'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from 'next/navigation'
import { Clock, RefreshCw, ShoppingBag, User, MapPin, MoreVertical, Maximize2, ChevronRight } from 'lucide-react'

type StatusPedido = 'aguardando' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'

interface Pedido {
  id: string
  numero_pedido: number
  cliente_nome: string
  cliente_telefone: string | null
  itens: { nome: string; quantidade: number; preco: number }[]
  valor_total: number
  endereco: string | null
  status: StatusPedido
  criado_em: string
  produzido_em: string | null
  saiu_em: string | null
  entregue_em: string | null
  entregador: string | null
  observacoes: string | null
  tipo_entrega: string
  forma_pagamento: string | null
  estabelecimento_id: string | null
}

// Cores exatas do BeeFood inspecionadas via DevTools
const COLUNAS: {
  status: StatusPedido
  label: string
  headerBg: string
  headerText: string
  countBg: string
  proximo: StatusPedido | null
  btnLabel: string
}[] = [
  {
    status: 'aguardando',
    label: 'Aguardando',
    headerBg: 'rgb(192, 130, 255)',
    headerText: '#020817',
    countBg: 'rgba(160, 80, 255, 0.2)',
    proximo: 'em_preparo',
    btnLabel: 'Iniciar Preparo',
  },
  {
    status: 'em_preparo',
    label: 'Em Preparo',
    headerBg: 'rgb(183, 255, 183)',
    headerText: '#020817',
    countBg: 'rgba(100, 220, 100, 0.3)',
    proximo: 'pronto',
    btnLabel: 'Marcar Pronto',
  },
  {
    status: 'pronto',
    label: 'Pronto / Saiu',
    headerBg: 'rgb(255, 255, 202)',
    headerText: '#020817',
    countBg: 'rgba(220, 220, 100, 0.3)',
    proximo: 'entregue',
    btnLabel: 'Confirmar Entrega',
  },
  {
    status: 'entregue',
    label: 'Entregue',
    headerBg: 'rgb(81, 81, 255)',
    headerText: '#ffffff',
    countBg: 'rgba(60, 60, 200, 0.3)',
    proximo: null,
    btnLabel: '',
  },
  {
    status: 'cancelado',
    label: 'Cancelado',
    headerBg: 'rgb(255, 107, 107)',
    headerText: '#020817',
    countBg: 'rgba(200, 50, 50, 0.2)',
    proximo: null,
    btnLabel: '',
  },
]

function formatarTempo(data: string): string {
  const diff = Math.floor((Date.now() - new Date(data).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff} min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}

function formatarValor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardPedido({
  pedido,
  onAvancar,
}: {
  pedido: Pedido
  onAvancar: (id: string, status: StatusPedido) => void
}) {
  const coluna = COLUNAS.find(c => c.status === pedido.status)
  const [tempo, setTempo] = useState(() => formatarTempo(pedido.criado_em))

  useEffect(() => {
    const t = setInterval(() => setTempo(formatarTempo(pedido.criado_em)), 30000)
    return () => clearInterval(t)
  }, [pedido.criado_em])

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow relative cursor-pointer hover:shadow-md">
      <div className="p-2.5 space-y-1.5">
        {/* Linha topo: número + menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-shrink-0 text-gray-400">
              {pedido.tipo_entrega === 'delivery' ? (
                <MapPin size={13} />
              ) : (
                <ShoppingBag size={13} />
              )}
            </div>
            <span className="font-bold text-sm truncate min-w-0 text-gray-800">
              #{pedido.numero_pedido}
            </span>
          </div>
          <button className="flex items-center justify-center rounded-full w-6 h-6 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Tipo de entrega */}
        <div className="space-y-0.5">
          <p className="font-semibold text-sm text-gray-700 truncate">
            {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}
          </p>
          {pedido.cliente_nome && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User size={10} />
              <span className="truncate">{pedido.cliente_nome}</span>
            </div>
          )}
          {pedido.endereco && pedido.tipo_entrega === 'delivery' && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={10} />
              <span className="truncate">{pedido.endereco}</span>
            </div>
          )}
        </div>

        {/* Rodapé: tempo + valor */}
        <div className="flex items-center justify-between pt-0.5 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={10} />
            {tempo}
          </span>
          <p className="text-base font-bold text-gray-900 whitespace-nowrap">
            {formatarValor(pedido.valor_total)}
          </p>
        </div>

        {/* Botão avançar status */}
        {coluna?.proximo && (
          <button
            onClick={e => {
              e.stopPropagation()
              onAvancar(pedido.id, coluna.proximo!)
            }}
            className="w-full flex items-center justify-center gap-1 rounded-md text-white text-xs py-1.5 font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#eb0029' }}
          >
            {coluna.btnLabel}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function KanbanColuna({
  coluna,
  pedidos,
  onAvancar,
}: {
  coluna: typeof COLUNAS[0]
  pedidos: Pedido[]
  onAvancar: (id: string, status: StatusPedido) => void
}) {
  return (
    <div className="flex flex-col flex-shrink-0 transition-all" style={{ width: '300px' }}>
      {/* Header da coluna - cores exatas do BeeFood */}
      <div
        className="flex items-center gap-2 mb-3 px-3 py-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: coluna.headerBg, color: coluna.headerText }}
      >
        <h3 className="font-semibold text-sm">{coluna.label}</h3>
        <span
          className="ml-auto px-2 py-0.5 rounded text-sm font-bold"
          style={{ backgroundColor: coluna.countBg }}
        >
          {pedidos.length}
        </span>
        <button
          className="flex items-center justify-center rounded-full w-6 h-6 hover:bg-black/10 ml-1 transition-colors"
          title="Expandir coluna"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="space-y-2">
          {pedidos.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum pedido
            </div>
          ) : (
            pedidos.map(p => (
              <CardPedido key={p.id} pedido={p} onAvancar={onAvancar} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function KanbanContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || 'dolcedolce'
  const supabase = createClientComponentClient()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const estabelecimentoId = useRef<string | null>(null)

  const carregarPedidos = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true)

      if (!estabelecimentoId.current) {
        const { data: est } = await supabase
          .from('estabelecimentos')
          .select('id')
          .eq('slug', slug)
          .single()
        if (est) estabelecimentoId.current = est.id
      }

      if (!estabelecimentoId.current) {
        setLoading(false)
        if (showRefresh) setRefreshing(false)
        return
      }

      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId.current)
        .order('criado_em', { ascending: false })
        .limit(300)

      if (data) setPedidos(data as Pedido[])
      setLoading(false)
      if (showRefresh) setRefreshing(false)
    },
    [slug, supabase]
  )

  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  // Realtime subscription
  useEffect(() => {
    if (!estabelecimentoId.current) return
    const channel = supabase
      .channel('kanban-delivery-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `estabelecimento_id=eq.${estabelecimentoId.current}`,
        },
        () => carregarPedidos()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, carregarPedidos])

  const avancarStatus = useCallback(
    async (id: string, novoStatus: StatusPedido) => {
      const agora = new Date().toISOString()
      const updates: Record<string, string> = { status: novoStatus }
      if (novoStatus === 'pronto') updates.produzido_em = agora
      if (novoStatus === 'entregue') updates.entregue_em = agora
      await supabase.from('pedidos').update(updates).eq('id', id)
      setPedidos(prev =>
        prev.map(p => (p.id === id ? { ...p, status: novoStatus, ...updates } : p))
      )
    },
    [supabase]
  )

  const pedidosFiltrados = busca.trim()
    ? pedidos.filter(
        p =>
          p.numero_pedido?.toString().includes(busca) ||
          p.cliente_nome?.toLowerCase().includes(busca.toLowerCase())
      )
    : pedidos

  const totalHoje = pedidos.filter(p => {
    const hoje = new Date().toDateString()
    return new Date(p.criado_em).toDateString() === hoje
  }).length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
        <button
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#eb0029' }}
        >
          + Novo Pedido
          <span className="text-xs opacity-70">(F1)</span>
        </button>

        <div className="relative">
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-9 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-48 placeholder:text-gray-400"
          />
        </div>

        <button
          onClick={() => carregarPedidos(true)}
          className="flex items-center justify-center rounded-full h-9 w-9 border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-600"
          title="Atualizar"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>

        <div className="ml-auto flex items-center gap-1 text-sm text-gray-500">
          <ShoppingBag size={14} />
          <span>{totalHoje} hoje</span>
        </div>
      </div>

      {/* Kanban Board - fundo cinza exato do BeeFood: hsl(220,13%,91%) */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden min-h-0"
        style={{ backgroundColor: 'hsl(220, 13%, 91%)' }}
      >
        <div className="flex gap-4 h-full px-6 py-4 w-max">
          {COLUNAS.map(coluna => (
            <KanbanColuna
              key={coluna.status}
              coluna={coluna}
              pedidos={pedidosFiltrados.filter(p => p.status === coluna.status)}
              onAvancar={avancarStatus}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DeliveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <RefreshCw className="animate-spin text-gray-400" size={24} />
        </div>
      }
    >
      <KanbanContent />
    </Suspense>
  )
}
