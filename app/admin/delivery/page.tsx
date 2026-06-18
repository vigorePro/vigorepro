'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from 'next/navigation'
import { Clock, RefreshCw, ShoppingBag, User, MapPin, Phone, MoreVertical, Maximize2, ChevronRight } from 'lucide-react'

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

const COLUNAS: {
  status: StatusPedido
  label: string
  bg: string
  count_bg: string
  proximo: StatusPedido | null
  btnLabel: string
}[] = [
  { status: 'aguardando', label: 'Aguardando', bg: 'bg-[rgb(192,130,255)]', count_bg: 'bg-purple-200/60', proximo: 'em_preparo', btnLabel: 'Iniciar Preparo' },
  { status: 'em_preparo', label: 'Em Preparo', bg: 'bg-[rgb(183,255,183)]', count_bg: 'bg-green-200/60', proximo: 'pronto', btnLabel: 'Marcar Pronto' },
  { status: 'pronto', label: 'Pronto / Saiu', bg: 'bg-[rgb(255,255,202)]', count_bg: 'bg-yellow-200/60', proximo: 'entregue', btnLabel: 'Confirmar Entrega' },
  { status: 'entregue', label: 'Entregue', bg: 'bg-[rgb(81,81,255)] text-white', count_bg: 'bg-blue-400/30', proximo: null, btnLabel: '' },
  { status: 'cancelado', label: 'Cancelado', bg: 'bg-[rgb(255,107,107)]', count_bg: 'bg-red-200/60', proximo: null, btnLabel: '' },
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

function CardPedido({ pedido, onAvancar }: { pedido: Pedido; onAvancar: (id: string, status: StatusPedido) => void }) {
  const coluna = COLUNAS.find(c => c.status === pedido.status)
  const [tempo, setTempo] = useState(() => formatarTempo(pedido.criado_em))

  useEffect(() => {
    const t = setInterval(() => setTempo(formatarTempo(pedido.criado_em)), 30000)
    return () => clearInterval(t)
  }, [pedido.criado_em])

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow transition-shadow relative cursor-pointer hover:shadow-md">
      <div className="p-2 space-y-1.5">
        {/* Linha topo: número + menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-shrink-0">
              {pedido.tipo_entrega === 'delivery' ? (
                <MapPin size={13} className="text-muted-foreground" />
              ) : (
                <ShoppingBag size={13} className="text-muted-foreground" />
              )}
            </div>
            <span className="font-bold text-sm truncate min-w-0">#{pedido.numero_pedido}</span>
          </div>
          <button className="inline-flex items-center justify-center rounded-full text-sm font-medium h-6 w-6 hover:bg-accent hover:text-accent-foreground">
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Info do pedido */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate min-w-0 flex-shrink">
              {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}
            </p>
          </div>
          {pedido.cliente_nome && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User size={10} />
              <span className="truncate">{pedido.cliente_nome}</span>
            </div>
          )}
          {pedido.endereco && pedido.tipo_entrega === 'delivery' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} />
              <span className="truncate">{pedido.endereco}</span>
            </div>
          )}
        </div>

        {/* Rodapé: tempo + valor */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} />
            {tempo}
          </span>
          <p className="text-base font-bold text-foreground whitespace-nowrap">
            {formatarValor(pedido.valor_total)}
          </p>
        </div>

        {/* Botão avançar status */}
        {coluna?.proximo && (
          <button
            onClick={() => onAvancar(pedido.id, coluna.proximo!)}
            className="w-full mt-1 flex items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground text-xs py-1.5 font-medium hover:bg-primary/90 transition-colors"
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
      {/* Header da coluna */}
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-full flex-shrink-0 ${coluna.bg}`}>
        <h3 className="font-semibold text-sm">{coluna.label}</h3>
        <span className={`ml-auto px-2 py-0.5 rounded text-sm font-bold ${coluna.count_bg}`}>
          {pedidos.length}
        </span>
        <button className="inline-flex items-center justify-center rounded-full text-sm font-medium h-6 w-6 hover:bg-black/10 ml-1">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 kanban-scroll">
        <div className="space-y-2">
          {pedidos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
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

  const carregarPedidos = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    if (!estabelecimentoId.current) {
      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('id')
        .eq('slug', slug)
        .single()
      if (est) estabelecimentoId.current = est.id
    }
    if (!estabelecimentoId.current) { setLoading(false); if (showRefresh) setRefreshing(false); return }

    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId.current)
      .not('status', 'eq', 'entregue')
      .order('criado_em', { ascending: false })
      .limit(200)

    if (data) setPedidos(data as Pedido[])
    setLoading(false)
    if (showRefresh) setRefreshing(false)
  }, [slug, supabase])

  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  useEffect(() => {
    if (!estabelecimentoId.current) return
    const channel = supabase
      .channel('kanban-pedidos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `estabelecimento_id=eq.${estabelecimentoId.current}`,
      }, () => carregarPedidos())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, carregarPedidos])

  const avancarStatus = useCallback(async (id: string, novoStatus: StatusPedido) => {
    const agora = new Date().toISOString()
    const updates: Record<string, string> = { status: novoStatus }
    if (novoStatus === 'pronto') updates.produzido_em = agora
    if (novoStatus === 'entregue') updates.entregue_em = agora

    await supabase.from('pedidos').update(updates).eq('id', id)
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus, ...updates } : p))
  }, [supabase])

  const pedidosFiltrados = busca
    ? pedidos.filter(p =>
        p.numero_pedido?.toString().includes(busca) ||
        p.cliente_nome?.toLowerCase().includes(busca.toLowerCase())
      )
    : pedidos

  const pedidosHoje = pedidos.filter(p => {
    const hoje = new Date().toDateString()
    return new Date(p.criado_em).toDateString() === hoje
  })

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-muted/60 overflow-hidden flex flex-col my-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background border-b flex-shrink-0 flex-wrap">
        <button className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
          + Novo Pedido <span className="text-xs opacity-70">(F1)</span>
        </button>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="flex h-9 rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-48"
          />
        </div>
        <button
          onClick={() => carregarPedidos(true)}
          className="inline-flex items-center justify-center rounded-full h-9 w-9 border hover:bg-muted transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShoppingBag size={14} />
            {pedidosHoje.length} hoje
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 bg-[hsl(220,13%,91%)]">
        <div className="flex gap-4 h-full px-6 w-max bg-muted py-4">
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
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    }>
      <KanbanContent />
    </Suspense>
  )
}
