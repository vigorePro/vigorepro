'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Search, RefreshCw, LayoutGrid, List, Zap, Filter, MoreVertical, Clock, User, ChefHat } from 'lucide-react'

interface Pedido {
  id: string
  numero: number
  status: string
  tipo: string
  total: number
  cliente_nome: string
  cliente_telefone: string
  endereco: string
  forma_pagamento: string
  itens: any[]
  criado_em: string
}

const COLUNAS = [
  { key: 'aguardando', label: 'Aguardando', cor: '#a78bfa', corBg: '#1e1b2e' },
  { key: 'em_preparo',  label: 'Preparo',    cor: '#4ade80', corBg: '#0f2018' },
  { key: 'pronto',     label: 'Pronto/Em Entrega', cor: '#facc15', corBg: '#1e1a0f' },
  { key: 'entregue',   label: 'Entregue',   cor: '#818cf8', corBg: '#13131e' },
  { key: 'cancelado',  label: 'Cancelado',  cor: '#f87171', corBg: '#1e1010' },
]

const PROXSTATUS: Record<string,string> = {
  aguardando: 'em_preparo', em_preparo: 'pronto', pronto: 'entregue'
}
const BTNLABEL: Record<string,string> = {
  aguardando: 'INICIAR PREPARO', em_preparo: 'PEDIDO PRONTO', pronto: 'MARCAR ENTREGUE'
}

function tempoDecorrido(criado: string) {
  const diff = Math.floor((Date.now() - new Date(criado).getTime()) / 60000)
  if (diff < 60) return diff + 'min'
  return Math.floor(diff / 60) + 'h ' + (diff % 60) + 'min'
}

function DeliveryContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [estabId, setEstabId] = useState<string | null>(null)
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [modalNovo, setModalNovo] = useState(false)
  const [novoCliente, setNovoCliente] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoTipo, setNovoTipo] = useState<'delivery'|'retirada'>('delivery')
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabId(data.id) })
  }, [slug])

  useEffect(() => {
    if (!estabId) return
    fetchPedidos()
    const canal = supabase.channel('delivery-' + estabId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + estabId }, fetchPedidos)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [estabId])

  const fetchPedidos = async () => {
    if (!estabId) return
    const { data } = await supabase.from('pedidos').select('*')
      .eq('estabelecimento_id', estabId)
      .not('status', 'eq', 'entregue')
      .order('criado_em', { ascending: true })
    if (data) setPedidos(data)
  }

  const pedidosDaColuna = (status: string) => pedidos.filter(p => p.status === status)

  const avancarStatus = async (pedido: Pedido) => {
    const proximo = PROXSTATUS[pedido.status]
    if (!proximo) return
    await supabase.from('pedidos').update({ status: proximo }).eq('id', pedido.id)
    fetchPedidos()
    if (pedidoAberto?.id === pedido.id) setPedidoAberto({ ...pedidoAberto, status: proximo })
  }

  const criarPedido = async () => {
    if (!estabId || !novoCliente) return
    setCriando(true)
    const { data: ultimo } = await supabase.from('pedidos').select('numero').eq('estabelecimento_id', estabId).order('numero', { ascending: false }).limit(1).single()
    const numero = (ultimo?.numero || 0) + 1
    await supabase.from('pedidos').insert({
      estabelecimento_id: estabId,
      numero,
      status: 'aguardando',
      tipo: novoTipo,
      total: 0,
      cliente_nome: novoCliente,
      cliente_telefone: novoTelefone,
      itens: [],
    })
    setModalNovo(false)
    setNovoCliente('')
    setNovoTelefone('')
    setCriando(false)
    fetchPedidos()
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#2a2a2a', backgroundColor: '#111111' }}>
        <button onClick={() => setModalNovo(true)}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ backgroundColor: '#eb0029' }}>
          <Plus size={16} /> Novo Pedido (F1)
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 max-w-xs"
          style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
          <Search size={14} style={{ color: '#6b7280' }} />
          <input placeholder="Buscar pedido..." className="bg-transparent outline-none text-sm text-white flex-1 placeholder-gray-500"
            style={{ color: '#e5e7eb' }} />
        </div>
        <button onClick={fetchPedidos} className="p-2 rounded-lg border" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}>
          <RefreshCw size={15} style={{ color: '#9ca3af' }} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: '#2a2a2a', color: '#9ca3af', backgroundColor: '#1a1a1a' }}>
            <Clock size={12} className="inline mr-1" />25 min
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: '#2a2a2a', color: '#9ca3af', backgroundColor: '#1a1a1a' }}>
            45-65 min
          </span>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: '#2a2a2a', color: '#9ca3af', backgroundColor: '#1a1a1a' }}>
            <User size={12} /> Retirada
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-white text-xs" style={{ backgroundColor: '#eb0029' }}>
              {pedidosDaColuna('aguardando').filter(p => p.tipo === 'retirada').length}
            </span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: '#2a2a2a', color: '#9ca3af', backgroundColor: '#1a1a1a' }}>
            Manual
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#374151', color: '#9ca3af' }}>
              {pedidos.length}
            </span>
          </div>
          <span className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af' }}>
            <span style={{ color: '#10b981' }}>●</span> Aceite automático
          </span>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex flex-1 overflow-hidden">
        {COLUNAS.map(col => {
          const lista = pedidosDaColuna(col.key)
          return (
            <div key={col.key} className="flex flex-col flex-1 min-w-0 border-r last:border-r-0" style={{ borderColor: '#2a2a2a' }}>
              {/* Header coluna */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#2a2a2a', backgroundColor: col.corBg }}>
                <span className="text-sm font-semibold" style={{ color: col.cor }}>{col.label}</span>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: col.cor }}>{lista.length}</span>
                </div>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ backgroundColor: '#111111' }}>
                {lista.length === 0 ? (
                  <p className="text-center py-8 text-xs" style={{ color: '#374151' }}>Nenhum pedido</p>
                ) : lista.map(pedido => (
                  <button key={pedido.id} onClick={() => setPedidoAberto(pedido)}
                    className="w-full text-left rounded-xl p-3 border transition-all"
                    style={{
                      backgroundColor: pedidoAberto?.id === pedido.id ? '#1e1e1e' : '#1a1a1a',
                      borderColor: pedidoAberto?.id === pedido.id ? col.cor : '#2a2a2a'
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <User size={14} style={{ color: col.cor }} />
                        <span className="text-xs font-bold text-white">#{pedido.numero}</span>
                      </div>
                      <MoreVertical size={14} style={{ color: '#4b5563' }} />
                    </div>
                    <p className="text-xs font-medium text-white mb-1">{pedido.tipo === 'retirada' ? 'Retirada' : 'Delivery'}</p>
                    <p className="text-xs mb-2" style={{ color: '#6b7280' }}>{pedido.cliente_nome || 'Cliente'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs flex items-center gap-1" style={{ color: '#6b7280' }}>
                        <Clock size={11} />{tempoDecorrido(pedido.criado_em)}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: col.cor }}>
                        R$ {(pedido.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* Painel lateral do pedido */}
        {pedidoAberto && (
          <div className="w-80 flex-shrink-0 border-l flex flex-col" style={{ borderColor: '#2a2a2a', backgroundColor: '#161616' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2a2a' }}>
              <div>
                <span className="text-sm font-bold text-white">Venda Nº {pedidoAberto.numero}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium uppercase"
                  style={{ backgroundColor: COLUNAS.find(c => c.key === pedidoAberto.status)?.cor + '33', color: COLUNAS.find(c => c.key === pedidoAberto.status)?.cor }}>
                  {COLUNAS.find(c => c.key === pedidoAberto.status)?.label}
                </span>
              </div>
              <button onClick={() => setPedidoAberto(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Tipo</p>
                <p className="text-sm font-medium text-white capitalize">{pedidoAberto.tipo === 'retirada' ? 'Retirada Balcão' : 'Delivery'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Cliente</p>
                <p className="text-sm font-medium text-white">{pedidoAberto.cliente_nome || 'Não informado'}</p>
                {pedidoAberto.cliente_telefone && (
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{pedidoAberto.cliente_telefone}</p>
                )}
              </div>
              {pedidoAberto.endereco && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Endereço</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>{pedidoAberto.endereco}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#6b7280' }}>
                  Produtos ({Array.isArray(pedidoAberto.itens) ? pedidoAberto.itens.length : 0})
                </p>
                {Array.isArray(pedidoAberto.itens) && pedidoAberto.itens.length > 0 ? (
                  <div className="space-y-2">
                    {pedidoAberto.itens.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm rounded-lg px-3 py-2" style={{ backgroundColor: '#1e1e1e' }}>
                        <span className="text-white">{item.quantidade || 1}x {item.nome}</span>
                        <span style={{ color: '#9ca3af' }}>R$ {((item.preco || 0) * (item.quantidade || 1)).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: '#4b5563' }}>Sem itens registrados</p>
                )}
              </div>
              {pedidoAberto.forma_pagamento && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Pagamento</p>
                  <p className="text-sm text-white capitalize">{pedidoAberto.forma_pagamento}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t" style={{ borderColor: '#2a2a2a' }}>
              <div className="flex justify-between text-sm mb-3">
                <span style={{ color: '#9ca3af' }}>Valor Total</span>
                <span className="font-bold text-white">R$ {(pedidoAberto.total || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              {PROXSTATUS[pedidoAberto.status] && (
                <button onClick={() => avancarStatus(pedidoAberto)}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition"
                  style={{ backgroundColor: COLUNAS.find(c => c.key === pedidoAberto.status)?.cor, color: '#000' }}>
                  {BTNLABEL[pedidoAberto.status]}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Pedido */}
      {modalNovo && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-96" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-lg font-bold text-white mb-4">Novo Pedido</h2>
            <div className="space-y-3">
              <input placeholder="Nome do cliente *" value={novoCliente} onChange={e => setNovoCliente(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ backgroundColor: '#111111', border: '1px solid #374151' }} />
              <input placeholder="Telefone" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ backgroundColor: '#111111', border: '1px solid #374151' }} />
              <div className="flex gap-2">
                {(['delivery','retirada'] as const).map(t => (
                  <button key={t} onClick={() => setNovoTipo(t)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium capitalize"
                    style={{ backgroundColor: novoTipo === t ? '#eb0029' : '#111111', color: novoTipo === t ? '#fff' : '#9ca3af', border: '1px solid ' + (novoTipo === t ? '#eb0029' : '#374151') }}>
                    {t === 'delivery' ? 'Delivery' : 'Retirada'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalNovo(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#111111', color: '#9ca3af', border: '1px solid #374151' }}>Cancelar</button>
              <button onClick={criarPedido} disabled={!novoCliente || criando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#eb0029' }}>
                {criando ? 'Criando...' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#111111' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <DeliveryContent />
    </Suspense>
  )
}
