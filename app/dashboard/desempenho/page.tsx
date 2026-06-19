'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart3, TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, RefreshCw, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PedidoData = {
  id: string
  total: number
  created_at: string
  status: string
  forma_pagamento: string
  cliente_nome: string
  tipo: string
}

type ItemData = {
  id: string
  nome: string
  quantidade: number
  preco: number
}

function DesempenhoContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | '3meses'>('30dias')
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [itens, setItens] = useState<ItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const getDateFilter = useCallback(() => {
    const now = new Date()
    if (periodo === 'hoje') { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString() }
    if (periodo === '7dias') { const d = new Date(); d.setDate(now.getDate()-7); return d.toISOString() }
    if (periodo === '30dias') { const d = new Date(); d.setDate(now.getDate()-30); return d.toISOString() }
    const d = new Date(); d.setMonth(now.getMonth()-3); return d.toISOString()
  }, [periodo])

  const fetchData = useCallback(async (estId: string) => {
    const dateFilter = getDateFilter()
    const [pedidosRes, itensRes] = await Promise.all([
      supabase.from('pedidos').select('id, total, created_at, status, forma_pagamento, cliente_nome, tipo')
        .eq('estabelecimento_id', estId)
        .eq('status', 'entregue')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: true }),
      supabase.from('itens_comanda').select('id, nome, quantidade, preco')
        .in('pedido_id',
          (await supabase.from('pedidos').select('id').eq('estabelecimento_id', estId).gte('created_at', dateFilter).eq('status', 'entregue')).data?.map(p => p.id) || []
        )
    ])
    setPedidos(pedidosRes.data || [])
    setItens(itensRes.data || [])
  }, [getDateFilter])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => { setLoading(true); await fetchData(estabelecimentoId); setLoading(false) }
    load()
  }, [estabelecimentoId, fetchData])

  // Calculos
  const totalReceita = pedidos.reduce((acc, p) => acc + Number(p.total), 0)
  const totalPedidos = pedidos.length
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0
  const clientesUnicos = new Set(pedidos.map(p => p.cliente_nome)).size

  // Formas de pagamento
  const formasPgto = pedidos.reduce((acc, p) => {
    const forma = p.forma_pagamento || 'Outros'
    acc[forma] = (acc[forma] || 0) + Number(p.total)
    return acc
  }, {} as Record<string, number>)
  const formasSorted = Object.entries(formasPgto).sort((a, b) => b[1] - a[1])

  // Horarios de pico
  const horarios = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    pedidos: pedidos.filter(p => new Date(p.created_at).getHours() === h).length
  })).filter(h => h.pedidos > 0)
  const horarioPico = horarios.reduce((max, h) => h.pedidos > max.pedidos ? h : max, { hora: 0, pedidos: 0 })
  const maxHora = Math.max(...horarios.map(h => h.pedidos), 1)

  // Produtos mais vendidos
  const produtosMap = itens.reduce((acc, i) => {
    if (!acc[i.nome]) acc[i.nome] = { nome: i.nome, qtd: 0, total: 0 }
    acc[i.nome].qtd += i.quantidade
    acc[i.nome].total += i.quantidade * i.preco
    return acc
  }, {} as Record<string, { nome: string; qtd: number; total: number }>)
  const produtosSorted = Object.values(produtosMap).sort((a, b) => b.qtd - a.qtd).slice(0, 8)

  // Tipos delivery vs mesa
  const deliveryCount = pedidos.filter(p => p.tipo === 'delivery').length
  const mesaCount = pedidos.filter(p => p.tipo === 'mesa' || p.tipo === 'comanda').length

  // Horas para exibir no grafico (faixa de pico)
  const horasExibir = Array.from({ length: 14 }, (_, i) => i + 10) // 10h-23h
  const pedidosPorHora = horasExibir.map(h => ({
    h,
    qtd: pedidos.filter(p => new Date(p.created_at).getHours() === h).length
  }))
  const maxGrafico = Math.max(...pedidosPorHora.map(h => h.qtd), 1)

  const CORES_PGTO = ['#6366f1', '#22c55e', '#f59e0b', '#ef4239', '#ec4899', '#14b8a6']

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <BarChart3 size={22} color="#ef4239" />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Desempenho</span>
          </div>
          <span style={{ fontSize: '13px', color: '#666' }}>Analise de vendas e metricas do negocio</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '4px' }}>
          {(['hoje', '7dias', '30dias', '3meses'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '7px 14px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Mulish, sans-serif',
                background: periodo === p ? '#ef4239' : 'transparent', color: periodo === p ? '#fff' : '#999' }}>
              {p === 'hoje' ? 'Hoje' : p === '7dias' ? '7 dias' : p === '30dias' ? '30 dias' : '3 meses'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '60px', fontSize: '14px' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Receita Total', value: 'R$ ' + totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), icon: <DollarSign size={18} color="#22c55e" />, sub: totalPedidos + ' pedidos finalizados' },
              { label: 'Total de Pedidos', value: totalPedidos, icon: <ShoppingBag size={18} color="#6366f1" />, sub: deliveryCount + ' delivery, ' + mesaCount + ' mesa' },
              { label: 'Ticket Medio', value: 'R$ ' + ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), icon: <TrendingUp size={18} color="#f59e0b" />, sub: 'por pedido entregue' },
              { label: 'Clientes Unicos', value: clientesUnicos, icon: <Users size={18} color="#ef4239" />, sub: 'clientes distintos' },
            ].map((card, i) => (
              <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {card.icon}
                  <span style={{ fontSize: '13px', color: '#999' }}>{card.label}</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {pedidos.length === 0 ? (
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
              Nenhum pedido entregue no periodo selecionado.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Grafico horarios */}
              <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4239' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Horarios de Pico</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', marginBottom: '8px' }}>
                  {pedidosPorHora.map(({ h, qtd }) => (
                    <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '100%', background: h === horarioPico.hora && horarioPico.pedidos > 0 ? '#ef4239' : 'rgba(239,66,57,0.3)', borderRadius: '3px 3px 0 0', height: (qtd / maxGrafico * 100) + 'px', minHeight: qtd > 0 ? '4px' : '0', transition: 'height 0.3s' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {pedidosPorHora.map(({ h }) => (
                    <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#555' }}>{h}h</div>
                  ))}
                </div>
                {horarioPico.pedidos > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
                    <span>Pico: <span style={{ color: '#ef4239', fontWeight: 700 }}>{horarioPico.hora}h ({horarioPico.pedidos} pedidos)</span></span>
                    <span style={{ color: '#22c55e' }}>Media: {(totalPedidos / Math.max(horarios.length, 1)).toFixed(1)} por hora ativa</span>
                  </div>
                )}
              </div>

              {/* Formas de pagamento */}
              <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <DollarSign size={16} color="#ef4239" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Formas de Pagamento</span>
                </div>
                {formasSorted.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '13px' }}>Sem dados de pagamento.</p>
                ) : formasSorted.map(([forma, total], i) => {
                  const pct = totalReceita > 0 ? (total / totalReceita * 100) : 0
                  return (
                    <div key={forma} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#999' }}>{forma}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>
                          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span style={{ color: '#666', fontWeight: 400 }}>({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: CORES_PGTO[i % CORES_PGTO.length], borderRadius: '4px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Produtos mais vendidos */}
              <div style={{ gridColumn: '1/-1', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Star size={16} color="#f59e0b" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Produtos Mais Vendidos</span>
                </div>
                {produtosSorted.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '13px' }}>Nenhum item vendido no periodo.</p>
                ) : produtosSorted.map((prod, i) => (
                  <div key={prod.nome} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < produtosSorted.length - 1 ? '1px solid #1f1f1f' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i < 3 ? '#ef4239' : '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: i < 3 ? '#fff' : '#666', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nome}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{prod.qtd} vendas</div>
                    </div>
                    <div style={{ height: '6px', width: '120px', background: '#111', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ height: '100%', width: (prod.qtd / (produtosSorted[0]?.qtd || 1) * 100) + '%', background: '#ef4239', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', minWidth: '90px', textAlign: 'right' }}>
                      R$ {prod.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DesempenhoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <DesempenhoContent />
    </Suspense>
  )
}