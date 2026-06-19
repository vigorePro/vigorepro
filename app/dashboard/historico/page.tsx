'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, RefreshCw, Filter, ChevronDown, ChevronUp, Eye, X, TrendingUp, ShoppingBag, DollarSign, Clock, Truck, UtensilsCrossed, ShoppingCart, FileText } from 'lucide-react'

type Pedido = {
  id: string
  numero?: number
  status: string
  tipo?: string
  cliente?: string
  mesa?: string
  total: number
  desconto?: number
  forma_pagamento?: string
  itens: any[]
  criado_em: string
  estabelecimento_id: string
}

const STATUS_COR: Record<string, string> = {
  pendente: '#f59e0b', em_preparo: '#3b82f6', pronto: '#8b5cf6',
  entregue: '#22c55e', cancelado: '#ef4444', aguardando: '#f59e0b'
}
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', em_preparo: 'Em Preparo', pronto: 'Pronto',
  entregue: 'Entregue', cancelado: 'Cancelado', aguardando: 'Aguardando'
}

function HistoricoContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [dataInicio, setDataInicio] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 20

  // KPIs
  const totalReceita = pedidos.filter(p => p.status !== 'cancelado').reduce((a, p) => a + (p.total || 0), 0)
  const totalPedidos = pedidos.length
  const ticketMedio = totalPedidos > 0 ? totalReceita / pedidos.filter(p => p.status !== 'cancelado').length || 0 : 0
  const cancelados = pedidos.filter(p => p.status === 'cancelado').length

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchPedidos = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    let query = supabase.from('pedidos')
      .select('*', { count: 'exact' })
      .eq('estabelecimento_id', estabelecimentoId)
      .gte('criado_em', dataInicio + 'T00:00:00')
      .lte('criado_em', dataFim + 'T23:59:59')
      .order('criado_em', { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)

    if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus)
    if (filtroTipo !== 'todos') query = query.eq('tipo', filtroTipo)
    if (busca) query = query.or(`cliente.ilike.%${busca}%,mesa.ilike.%${busca}%`)

    const { data, count } = await query
    if (data) setPedidos(data.map(p => ({ ...p, itens: Array.isArray(p.itens) ? p.itens : [] })))
    if (count !== null) setTotal(count)
    setCarregando(false)
  }, [estabelecimentoId, dataInicio, dataFim, filtroStatus, filtroTipo, busca, pagina])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchPedidos()
    const ch = supabase.channel('hist-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchPedidos() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [estabelecimentoId, fetchPedidos])

  const atualizarStatus = async (id: string, status: string) => {
    await supabase.from('pedidos').update({ status }).eq('id', id)
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const tipoIcon: Record<string, any> = { delivery: <Truck size={13} />, mesa: <UtensilsCrossed size={13} />, balcao: <ShoppingCart size={13} />, retirada: <ShoppingBag size={13} /> }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', padding: 24, color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Histórico de Vendas</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>{total} pedido(s) no período</p>
        </div>
        <button onClick={fetchPedidos} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Pedidos', valor: totalPedidos, icon: <ShoppingBag size={20} />, cor: '#3b82f6' },
          { label: 'Receita Total', valor: 'R$ ' + totalReceita.toFixed(2).replace('.', ','), icon: <DollarSign size={20} />, cor: '#22c55e' },
          { label: 'Ticket Médio', valor: 'R$ ' + ticketMedio.toFixed(2).replace('.', ','), icon: <TrendingUp size={20} />, cor: '#f59e0b' },
          { label: 'Cancelados', valor: cancelados, icon: <X size={20} />, cor: '#ef4444' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#888' }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{kpi.valor}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Datas */}
        <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPagina(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }}
        />
        <span style={{ color: '#555' }}>—</span>
        <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPagina(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }}
        />

        {/* Status */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', 'pendente', 'em_preparo', 'pronto', 'entregue', 'cancelado'].map(s => (
            <button key={s} onClick={() => { setFiltroStatus(s); setPagina(1) }} style={{
              padding: '6px 12px', borderRadius: 16, border: filtroStatus === s ? '1px solid ' + (STATUS_COR[s] || '#ef4239') : '1px solid #292929',
              background: filtroStatus === s ? (STATUS_COR[s] || '#ef4239') + '22' : 'transparent',
              color: filtroStatus === s ? (STATUS_COR[s] || '#ef4239') : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>{s === 'todos' ? 'Todos' : STATUS_LABEL[s]}</button>
          ))}
        </div>

        {/* Busca */}
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={13} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} placeholder="Buscar cliente ou mesa..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #292929' }}>
              {['#', 'Data/Hora', 'Tipo', 'Status', 'Cliente/Mesa', 'Itens', 'Desconto', 'Total', 'Pagamento', 'Ações'].map(col => (
                <th key={col} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#555' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : pedidos.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 60, textAlign: 'center', color: '#555' }}>
                <ShoppingBag size={40} color="#333" style={{ display: 'block', margin: '0 auto 12px' }} />
                Nenhum pedido no período selecionado
              </td></tr>
            ) : pedidos.map((p, i) => (
              <>
                <tr key={p.id} style={{ borderBottom: '1px solid #1e1e1e', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1f1f1f')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setPedidoExpandido(pedidoExpandido === p.id ? null : p.id)}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#ef4239' }}>#{p.numero || p.id.substring(0, 8)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{new Date(p.criado_em).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                      {tipoIcon[p.tipo || 'balcao']} {p.tipo || 'Balcão'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={p.status} onClick={e => e.stopPropagation()} onChange={e => atualizarStatus(p.id, e.target.value)} style={{
                      padding: '3px 8px', borderRadius: 8, border: '1px solid ' + (STATUS_COR[p.status] || '#666') + '44',
                      background: (STATUS_COR[p.status] || '#666') + '22', color: STATUS_COR[p.status] || '#888',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none', fontFamily: 'Mulish, sans-serif'
                    }}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k} style={{ background: '#1a1a1a', color: '#e6e6e6' }}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#e6e6e6' }}>{p.cliente || (p.mesa ? 'Mesa ' + p.mesa : 'Balcão')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#888', textAlign: 'center' }}>{p.itens?.length || 0}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>{p.desconto ? '- R$ ' + p.desconto.toFixed(2).replace('.', ',') : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: p.status === 'cancelado' ? '#ef4444' : '#22c55e' }}>R$ {(p.total || 0).toFixed(2).replace('.', ',')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{p.forma_pagamento || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {pedidoExpandido === p.id ? <ChevronUp size={14} color="#ef4239" /> : <ChevronDown size={14} color="#555" />}
                  </td>
                </tr>
                {pedidoExpandido === p.id && p.itens?.length > 0 && (
                  <tr key={p.id + '_det'}>
                    <td colSpan={10} style={{ padding: '0 14px 14px 56px', background: '#151515' }}>
                      <div style={{ borderLeft: '2px solid #292929', paddingLeft: 16 }}>
                        {p.itens.map((item: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
                            <span style={{ minWidth: 24, height: 24, background: '#ef4239', color: '#fff', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{item.quantidade || 1}</span>
                            <span style={{ flex: 1, color: '#e6e6e6' }}>{item.nome}</span>
                            {item.observacao && <span style={{ color: '#f59e0b', fontSize: 12, fontStyle: 'italic' }}>⚠ {item.observacao}</span>}
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>R$ {((item.preco || 0) * (item.quantidade || 1)).toFixed(2).replace('.', ',')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#888' }}>
          <span>Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #292929', background: '#1a1a1a', color: pagina === 1 ? '#444' : '#888', cursor: pagina === 1 ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif' }}>← Anterior</button>
            <span style={{ padding: '6px 14px', color: '#ef4239', fontWeight: 700 }}>{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #292929', background: '#1a1a1a', color: pagina === totalPaginas ? '#444' : '#888', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif' }}>Próximo →</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <HistoricoContent />
    </Suspense>
  )
}
