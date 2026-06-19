'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TrendingUp, ShoppingBag, DollarSign, Clock, ChefHat, Truck, Users, BarChart3, Star, ArrowUp, ArrowDown, RefreshCw, Eye, Bike, UtensilsCrossed, Package } from 'lucide-react'

function DashContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimento, setEstabelecimento] = useState<any>(null)
  const [stats, setStats] = useState({
    receitaHoje: 0, pedidosHoje: 0, ticketMedio: 0, emPreparo: 0,
    receitaMes: 0, pedidosMes: 0, totalClientes: 0, mesas_ocupadas: 0,
    receitaOntem: 0, pedidosOntem: 0
  })
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([])
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<any[]>([])
  const [vendasSemana, setVendasSemana] = useState<{dia: string, total: number}[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ultimaAtt, setUltimaAtt] = useState(new Date())

  const fetchDados = useCallback(async () => {
    if (!slug) return
    const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (!est) return
    setEstabelecimento(est)

    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
    const inicioOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate()).toISOString()
    const fimOntem = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59).toISOString()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
    const inicio7dias = new Date(hoje); inicio7dias.setDate(inicio7dias.getDate() - 6)

    const [pedHoje, pedOntem, pedMes, pedRecentes, pedSemana, clientes, mesasOcup] = await Promise.all([
      supabase.from('pedidos').select('total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioHoje).lte('criado_em', fimHoje),
      supabase.from('pedidos').select('total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioOntem).lte('criado_em', fimOntem),
      supabase.from('pedidos').select('total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioMes).not('status', 'eq', 'cancelado'),
      supabase.from('pedidos').select('*').eq('estabelecimento_id', est.id).order('criado_em', {ascending: false}).limit(8),
      supabase.from('pedidos').select('criado_em,total').eq('estabelecimento_id', est.id).gte('criado_em', inicio7dias.toISOString()).not('status', 'eq', 'cancelado'),
      supabase.from('clientes').select('id', {count: 'exact'}).eq('estabelecimento_id', est.id),
      supabase.from('mesas').select('status').eq('estabelecimento_id', est.id).eq('status', 'ocupada'),
    ])

    // Stats hoje
    const hojeValidos = (pedHoje.data || []).filter(p => p.status !== 'cancelado')
    const ontemValidos = (pedOntem.data || []).filter(p => p.status !== 'cancelado')
    const receitaHoje = hojeValidos.reduce((a, p) => a + (p.total || 0), 0)
    const receitaOntem = ontemValidos.reduce((a, p) => a + (p.total || 0), 0)
    const emPreparo = (pedHoje.data || []).filter(p => p.status === 'em_preparo' || p.status === 'pendente').length
    const receitaMes = (pedMes.data || []).reduce((a, p) => a + (p.total || 0), 0)

    setStats({
      receitaHoje, pedidosHoje: hojeValidos.length, ticketMedio: hojeValidos.length > 0 ? receitaHoje / hojeValidos.length : 0,
      emPreparo, receitaMes, pedidosMes: (pedMes.data || []).length,
      totalClientes: clientes.count || 0, mesas_ocupadas: (mesasOcup.data || []).length,
      receitaOntem, pedidosOntem: ontemValidos.length
    })

    if (pedRecentes.data) setPedidosRecentes(pedRecentes.data.map(p => ({ ...p, itens: Array.isArray(p.itens) ? p.itens : [] })))

    // Vendas por dia (últimos 7 dias)
    const dias: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
      dias[key] = 0
    }
    for (const p of pedSemana.data || []) {
      const d = new Date(p.criado_em)
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
      if (dias[key] !== undefined) dias[key] += p.total || 0
    }
    setVendasSemana(Object.entries(dias).map(([dia, total]) => ({ dia, total })))

    // Produtos mais vendidos
    const contagem: Record<string, {nome: string, qtd: number, receita: number}> = {}
    for (const ped of pedRecentes.data || []) {
      for (const item of (Array.isArray(ped.itens) ? ped.itens : [])) {
        if (!contagem[item.nome]) contagem[item.nome] = { nome: item.nome, qtd: 0, receita: 0 }
        contagem[item.nome].qtd += item.quantidade || 1
        contagem[item.nome].receita += (item.preco || 0) * (item.quantidade || 1)
      }
    }
    setProdutosMaisVendidos(Object.values(contagem).sort((a, b) => b.qtd - a.qtd).slice(0, 5))
    setUltimaAtt(new Date())
    setCarregando(false)
  }, [slug])

  useEffect(() => { fetchDados(); const i = setInterval(fetchDados, 30000); return () => clearInterval(i) }, [fetchDados])

  const maxVenda = Math.max(...vendasSemana.map(v => v.total), 1)
  const varReceita = stats.receitaOntem > 0 ? ((stats.receitaHoje - stats.receitaOntem) / stats.receitaOntem * 100) : 0
  const statusCor: Record<string, string> = { pendente: '#f59e0b', em_preparo: '#3b82f6', pronto: '#8b5cf6', entregue: '#22c55e', cancelado: '#ef4444' }
  const tipoIcon: Record<string, any> = { delivery: <Bike size={13} />, mesa: <UtensilsCrossed size={13} />, balcao: <Package size={13} />, retirada: <ShoppingBag size={13} /> }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', padding: 24, color: '#e6e6e6', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff' }}>{estabelecimento?.nome || 'Dashboard'}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={fetchDados} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif', fontSize: 13 }}>
            <RefreshCw size={13} /> Atualizar
          </button>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#444' }}>Atualizado: {ultimaAtt.toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {/* KPIs principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'Receita Hoje', valor: 'R$ ' + stats.receitaHoje.toFixed(2).replace('.', ','),
            sub: stats.pedidosHoje + ' pedidos', icon: <DollarSign size={20} />, cor: '#22c55e',
            var: varReceita, showVar: true
          },
          { label: 'Ticket Médio', valor: 'R$ ' + stats.ticketMedio.toFixed(2).replace('.', ','), sub: 'por pedido hoje', icon: <TrendingUp size={20} />, cor: '#f59e0b', showVar: false },
          { label: 'Em Preparo', valor: stats.emPreparo, sub: 'na cozinha agora', icon: <ChefHat size={20} />, cor: '#3b82f6', showVar: false },
          { label: 'Receita do Mês', valor: 'R$ ' + stats.receitaMes.toFixed(2).replace('.', ','), sub: stats.pedidosMes + ' pedidos', icon: <ShoppingBag size={20} />, cor: '#ef4239', showVar: false },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{kpi.label}</p>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor }}>{kpi.icon}</div>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#fff' }}>{kpi.valor}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{kpi.sub}</span>
              {kpi.showVar && kpi.var !== 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: kpi.var > 0 ? '#22c55e' : '#ef4444' }}>
                  {kpi.var > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {Math.abs(kpi.var).toFixed(1)}% vs ontem
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Segunda linha de KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Clientes', valor: stats.totalClientes, icon: <Users size={16} />, cor: '#8b5cf6' },
          { label: 'Mesas Ocupadas', valor: stats.mesas_ocupadas, icon: <UtensilsCrossed size={16} />, cor: '#f59e0b' },
          { label: 'Pedidos Ontem', valor: stats.pedidosOntem, icon: <Clock size={16} />, cor: '#6b7280' },
          { label: 'Receita Ontem', valor: 'R$ ' + stats.receitaOntem.toFixed(2).replace('.', ','), icon: <DollarSign size={16} />, cor: '#6b7280' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>{kpi.valor}</p>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Grid: Gráfico + Produtos + Pedidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Gráfico vendas semana */}
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color="#ef4239" /> Vendas — Últimos 7 dias
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {vendasSemana.map((v, i) => {
              const pct = v.total > 0 ? (v.total / maxVenda) * 100 : 3
              const isHoje = i === vendasSemana.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: '#555', fontWeight: 700 }}>
                    {v.total > 0 ? 'R$' + Math.round(v.total) : ''}
                  </span>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    height: pct + '%', minHeight: 4,
                    background: isHoje ? '#ef4239' : '#292929',
                    transition: 'height 0.5s'
                  }} />
                  <span style={{ fontSize: 9, color: isHoje ? '#ef4239' : '#555', fontWeight: isHoje ? 700 : 400 }}>
                    {v.dia.split(', ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Produtos mais vendidos */}
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} color="#f59e0b" /> Mais Vendidos (recentes)
          </h2>
          {produtosMaisVendidos.length === 0 ? (
            <p style={{ color: '#444', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>Sem dados disponíveis</p>
          ) : produtosMaisVendidos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < produtosMaisVendidos.length - 1 ? 12 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#f59e0b' : '#555', minWidth: 20 }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#e6e6e6', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.nome}</p>
                <div style={{ height: 3, borderRadius: 2, background: '#292929', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#ef4239', width: (p.qtd / produtosMaisVendidos[0].qtd * 100) + '%', borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{p.qtd}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pedidos recentes */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={16} color="#ef4239" /> Pedidos Recentes
          </h2>
          <span style={{ fontSize: 13, color: '#666' }}>{pedidosRecentes.length} pedido(s)</span>
        </div>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : pedidosRecentes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
            <ShoppingBag size={40} color="#333" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p>Nenhum pedido ainda hoje</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {pedidosRecentes.map(p => (
              <div key={p.id} style={{ background: '#111', border: '1px solid #292929', borderLeft: '3px solid ' + (statusCor[p.status] || '#666'), borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#ef4239' }}>#{p.numero || p.id.substring(0, 6)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#666' }}>
                      {tipoIcon[p.tipo || 'balcao']} {p.tipo || 'Balcão'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, color: '#aaa' }}>{p.cliente || (p.mesa ? 'Mesa ' + p.mesa : 'Balcão')}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#555' }}>{new Date(p.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#fff' }}>R$ {(p.total || 0).toFixed(2).replace('.', ',')}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: (statusCor[p.status] || '#666') + '22', color: statusCor[p.status] || '#888' }}>
                    {p.status?.replace('_', ' ') || 'pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <DashContent />
    </Suspense>
  )
}
