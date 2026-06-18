'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useSearchParams } from 'next/navigation'
import { Clock, RefreshCw, Search, ChevronRight, Phone, MapPin, ShoppingBag, X } from 'lucide-react'

type StatusPedido = 'aguardando' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'

interface ItemPedido {
  id: string
  nome: string
  quantidade: number
  preco: number
}

interface Pedido {
  id: string
  numero_pedido: number
  cliente_nome: string
  cliente_telefone: string
  itens: ItemPedido[]
  valor_total: number
  endereco: string
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
  cor: string
  bg: string
  proximo: StatusPedido | null
  btnLabel: string
}[] = [
  { status: 'aguardando', label: 'Aguardando', cor: 'text-purple-700', bg: 'bg-purple-100 border-purple-300', proximo: 'em_preparo', btnLabel: 'Iniciar Preparo' },
  { status: 'em_preparo', label: 'Em Preparo', cor: 'text-green-700', bg: 'bg-green-100 border-green-300', proximo: 'pronto', btnLabel: 'Marcar Pronto' },
  { status: 'pronto', label: 'Pronto / Saiu', cor: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300', proximo: 'entregue', btnLabel: 'Confirmar Entrega' },
  { status: 'entregue', label: 'Entregue', cor: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', proximo: null, btnLabel: '' },
  { status: 'cancelado', label: 'Cancelado', cor: 'text-red-700', bg: 'bg-red-100 border-red-300', proximo: null, btnLabel: '' },
]

function tempoDecorrido(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return diff + 'min'
  return Math.floor(diff / 60) + 'h' + (diff % 60 > 0 ? (diff % 60) + 'min' : '')
}

function CardPedido({
  pedido,
  onAvancar,
  onCancelar,
}: {
  pedido: Pedido
  onAvancar: (id: string, novoStatus: StatusPedido) => void
  onCancelar: (id: string) => void
}) {
  const coluna = COLUNAS.find((c) => c.status === pedido.status)!
  const itensList = Array.isArray(pedido.itens) ? pedido.itens : []

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-800 text-sm">#{pedido.numero_pedido}</span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={11} />
          {tempoDecorrido(pedido.criado_em)}
        </span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm leading-tight">{pedido.cliente_nome}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <Phone size={10} />
          {pedido.cliente_telefone}
        </p>
      </div>
      <div className="text-xs text-gray-600 border-t pt-2">
        <p className="font-medium text-gray-700 mb-1 flex items-center gap-1">
          <ShoppingBag size={11} />
          {itensList.length} {itensList.length === 1 ? 'item' : 'itens'}
        </p>
        {itensList.slice(0, 3).map((item, i) => (
          <p key={i} className="truncate">
            {item.quantidade}x {item.nome}
          </p>
        ))}
        {itensList.length > 3 && <p className="text-gray-400">+{itensList.length - 3} mais...</p>}
      </div>
      {pedido.tipo_entrega === 'delivery' && pedido.endereco && (
        <p className="text-xs text-gray-500 flex items-start gap-1 border-t pt-2">
          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
          <span className="truncate">{pedido.endereco}</span>
        </p>
      )}
      {pedido.observacoes && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 italic">
          {pedido.observacoes}
        </p>
      )}
      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-bold text-green-700 text-sm">
          R$ {Number(pedido.valor_total).toFixed(2).replace('.', ',')}
        </span>
        <span className="text-xs text-gray-400 capitalize">
          {pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}
        </span>
      </div>
      <div className="flex gap-2 mt-1">
        {coluna.proximo && (
          <button
            onClick={() => onAvancar(pedido.id, coluna.proximo!)}
            className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            {coluna.btnLabel}
            <ChevronRight size={13} />
          </button>
        )}
        {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
          <button
            onClick={() => onCancelar(pedido.id)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cancelar pedido"
          >
            <X size={14} />
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
  onCancelar,
}: {
  coluna: (typeof COLUNAS)[0]
  pedidos: Pedido[]
  onAvancar: (id: string, novoStatus: StatusPedido) => void
  onCancelar: (id: string) => void
}) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[300px] flex-shrink-0">
      <div className={'rounded-xl px-4 py-3 mb-3 border-2 flex items-center justify-between ' + coluna.bg}>
        <span className={'font-bold text-sm ' + coluna.cor}>{coluna.label}</span>
        <span className={'text-xs font-bold px-2 py-0.5 rounded-full bg-white/60 ' + coluna.cor}>
          {pedidos.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
        {pedidos.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-8 border-2 border-dashed border-gray-200 rounded-xl">
            Nenhum pedido
          </div>
        ) : (
          pedidos.map((p) => (
            <CardPedido key={p.id} pedido={p} onAvancar={onAvancar} onCancelar={onCancelar} />
          ))
        )}
      </div>
    </div>
  )
}

function KanbanContent() {
  const supabase = createClientComponentClient()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || 'dolcedolce'

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())

  const carregarPedidos = useCallback(async () => {
    const { data: estab } = await supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!estab) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estab.id)
      .not('status', 'eq', 'entregue')
      .not('status', 'eq', 'cancelado')
      .order('criado_em', { ascending: true })

    if (data) {
      setPedidos(data as Pedido[])
      setUltimaAtualizacao(new Date())
    }
    setLoading(false)
  }, [slug, supabase])

  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  useEffect(() => {
    const channel = supabase
      .channel('pedidos-kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        carregarPedidos()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, carregarPedidos])

  const avancarStatus = async (id: string, novoStatus: StatusPedido) => {
    const agora = new Date().toISOString()
    const updates: Record<string, string> = { status: novoStatus }
    if (novoStatus === 'em_preparo') updates.produzido_em = agora
    if (novoStatus === 'pronto') updates.saiu_em = agora
    if (novoStatus === 'entregue') updates.entregue_em = agora
    await supabase.from('pedidos').update(updates).eq('id', id)
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, status: novoStatus } : p))
    )
  }

  const cancelarPedido = async (id: string) => {
    if (!confirm('Cancelar este pedido?')) return
    await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', id)
    setPedidos((prev) => prev.filter((p) => p.id !== id))
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      p.cliente_nome.toLowerCase().includes(q) ||
      p.cliente_telefone.includes(q) ||
      String(p.numero_pedido).includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <h1 className="font-bold text-gray-900 text-lg">Delivery</h1>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pedido, cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <button
          onClick={carregarPedidos}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
        <span className="text-xs text-gray-400 hidden sm:block">
          Atualizado {tempoDecorrido(ultimaAtualizacao.toISOString())}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} ativo{pedidos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {COLUNAS.map((col) => (
            <KanbanColuna
              key={col.status}
              coluna={col}
              pedidos={pedidosFiltrados.filter((p) => p.status === col.status)}
              onAvancar={avancarStatus}
              onCancelar={cancelarPedido}
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
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <RefreshCw className="animate-spin w-8 h-8 text-gray-400" />
        </div>
      }
    >
      <KanbanContent />
    </Suspense>
  )
}
