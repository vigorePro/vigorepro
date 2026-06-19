'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RefreshCw, CheckCircle, XCircle, DollarSign, Plus, X, TrendingUp, TrendingDown, Clock, LayoutList, AlertTriangle } from 'lucide-react'

type Caixa = {
  id: string
  abertura: string
  fechamento?: string
  saldo_inicial: number
  saldo_final?: number
  total_vendas?: number
  total_cancelamentos?: number
  status: 'aberto' | 'fechado'
  estabelecimento_id: string
}

type Cancelamento = {
  id: string
  pedido_id: string
  motivo: string
  valor: number
  criado_em: string
  estabelecimento_id: string
}

function CaixaContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [cancelamentos, setCancelamentos] = useState<Cancelamento[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'listagem' | 'cancelamentos'>('listagem')
  const [carregando, setCarregando] = useState(true)
  const [modalAbrir, setModalAbrir] = useState(false)
  const [modalFechar, setModalFechar] = useState<Caixa | null>(null)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saldoFinal, setSaldoFinal] = useState('')
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null)

  // KPIs
  const totalVendasHoje = caixas.filter(c => {
    const hoje = new Date().toDateString()
    return new Date(c.abertura).toDateString() === hoje
  }).reduce((a, c) => a + (c.total_vendas || 0), 0)

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    const [caixaRes, cancelRes] = await Promise.all([
      supabase.from('caixas').select('*').eq('estabelecimento_id', estabelecimentoId).order('abertura', { ascending: false }).limit(50),
      supabase.from('cancelamentos').select('*').eq('estabelecimento_id', estabelecimentoId).order('criado_em', { ascending: false }).limit(50)
    ])
    if (caixaRes.data) {
      setCaixas(caixaRes.data)
      const aberto = caixaRes.data.find(c => c.status === 'aberto')
      setCaixaAberto(aberto || null)
    }
    if (cancelRes.data) setCancelamentos(cancelRes.data)
    setCarregando(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => { if (estabelecimentoId) fetchDados() }, [estabelecimentoId, fetchDados])

  const abrirCaixa = async () => {
    if (!estabelecimentoId || !saldoInicial) return
    await supabase.from('caixas').insert({
      estabelecimento_id: estabelecimentoId,
      saldo_inicial: parseFloat(saldoInicial),
      status: 'aberto',
      abertura: new Date().toISOString()
    })
    setSaldoInicial('')
    setModalAbrir(false)
    fetchDados()
  }

  const fecharCaixa = async () => {
    if (!modalFechar) return
    await supabase.from('caixas').update({
      status: 'fechado',
      fechamento: new Date().toISOString(),
      saldo_final: parseFloat(saldoFinal) || 0
    }).eq('id', modalFechar.id)
    setSaldoFinal('')
    setModalFechar(null)
    fetchDados()
  }

  const s = { fontFamily: 'Mulish, sans-serif' }

  return (
    <div style={{ ...s, padding: 24, color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Caixa</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>Controle de abertura, fechamento e cancelamentos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchDados} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          {!caixaAberto ? (
            <button onClick={() => setModalAbrir(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Abrir Caixa
            </button>
          ) : (
            <button onClick={() => setModalFechar(caixaAberto)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={16} /> Fechar Caixa
            </button>
          )}
        </div>
      </div>

      {/* Status do Caixa atual */}
      {caixaAberto && (
        <div style={{ background: '#0f2e1a', border: '1px solid #16a34a', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={20} color="#22c55e" />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 14 }}>Caixa Aberto</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4ade80' }}>
              Aberto em {new Date(caixaAberto.abertura).toLocaleString('pt-BR')} · Saldo inicial: R$ {(caixaAberto.saldo_inicial || 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Vendas Hoje', valor: 'R$ ' + totalVendasHoje.toFixed(2).replace('.', ','), icon: <TrendingUp size={20} />, cor: '#22c55e' },
          { label: 'Caixas Abertos', valor: caixas.filter(c => c.status === 'aberto').length, icon: <CheckCircle size={20} />, cor: '#22c55e' },
          { label: 'Caixas Fechados', valor: caixas.filter(c => c.status === 'fechado').length, icon: <XCircle size={20} />, cor: '#6b7280' },
          { label: 'Cancelamentos', valor: cancelamentos.length, icon: <AlertTriangle size={20} />, cor: '#ef4444' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888' }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{kpi.valor}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #292929' }}>
        {[
          { id: 'listagem', label: 'Listagem de Caixa', icon: <LayoutList size={14} /> },
          { id: 'cancelamentos', label: 'Cancelamentos', icon: <XCircle size={14} /> },
        ].map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'none', border: 'none', borderBottom: abaAtiva === aba.id ? '2px solid #ef4239' : '2px solid transparent',
            color: abaAtiva === aba.id ? '#ef4239' : '#888', fontWeight: abaAtiva === aba.id ? 600 : 400,
            fontSize: 14, cursor: 'pointer', marginBottom: -1, fontFamily: 'Mulish, sans-serif'
          }}>{aba.icon}{aba.label}</button>
        ))}
      </div>

      {/* ABA LISTAGEM */}
      {abaAtiva === 'listagem' && (
        carregando ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : caixas.length === 0 ? (
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 60, textAlign: 'center', color: '#555' }}>
            <DollarSign size={48} color="#333" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: '#555' }}>Nenhum caixa registrado</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Abra o primeiro caixa para comecar a registrar vendas</p>
          </div>
        ) : (
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Status', 'Abertura', 'Fechamento', 'Saldo Inicial', 'Saldo Final', 'Total Vendas', 'Ações'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {caixas.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < caixas.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                        background: c.status === 'aberto' ? '#0f2e1a' : '#1a1a1a',
                        color: c.status === 'aberto' ? '#22c55e' : '#6b7280',
                        border: '1px solid ' + (c.status === 'aberto' ? '#16a34a' : '#333')
                      }}>{c.status === 'aberto' ? 'Aberto' : 'Fechado'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#aaa' }}>{new Date(c.abertura).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#aaa' }}>{c.fechamento ? new Date(c.fechamento).toLocaleString('pt-BR') : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#e6e6e6' }}>R$ {(c.saldo_inicial || 0).toFixed(2).replace('.', ',')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#e6e6e6' }}>{c.saldo_final != null ? 'R$ ' + c.saldo_final.toFixed(2).replace('.', ',') : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#22c55e' }}>{c.total_vendas != null ? 'R$ ' + c.total_vendas.toFixed(2).replace('.', ',') : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.status === 'aberto' && (
                        <button onClick={() => setModalFechar(c)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#ef444422', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Fechar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ABA CANCELAMENTOS */}
      {abaAtiva === 'cancelamentos' && (
        cancelamentos.length === 0 ? (
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 60, textAlign: 'center', color: '#555' }}>
            <XCircle size={48} color="#333" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: '#555' }}>Nenhum cancelamento</h3>
            <p style={{ margin: 0, fontSize: 14 }}>Os cancelamentos de pedidos aparecerao aqui</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cancelamentos.map(c => (
              <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#fff' }}>Pedido #{c.pedido_id?.substring(0, 8)}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#888' }}>{c.motivo || 'Sem motivo informado'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>{new Date(c.criado_em).toLocaleString('pt-BR')}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>- R$ {(c.valor || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* MODAL ABRIR CAIXA */}
      {modalAbrir && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 32, width: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Abrir Caixa</h2>
              <button onClick={() => setModalAbrir(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>Saldo Inicial (R$)</label>
            <input value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} type="number" placeholder="0,00" autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 16, outline: 'none', marginBottom: 20, boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
            />
            <button onClick={abrirCaixa} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Abrir Caixa</button>
          </div>
        </div>
      )}

      {/* MODAL FECHAR CAIXA */}
      {modalFechar && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 32, width: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Fechar Caixa</h2>
              <button onClick={() => setModalFechar(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
              Aberto em: {new Date(modalFechar.abertura).toLocaleString('pt-BR')}<br />
              Saldo inicial: R$ {(modalFechar.saldo_inicial || 0).toFixed(2).replace('.', ',')}
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>Saldo Final em Caixa (R$)</label>
            <input value={saldoFinal} onChange={e => setSaldoFinal(e.target.value)} type="number" placeholder="0,00" autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 16, outline: 'none', marginBottom: 20, boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
            />
            <button onClick={fecharCaixa} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Fechar Caixa</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CaixaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <CaixaContent />
    </Suspense>
  )
}
