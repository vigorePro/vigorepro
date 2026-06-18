'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function FidelidadeContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [abaSidebar, setAbaSidebar] = useState<'fidelidade' | 'cupom' | 'cashback' | 'avaliacoes'>('fidelidade')
  const [filtroPeriodo, setFiltroPeriodo] = useState('Últimos 31 dias')
  const [filtroBeneficio, setFiltroBeneficio] = useState('Cashback + Cupom')
  const [abaGrafico, setAbaGrafico] = useState<'auto' | 'diario' | 'semanal' | 'mensal'>('auto')

  const metrics = [
    { label: 'Desconto concedido', icon: '🏷️', valor: 'R$ 0,00', sub: 'R$ 0,00 cupom + R$ 0,00 cashback', cor: '#ef4444' },
    { label: 'Faturamento influenciado', icon: '📈', valor: 'R$ 0,00', sub: '0 vendas', cor: '#10b981' },
    { label: 'ROI fidelidade', icon: '🎯', valor: '—', sub: 'Sem desconto no período', cor: '#3b82f6' },
    { label: 'Cashback gerado', icon: '💰', valor: 'R$ 0,00', sub: 'R$ 0,00 expirado', cor: '#f59e0b' }
  ]

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh', color: '#ffffff', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar CRM */}
      <div style={{ width: '220px', backgroundColor: '#1a1a1a', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FIDELIDADE (CRM)</span>
        </div>
        <nav style={{ padding: '8px' }}>
          {[
            { key: 'fidelidade', label: 'Fidelidade', icon: '⭐' },
            { key: 'cupom', label: 'Cupom de Desconto', icon: '🏷️' },
            { key: 'cashback', label: 'Cashback', icon: '💰' },
            { key: 'avaliacoes', label: 'Avaliações', icon: '⭐' }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setAbaSidebar(item.key as any)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                textAlign: 'left' as any, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                marginBottom: '2px',
                backgroundColor: abaSidebar === item.key ? '#eb002922' : 'transparent',
                color: abaSidebar === item.key ? '#eb0029' : '#9ca3af',
                fontWeight: abaSidebar === item.key ? '600' : '400'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {abaSidebar === 'fidelidade' && (
          <>
            {/* Filtros */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span>📅</span>
                <span>{filtroPeriodo}</span>
              </div>
              <button onClick={() => {}} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>↻</button>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Tipo de benefício</span>
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {filtroBeneficio} <span style={{ opacity: 0.5 }}>▾</span>
                </div>
              </div>
            </div>

            {/* Cards resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Benefício preferido */}
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px' }}>⚙️</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Benefício preferido</span>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Sem uso no período.</p>
              </div>

              {/* Resumo */}
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px' }}>👤</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Resumo</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Vendas com fidelidade', valor: '0' },
                    { label: 'Cardápios envolvidos', valor: '0' },
                    { label: 'Cupons usados', valor: '0' },
                    { label: 'Usos de cashback', valor: '0' }
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{item.valor}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 cards métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {metrics.map(m => (
                <div key={m.label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{m.icon}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{m.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>ⓘ</span>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{m.valor}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Gráfico Fidelidade por dia */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Fidelidade por Dia</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { key: 'auto', label: 'Auto' },
                    { key: 'diario', label: 'Diário' },
                    { key: 'semanal', label: 'Semanal' },
                    { key: 'mensal', label: 'Mensal' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setAbaGrafico(tab.key as any)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: 'none',
                        backgroundColor: abaGrafico === tab.key ? '#eb0029' : '#2a2a2a',
                        color: abaGrafico === tab.key ? '#fff' : '#9ca3af'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '13px', borderTop: '1px solid #2a2a2a', paddingTop: '16px' }}>
                Sem movimentação de fidelidade no período.
              </div>
            </div>

            {/* Faturamento por dia da semana */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>📅</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Faturamento por dia da semana × Fidelidade</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>ⓘ</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, maxWidth: '500px' }}>
                    Identifique os dias fracos para reforçar cashback e os dias fortes para explorar novos cupons.
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>⭐ Mais forte: Quinta R$ 4,00</span>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#111111', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>ⓘ</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Sem registros de cashback ou cupom no período — talvez essas mecânicas ainda não estejam ativas.</span>
              </div>
              {/* Mini barras por dia */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '16px' }}>
                {diasSemana.map(dia => (
                  <div key={dia} style={{ textAlign: 'center' as any }}>
                    <div style={{ height: '60px', backgroundColor: '#2a2a2a', borderRadius: '4px', marginBottom: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                      <div style={{ width: '60%', height: '0%', backgroundColor: '#eb0029', borderRadius: '2px 2px 0 0' }}></div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{dia}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {abaSidebar === 'cupom' && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Cupons de Desconto</div>
            <p style={{ fontSize: '14px' }}>Configure cupons para os seus clientes</p>
            <button style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#eb0029', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
              + Criar Cupom
            </button>
          </div>
        )}

        {abaSidebar === 'cashback' && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Programa de Cashback</div>
            <p style={{ fontSize: '14px' }}>Recompense seus clientes com cashback nas compras</p>
            <button style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#eb0029', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
              Configurar Cashback
            </button>
          </div>
        )}

        {abaSidebar === 'avaliacoes' && (
          <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Avaliações</div>
            <p style={{ fontSize: '14px' }}>Acompanhe as avaliações dos seus clientes</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FidelidadePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>}>
      <FidelidadeContent />
    </Suspense>
  )
}
