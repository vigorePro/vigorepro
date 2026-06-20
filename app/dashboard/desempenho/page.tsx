'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart3, TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Users, Clock, Star, Package, ChevronDown, RefreshCw, Calendar,
  Bike, UtensilsCrossed, ShoppingBag, CreditCard, Banknote, Smartphone
} from 'lucide-react'

interface PedidoData {
  id: string
  valor_total: number
  created_at: string
  status: string
  forma_pagamento: string
  cliente_nome: string
  tipo: string
}

interface ItemData {
  produto_nome: string
  quantidade: number
  preco_unitario: number
}

// Status que contam como pedidos realizados
const STATUS_VALIDOS = ['entregue', 'concluido', 'finalizado', 'pronto', 'saiu_para_entrega', 'em_preparo', 'aceito', 'confirmado']

function DesempenhoContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [pedidos, setPedidos] = useState<PedidoData[]>([])
  const [itens, setItens] = useState<ItemData[]>([])
  const [periodo, setPeriodo] = useState('7')
  const [loading, setLoading] = useState(true)
  const [ultimaAtual, setUltimaAtual] = useState('')

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabelecimentoId(data.id) })
  }, [slug])

  const fetchData = useCallback(async () => {
    if (!estabelecimentoId) return
    setLoading(true)
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - parseInt(periodo))
    const dateStr = dateFilter.toISOString()

    const [pedidosRes, itensRes] = await Promise.all([
      supabase.from('pedidos').select('id, valor_total, created_at, status, forma_pagamento, cliente_nome, tipo')
        .eq('estabelecimento_id', estabelecimentoId)
        .gte('created_at', dateStr)
        .not('status', 'in', '(cancelado,recusado)'),
      supabase.from('itens_pedido').select('produto_nome, quantidade, preco_unitario')
        .in('pedido_id',
          (await supabase.from('pedidos').select('id')
            .eq('estabelecimento_id', estabelecimentoId)
            .gte('created_at', dateStr)
            .not('status', 'in', '(cancelado,recusado)')).data?.map(p => p.id) || []
        )
    ])
    setPedidos(pedidosRes.data || [])
    setItens(itensRes.data || [])
    setUltimaAtual(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [estabelecimentoId, periodo])

  useEffect(() => {
    if (!estabelecimentoId) return
    fetchData()
    const channel = supabase
      .channel('desempenho-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchData])

  // Calculos
  const totalReceita = pedidos.reduce((acc, p) => acc + Number(p.valor_total), 0)
  const totalPedidos = pedidos.length
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0
  const clientesUnicos = new Set(pedidos.filter(p => p.cliente_nome).map(p => p.cliente_nome)).size

  // Formas de pagamento
  const formasPgto = pedidos.reduce((acc: Record<string, number>, p) => {
    const forma = p.forma_pagamento || 'outros'
    acc[forma] = (acc[forma] || 0) + 1
    return acc
  }, {})

  // Tipos de pedido
  const tiposPedido = pedidos.reduce((acc: Record<string, number>, p) => {
    const tipo = p.tipo || 'balcao'
    acc[tipo] = (acc[tipo] || 0) + 1
    return acc
  }, {})

  // Mais vendidos
  const maisVendidos = itens.reduce((acc: Record<string, { qtd: number, receita: number }>, item) => {
    const nome = item.produto_nome || 'Produto'
    if (!acc[nome]) acc[nome] = { qtd: 0, receita: 0 }
    acc[nome].qtd += item.quantidade
    acc[nome].receita += item.quantidade * Number(item.preco_unitario)
    return acc
  }, {})
  const topProdutos = Object.entries(maisVendidos)
    .map(([nome, data]) => ({ nome, ...data }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 8)

  // Pedidos por hora
  const horarios = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    pedidos: pedidos.filter(p => new Date(p.created_at).getHours() === h).length
  })).filter(h => h.pedidos > 0)
  const horarioPico = horarios.reduce((max, h) => h.pedidos > max.pedidos ? h : max, { hora: 0, pedidos: 0 })
  const maxHora = Math.max(...horarios.map(h => h.pedidos), 1)

  // Vendas por dia (ultimos N dias)
  const diasLabels: Record<string, number> = {}
  for (let i = parseInt(periodo) - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    diasLabels[key] = 0
  }
  pedidos.forEach(p => {
    const key = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    if (key in diasLabels) diasLabels[key] += Number(p.valor_total)
  })
  const diasData = Object.entries(diasLabels)
  const maxDia = Math.max(...diasData.map(([, v]) => v), 1)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formaIcon = (forma: string) => {
    if (forma.includes('pix')) return <Smartphone size={13} color="#22c55e" />
    if (forma.includes('credito')) return <CreditCard size={13} color="#6366f1" />
    if (forma.includes('debito')) return <CreditCard size={13} color="#8b5cf6" />
    if (forma.includes('dinheiro')) return <Banknote size={13} color="#f59e0b" />
    return <CreditCard size={13} color="#888" />
  }

  const tipoIcon = (tipo: string) => {
    if (tipo === 'delivery') return <Bike size={13} color="#ef4239" />
    if (tipo === 'mesa') return <UtensilsCrossed size={13} color="#8b5cf6" />
    return <ShoppingBag size={13} color="#22c55e" />
  }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', backgroundColor: '#111', minHeight: '100vh', color: '#fff', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} color="#ef4239" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Desempenho</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Analise completa de vendas e metricas do negocio</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ultimaAtual && <span style={{ fontSize: 12, color: '#666' }}>Atualizado: {ultimaAtual}</span>}
          <button onClick={fetchData} style={{ padding: '7px 12px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 6, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} />
          </button>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{ padding: '7px 12px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            <option value="7">Ultimos 7 dias</option>
            <option value="15">Ultimos 15 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #333', borderTopColor: '#ef4239', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#888', margin: 0, fontSize: 14 }}>Carregando dados...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Receita Total', value: fmt(totalReceita), icon: DollarSign, cor: '#22c55e', sub: `${totalPedidos} pedidos` },
              { label: 'Pedidos', value: totalPedidos.toString(), icon: ShoppingCart, cor: '#6366f1', sub: `Em ${periodo} dias` },
              { label: 'Ticket Medio', value: fmt(ticketMedio), icon: TrendingUp, cor: '#f59e0b', sub: 'Por pedido' },
              { label: 'Clientes Unicos', value: clientesUnicos.toString(), icon: Users, cor: '#ec4899', sub: 'Compraram no periodo' },
              { label: 'Horario de Pico', value: horarioPico.pedidos > 0 ? `${horarioPico.hora}h` : '-', icon: Clock, cor: '#ef4239', sub: horarioPico.pedidos > 0 ? `${horarioPico.pedidos} pedidos` : 'Sem dados' },
              { label: 'Itens Vendidos', value: itens.reduce((a, i) => a + i.quantidade, 0).toString(), icon: Package, cor: '#06b6d4', sub: `${topProdutos.length} produtos distintos` },
            ].map(kpi => (
              <div key={kpi.label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{kpi.label}</span>
                  <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <kpi.icon size={15} color={kpi.cor} />
                  </div>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>{kpi.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#666' }}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          {totalPedidos === 0 ? (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 60, textAlign: 'center' }}>
              <BarChart3 size={48} color="#333" style={{ marginBottom: 16 }} />
              <p style={{ color: '#888', fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>Nenhum pedido encontrado</p>
              <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Os dados aparecerao aqui assim que houver pedidos no periodo selecionado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              
              {/* Grafico vendas por dia */}
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="#ef4239" />
                  Vendas por Dia (R$)
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto' }}>
                  {diasData.map(([dia, valor]) => (
                    <div key={dia} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto', minWidth: 32 }}>
                      <span style={{ fontSize: 9, color: '#666' }}>{valor > 0 ? 'R$' + Math.round(valor) : ''}</span>
                      <div style={{ width: 20, backgroundColor: valor > 0 ? '#ef4239' : '#292929', borderRadius: '3px 3px 0 0', height: `${Math.max((valor / maxDia) * 90, valor > 0 ? 4 : 2)}px` }} />
                      <span style={{ fontSize: 9, color: '#555', transform: 'rotate(-45deg)', transformOrigin: 'center' }}>{dia}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pedidos por hora */}
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="#6366f1" />
                  Pedidos por Horario
                </p>
                {horarios.length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Sem dados de horario</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                    {horarios.map(h => (
                      <div key={h.hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                        <span style={{ fontSize: 9, color: '#666' }}>{h.pedidos}</span>
                        <div style={{ width: '100%', backgroundColor: h.hora === horarioPico.hora ? '#ef4239' : '#6366f155', borderRadius: '3px 3px 0 0', height: `${Math.max((h.pedidos / maxHora) * 90, 4)}px` }} />
                        <span style={{ fontSize: 9, color: '#555' }}>{h.hora}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mais vendidos */}
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={16} color="#f59e0b" />
                  Produtos Mais Vendidos
                </p>
                {topProdutos.length === 0 ? (
                  <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 40 }}>Sem dados de produtos</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topProdutos.map((p, idx) => (
                      <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: idx === 0 ? '#f59e0b' : '#555', width: 18, textAlign: 'center' }}>{idx + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: '#ccc' }}>{p.nome}</span>
                            <span style={{ fontSize: 12, color: '#888' }}>{p.qtd}x</span>
                          </div>
                          <div style={{ height: 4, backgroundColor: '#292929', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', backgroundColor: idx === 0 ? '#f59e0b' : '#ef423955', borderRadius: 2, width: `${(p.qtd / topProdutos[0].qtd) * 100}%` }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: '#666', width: 60, textAlign: 'right' }}>{fmt(p.receita)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formas de pagamento + Tipos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={15} color="#6366f1" />
                    Formas de Pagamento
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(formasPgto).sort(([,a],[,b]) => b - a).map(([forma, qtd]) => (
                      <div key={forma} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {formaIcon(forma)}
                        <span style={{ fontSize: 12, color: '#ccc', flex: 1, textTransform: 'capitalize' }}>{forma.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 12, color: '#888' }}>{qtd} ({Math.round((qtd / totalPedidos) * 100)}%)</span>
                        <div style={{ width: 60, height: 4, backgroundColor: '#292929', borderRadius: 2 }}>
                          <div style={{ height: '100%', backgroundColor: '#6366f1', borderRadius: 2, width: `${(qtd / totalPedidos) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bike size={15} color="#ef4239" />
                    Tipo de Pedido
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(tiposPedido).sort(([,a],[,b]) => b - a).map(([tipo, qtd]) => (
                      <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {tipoIcon(tipo)}
                        <span style={{ fontSize: 12, color: '#ccc', flex: 1, textTransform: 'capitalize' }}>{tipo}</span>
                        <span style={{ fontSize: 12, color: '#888' }}>{qtd} ({Math.round((qtd / totalPedidos) * 100)}%)</span>
                        <div style={{ width: 60, height: 4, backgroundColor: '#292929', borderRadius: 2 }}>
                          <div style={{ height: '100%', backgroundColor: '#ef4239', borderRadius: 2, width: `${(qtd / totalPedidos) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function DesempenhoPage() {
  return <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}><DesempenhoContent /></Suspense>
}
