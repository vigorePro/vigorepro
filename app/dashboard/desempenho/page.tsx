'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart2, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, Clock, Star, Calendar } from 'lucide-react'

const PERIODOS = ['Hoje', '7 dias', '30 dias', '3 meses']

const PRODUTOS_TOP = [
  { nome: 'X-Burguer Especial', vendas: 142, receita: 4970, pct: 100 },
  { nome: 'Pizza Margherita', vendas: 98, receita: 5390, pct: 69 },
  { nome: 'Coca-Cola 600ml', vendas: 87, receita: 435, pct: 61 },
  { nome: 'Fritas Grande', vendas: 76, receita: 988, pct: 54 },
  { nome: 'Suco de Laranja', vendas: 54, receita: 810, pct: 38 },
]

const HORARIOS_PICO = [
  { hora: '11h', pedidos: 12 }, { hora: '12h', pedidos: 28 }, { hora: '13h', pedidos: 35 },
  { hora: '14h', pedidos: 18 }, { hora: '15h', pedidos: 8 }, { hora: '16h', pedidos: 6 },
  { hora: '17h', pedidos: 10 }, { hora: '18h', pedidos: 24 }, { hora: '19h', pedidos: 42 },
  { hora: '20h', pedidos: 38 }, { hora: '21h', pedidos: 29 }, { hora: '22h', pedidos: 14 },
]

const FORMAS_PAG = [
  { nome: 'Cartão de Crédito', pct: 45, valor: 12600, cor: '#6366f1' },
  { nome: 'Pix', pct: 30, valor: 8400, cor: '#22c55e' },
  { nome: 'Dinheiro', pct: 15, valor: 4200, cor: '#f59e0b' },
  { nome: 'Cartão de Débito', pct: 10, valor: 2800, cor: '#8b5cf6' },
]

function DesempenhoContent() {
  const searchParams = useSearchParams()
  const [periodo, setPeriodo] = useState('30 dias')
  const maxPedidos = Math.max(...HORARIOS_PICO.map(h => h.pedidos))

  const cardStyle: React.CSSProperties = { backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '16px' }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart2 size={26} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Desempenho</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Análise de vendas e métricas do negócio</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '4px' }}>
          {PERIODOS.map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              backgroundColor: periodo === p ? '#ef4239' : 'transparent',
              color: periodo === p ? '#fff' : '#888',
              fontSize: '13px', fontWeight: periodo === p ? 600 : 400,
              cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Receita Total', value: 'R$ 28.000', sub: '+12% vs anterior', trend: true, icon: DollarSign, color: '#22c55e' },
          { label: 'Total de Pedidos', value: '487', sub: '+8% vs anterior', trend: true, icon: ShoppingBag, color: '#6366f1' },
          { label: 'Ticket Médio', value: 'R$ 57,49', sub: '+4% vs anterior', trend: true, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Novos Clientes', value: '63', sub: '-3% vs anterior', trend: false, icon: Users, color: '#8b5cf6' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '16px', borderTop: `2px solid ${kpi.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>{kpi.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: kpi.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={kpi.color} />
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>{kpi.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: kpi.trend ? '#22c55e' : '#ef4239' }}>
                {kpi.trend ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.sub}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Horarios de pico */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Clock size={16} color='#ef4239' />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Horários de Pico</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
            {HORARIOS_PICO.map(h => (
              <div key={h.hora} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: `${(h.pedidos / maxPedidos) * 100}px`,
                  backgroundColor: h.pedidos === maxPedidos ? '#ef4239' : '#ef423940',
                  borderRadius: '3px 3px 0 0',
                  minHeight: '4px'
                }} />
                <span style={{ color: '#555', fontSize: '10px' }}>{h.hora}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888', fontSize: '12px' }}>Pico: 19h ({HORARIOS_PICO.find(h => h.pedidos === maxPedidos)?.pedidos} pedidos)</span>
            <span style={{ color: '#22c55e', fontSize: '12px' }}>Média: {Math.round(HORARIOS_PICO.reduce((a,h) => a+h.pedidos,0)/HORARIOS_PICO.length)} pedidos/hora</span>
          </div>
        </div>

        {/* Formas de pagamento */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <DollarSign size={16} color='#ef4239' />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Formas de Pagamento</span>
          </div>
          {FORMAS_PAG.map(fp => (
            <div key={fp.nome} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#e6e6e6', fontSize: '13px' }}>{fp.nome}</span>
                <span style={{ color: '#888', fontSize: '12px' }}>R$ {fp.valor.toLocaleString('pt-BR')} ({fp.pct}%)</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${fp.pct}%`, height: '100%', backgroundColor: fp.cor, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top produtos */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Star size={16} color='#ef4239' />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Produtos Mais Vendidos</span>
        </div>
        {PRODUTOS_TOP.map((p, i) => (
          <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
              backgroundColor: i === 0 ? '#ef4239' : '#222',
              color: i === 0 ? '#fff' : '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700
            }}>#{i+1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#e6e6e6', fontSize: '14px' }}>{p.nome}</span>
                <span style={{ color: '#888', fontSize: '13px' }}>{p.vendas} vendas · R$ {p.receita.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ height: '5px', backgroundColor: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${p.pct}%`, height: '100%', backgroundColor: i === 0 ? '#ef4239' : '#ef423960', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Avaliacao media */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Star size={16} color='#f59e0b' fill='#f59e0b' />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '28px' }}>4.7</span>
            <span style={{ color: '#888', fontSize: '14px' }}>/ 5.0</span>
          </div>
          <span style={{ color: '#888', fontSize: '13px' }}>Avaliação média dos clientes (128 avaliações)</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={20} color='#f59e0b' fill={s <= 4 ? '#f59e0b' : 'none'} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DesempenhoPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <DesempenhoContent />
    </Suspense>
  )
}
