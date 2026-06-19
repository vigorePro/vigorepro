'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bike, Search, RefreshCw, Plus, Clock, MapPin, Phone, ChevronRight, LayoutGrid, List, Check, X, AlertCircle, Printer, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Pedido = {
  id: string
  numero_pedido: number
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string | null
  cliente_endereco: string | null
  status: string
  total: number
  forma_pagamento: string
  tipo: string
  tempo_estimado: number | null
  observacao: string | null
  created_at: string
  itens?: ItemPedido[]
}

type ItemPedido = {
  id: string
  pedido_id: string
  nome: string
  quantidade: number
  preco: number
  observacao: string | null
}

const STATUS_COLS = [
  { id: 'aguardando', label: 'Aguardando', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)' },
  { id: 'preparo', label: 'Preparo', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.3)' },
  { id: 'pronto', label: 'Pronto / Em Entrega', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)' },
  { id: 'entregue', label: 'Entregue', color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.3)' },
]

const PROXIMO_STATUS: Record<string, string> = {
  aguardando: 'preparo',
  preparo: 'pronto',
  pronto: 'entregue',
}

const LABEL_PROXIMO: Record<string, string> = {
  aguardando: 'Aceitar',
  preparo: 'Pronto',
  pronto: 'Entregue',
}

function tempoRelativo(dt: string): string {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff === 1) return '1 min'
  if (diff < 60) return diff + ' min'
  return Math.floor(diff / 60) + 'h' + (diff % 60 > 0 ? (diff % 60) + 'm' : '')
}

function CardPedido({ pedido, onMover, onCancelar }: { pedido: Pedido; onMover: (id: string, status: string) => void; onCancelar: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const proximo = PROXIMO_STATUS[pedido.status]
  const labelBtn = LABEL_PROXIMO[pedido.status]
  const minutos = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 60000)
  const urgente = minutos >= 20 && pedido.status === 'aguardando'

  return (
    <div style={{ background: '#1a1a1a', border: urgente ? '1px solid rgba(239,66,57,0.5)' : '1px solid #292929', borderRadius: '10px', padding: '14px', marginBottom: '10px', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {urgente && <AlertCircle size={14} color="#ef4239" />}
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>#{pedido.numero_pedido}</span>
          <span style={{ fontSize: '11px', color: '#666', background: '#111', padding: '2px 6px', borderRadius: '4px' }}>{tempoRelativo(pedido.created_at)}</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4239' }}>R$ {Number(pedido.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>

      {/* Cliente */}
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6', marginBottom: '4px' }}>{pedido.cliente_nome}</div>

      {/* Endereco */}
      {pedido.cliente_endereco && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '4px' }}>
          <MapPin size={12} color="#666" style={{ marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#999', lineHeight: '1.4' }}>{pedido.cliente_endereco}</span>
        </div>
      )}

      {/* Pagamento */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: '#999', background: '#111', padding: '2px 8px', borderRadius: '12px' }}>{pedido.forma_pagamento}</span>
        {pedido.observacao && <span style={{ fontSize: '11px', color: '#f59e0b' }}>OBS</span>}
      </div>

      {/* Itens expandido */}
      {expanded && pedido.itens && pedido.itens.length > 0 && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #292929', paddingTop: '10px' }}>
          {pedido.itens.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999', marginBottom: '4px' }}>
              <span>{item.quantidade}x {item.nome}{item.observacao ? ' (' + item.observacao + ')' : ''}</span>
              <span style={{ color: '#e6e6e6' }}>R$ {(item.quantidade * item.preco).toFixed(2)}</span>
            </div>
          ))}
          {pedido.observacao && (
            <div style={{ marginTop: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#f59e0b' }}>
              OBS: {pedido.observacao}
            </div>
          )}
          {pedido.cliente_telefone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
              <Phone size={11} color="#666" />
              <span style={{ fontSize: '12px', color: '#999' }}>{pedido.cliente_telefone}</span>
            </div>
          )}
        </div>
      )}

      {/* Acoes */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
        {proximo && (
          <button onClick={() => onMover(pedido.id, proximo)}
            style={{ flex: 1, padding: '7px', background: pedido.status === 'aguardando' ? '#ef4239' : '#22c55e', border: 'none', borderRadius: '7px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Mulish, sans-serif' }}>
            {labelBtn}
          </button>
        )}
        {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
          <button onClick={() => onCancelar(pedido.id)}
            style={{ padding: '7px 10px', background: 'rgba(239,66,57,0.15)', border: '1px solid rgba(239,66,57,0.3)', borderRadius: '7px', color: '#ef4239', cursor: 'pointer', fontSize: '12px' }}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function DeliveryContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban')
  const [aceiteAuto, setAceiteAuto] = useState(false)
  const intervalRef = useRef<any>(null)

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchPedidos = useCallback(async (estId: string) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('pedidos')
      .select('*, itens_comanda(*)')
      .eq('estabelecimento_id', estId)
      .eq('tipo', 'delivery')
      .gte('created_at', hoje.toISOString())
      .not('status', 'eq', 'cancelado')
      .order('created_at', { ascending: false })
    if (data) {
      const mapped = data.map((p: any) => ({ ...p, itens: p.itens_comanda || [] }))
      setPedidos(mapped)
    }
  }, [])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => {
      setLoading(true)
      await fetchPedidos(estabelecimentoId)
      setLoading(false)
    }
    load()
    // Supabase Realtime - ouvir mudancas em pedidos
    const channel = supabase
      .channel('delivery-pedidos-' + estabelecimentoId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: 'estabelecimento_id=eq.' + estabelecimentoId
      }, () => { fetchPedidos(estabelecimentoId) })
      .subscribe()
    // Fallback: auto refresh a cada 15s
    intervalRef.current = setInterval(() => fetchPedidos(estabelecimentoId), 15000)
    return () => {
      clearInterval(intervalRef.current)
      supabase.removeChannel(channel)
    }
  }, [estabelecimentoId, fetchPedidos])

  const moverStatus = async (pedidoId: string, novoStatus: string) => {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: novoStatus } : p))
  }

  const cancelarPedido = async (pedidoId: string) => {
    await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedidoId)
    setPedidos(prev => prev.filter(p => p.id !== pedidoId))
  }

  const pedidosFiltrados = pedidos.filter(p =>
    p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.numero_pedido).includes(searchTerm) ||
    p.cliente_endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const aguardando = pedidosFiltrados.filter(p => p.status === 'aguardando')
  const preparo = pedidosFiltrados.filter(p => p.status === 'preparo')
  const pronto = pedidosFiltrados.filter(p => p.status === 'pronto')
  const entregue = pedidosFiltrados.filter(p => p.status === 'entregue')

  const totalHoje = pedidos.reduce((acc, p) => acc + Number(p.total), 0)

  return (
    <div style={{ padding: '0', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderBottom: '1px solid #292929', flexWrap: 'wrap' }}>
        {/* Novo Pedido */}
        <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'Mulish, sans-serif' }}>
          <Plus size={14} /> Novo Pedido (F1)
        </button>

        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar pedido..."
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
        </div>

        {/* Atualizar */}
        <button onClick={() => fetchPedidos(estabelecimentoId)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
          <RefreshCw size={14} />
        </button>

        {/* Tempo estimado */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#999' }}>
            <Clock size={12} color="#ef4239" /> <span style={{ color: '#e6e6e6', fontWeight: 600 }}>25 min</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#999' }}>
            <Bike size={12} color="#ef4239" /> <span style={{ color: '#e6e6e6', fontWeight: 600 }}>45-65 min</span>
          </div>
        </div>

        {/* Aceite automatico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#999' }}>
          <span>Aceite automatico</span>
          <div onClick={() => setAceiteAuto(!aceiteAuto)}
            style={{ width: '36px', height: '20px', background: aceiteAuto ? '#ef4239' : '#333', borderRadius: '10px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '3px', left: aceiteAuto ? '18px' : '3px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        </div>

        {/* Toggle kanban/lista */}
        <div style={{ display: 'flex', gap: 0, background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', overflow: 'hidden' }}>
          <button onClick={() => setViewMode('kanban')}
            style={{ padding: '7px 10px', background: viewMode === 'kanban' ? '#292929' : 'transparent', border: 'none', color: viewMode === 'kanban' ? '#ef4239' : '#666', cursor: 'pointer' }}>
            <LayoutGrid size={15} />
          </button>
          <button onClick={() => setViewMode('lista')}
            style={{ padding: '7px 10px', background: viewMode === 'lista' ? '#292929' : 'transparent', border: 'none', color: viewMode === 'lista' ? '#ef4239' : '#666', cursor: 'pointer' }}>
            <List size={15} />
          </button>
        </div>

        {/* Total do dia */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#999' }}>
          Hoje: <span style={{ color: '#22c55e', fontWeight: 700 }}>R$ {totalHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span style={{ marginLeft: '8px', color: '#666' }}>({pedidos.length} pedidos)</span>
        </div>
      </div>

      {/* Conteudo */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>
          Carregando pedidos...
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px 20px', flex: 1, overflowX: 'auto' }}>
          {STATUS_COLS.map(col => {
            const colPedidos = col.id === 'aguardando' ? aguardando : col.id === 'preparo' ? preparo : col.id === 'pronto' ? pronto : entregue
            return (
              <div key={col.id} style={{ background: col.bg, border: '1px solid ' + col.border, borderRadius: '12px', padding: '14px', minHeight: '300px' }}>
                {/* Header coluna */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: col.color }}>{col.label}</span>
                  <span style={{ background: col.color, color: '#fff', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>{colPedidos.length}</span>
                </div>
                {/* Cards */}
                {colPedidos.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#444', fontSize: '13px', marginTop: '40px' }}>Nenhum pedido</div>
                ) : colPedidos.map(p => (
                  <CardPedido key={p.id} pedido={p} onMover={moverStatus} onCancelar={cancelarPedido} />
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        /* LISTA */
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Pedido', 'Cliente', 'Endereco', 'Itens', 'Total', 'Pagamento', 'Tempo', 'Status', 'Acoes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    {pedidos.length === 0 ? 'Nenhum pedido de delivery hoje.' : 'Nenhum resultado.'}
                  </td></tr>
                ) : pedidosFiltrados.map(p => {
                  const col = STATUS_COLS.find(c => c.id === p.status) || STATUS_COLS[0]
                  const proximo = PROXIMO_STATUS[p.status]
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>#{p.numero_pedido}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>{p.cliente_nome}</div>
                        {p.cliente_telefone && <div style={{ fontSize: '11px', color: '#666' }}>{p.cliente_telefone}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999', maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente_endereco || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{p.itens?.length || 0} itens</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#ef4239' }}>R$ {Number(p.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{p.forma_pagamento}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{tempoRelativo(p.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: col.bg, color: col.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid ' + col.border }}>
                          {col.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {proximo && (
                            <button onClick={() => moverStatus(p.id, proximo)}
                              style={{ background: p.status === 'aguardando' ? '#ef4239' : 'rgba(34,197,94,0.15)', border: p.status === 'aguardando' ? 'none' : '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: p.status === 'aguardando' ? '#fff' : '#22c55e', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontWeight: 600 }}>
                              {LABEL_PROXIMO[p.status]}
                            </button>
                          )}
                          {p.status !== 'entregue' && (
                            <button onClick={() => cancelarPedido(p.id)}
                              style={{ background: 'rgba(239,66,57,0.1)', border: '1px solid rgba(239,66,57,0.3)', borderRadius: '6px', color: '#ef4239', cursor: 'pointer', padding: '5px' }}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <DeliveryContent />
    </Suspense>
  )
}