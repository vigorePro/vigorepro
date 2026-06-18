'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Pedido {
  id: string
  numero: number
  tipo: string
  status: string
  total: number
  forma_pagamento: string
  cliente_nome: string
  criado_em: string
  origem: string
  mesa_comanda: string
  usuario: string
  desconto: number
}

function HistoricoContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (slug) carregarPedidos()
  }, [slug, filtroStatus, dataInicio, dataFim])

  async function carregarPedidos() {
    setCarregando(true)
    try {
      const { data: estab } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', slug)
        .single()
      if (!estab) return

      let query = supabase
        .from('pedidos')
        .select('*')
        .eq('estabelecimento_id', estab.id)
        .gte('criado_em', dataInicio + 'T00:00:00')
        .lte('criado_em', dataFim + 'T23:59:59')
        .order('criado_em', { ascending: false })

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data } = await query
      setPedidos(data || [])
    } finally {
      setCarregando(false)
    }
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return (
      String(p.numero).includes(b) ||
      (p.cliente_nome || '').toLowerCase().includes(b) ||
      (p.tipo || '').toLowerCase().includes(b)
    )
  })

  const abertosCount = pedidos.filter(p => ['aberto', 'em_preparo', 'pronto', 'aguardando'].includes(p.status)).length

  const statusColor = (s: string) => {
    if (['aberto', 'em_preparo', 'pronto', 'aguardando'].includes(s)) return '#f59e0b'
    if (['entregue', 'fechado', 'concluido'].includes(s)) return '#10b981'
    if (s === 'cancelado') return '#ef4444'
    return '#6b7280'
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      aberto: 'Aberto', em_preparo: 'Preparo', pronto: 'Pronto',
      entregue: 'Entregue', fechado: 'Fechado', concluido: 'Concluído',
      cancelado: 'Cancelado', aguardando: 'Aguardando'
    }
    return map[s] || s
  }

  const tipoLabel = (t: string) => {
    const map: Record<string, string> = {
      delivery: 'Delivery', mesa: 'Mesa', comanda: 'Comanda',
      balcao: 'Balcão', retirada: 'Retirada', pdv: 'PDV'
    }
    return map[t] || t || '-'
  }

  const formatData = (d: string) => {
    if (!d) return '-'
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatMoeda = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      {/* Barra de ações */}
      <div style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: '200px', maxWidth: '280px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px 8px 30px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as any }}
          />
        </div>
        <button onClick={carregarPedidos} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>↻</button>
        <button style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>▼ Filtros</button>
        <div style={{ marginLeft: 'auto' }}>
          <button style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 14px', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>📄 Excel</button>
        </div>
      </div>

      {/* Date + status tabs */}
      <div style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '6px 12px' }}>
          <span style={{ fontSize: '13px' }}>📅</span>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }} />
          <span style={{ color: '#6b7280' }}>–</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {abertosCount > 0 && (
            <button onClick={() => setFiltroStatus('aberto')} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', backgroundColor: filtroStatus === 'aberto' ? '#f59e0b' : '#2a1a00', color: filtroStatus === 'aberto' ? '#000' : '#f59e0b' }}>
              Aberto {abertosCount}
            </button>
          )}
          {['todos', 'fechado', 'cancelado'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', border: '1px solid #2a2a2a', cursor: 'pointer', backgroundColor: filtroStatus === s ? '#2a2a2a' : 'transparent', color: '#9ca3af', textTransform: 'capitalize' as any }}>
              {s === 'todos' ? 'Todos' : s === 'fechado' ? 'Fechados' : 'Cancelados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
              {['Ações', 'Origem', 'N° Pedido', 'Data/Hora', 'Tipo', 'Situação', 'Descontos', 'Valor Total', 'Valor Pago', 'Cliente', 'Mesa/Comanda', 'Usuário'].map(col => (
                <th key={col} style={{ padding: '11px 14px', textAlign: 'left', color: '#9ca3af', fontWeight: '500', whiteSpace: 'nowrap', borderRight: '1px solid #2a2a2a' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Carregando histórico...</td></tr>
            ) : pedidosFiltrados.length === 0 ? (
              <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Nenhum pedido encontrado no período</td></tr>
            ) : pedidosFiltrados.map((pedido, i) => (
              <tr key={pedido.id} style={{ backgroundColor: i % 2 === 0 ? '#111111' : '#131313', borderBottom: '1px solid #1e1e1e', cursor: 'pointer' }}>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>👁</button>
                    <button style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>🖨</button>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af', fontSize: '18px' }}>🚲</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', fontWeight: '600', color: '#fff' }}>{pedido.numero || '-'}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af', fontSize: '12px' }}>
                  <div>📅 {formatData(pedido.criado_em)}</div>
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#1a2a1a', color: '#10b981', fontSize: '12px' }}>
                    🚲 {tipoLabel(pedido.tipo)} <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  </span>
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', backgroundColor: statusColor(pedido.status) + '22', color: statusColor(pedido.status) }}>
                    {statusLabel(pedido.status)}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{pedido.desconto ? formatMoeda(pedido.desconto) : '-'}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#fff', fontWeight: '600' }}>{formatMoeda(pedido.total)}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>-</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{pedido.cliente_nome || '-'}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{pedido.mesa_comanda || '-'}</td>
                <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{pedido.usuario || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {!carregando && (
        <div style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Por página:</span>
            <select style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '4px 8px', color: '#fff', fontSize: '13px' }}>
              <option>25</option><option>50</option><option>100</option>
            </select>
          </div>
          <span>Mostrando {pedidosFiltrados.length} de {pedidos.length}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={{ padding: '4px 12px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', color: '#9ca3af', cursor: 'pointer' }}>← Anterior</button>
            <button style={{ padding: '4px 12px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', color: '#9ca3af', cursor: 'pointer' }}>Próximo →</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>}>
      <HistoricoContent />
    </Suspense>
  )
                     }
