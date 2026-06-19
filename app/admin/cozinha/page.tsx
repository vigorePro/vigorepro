'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChefHat, Clock, AlertTriangle, CheckCircle2, RefreshCw, Search, Bell, BellOff, Grid, List, ChevronRight, ChevronLeft, Utensils, LogOut, Settings, Sun, Moon } from 'lucide-react'

type ItemPedido = {
  id: string
  nome: string
  quantidade: number
  observacao?: string
  setor?: string
}

type Pedido = {
  id: string
  numero: number
  status: 'pendente' | 'em_preparo' | 'pronto' | 'entregue'
  tipo: string
  mesa?: string
  cliente?: string
  criado_em: string
  tempo_espera?: number
  itens: ItemPedido[]
  estabelecimento_id: string
}

function KDSContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [busca, setBusca] = useState('')
  const [modoGrade, setModoGrade] = useState(true)
  const [somAtivo, setSomAtivo] = useState(true)
  const [resumoAberto, setResumoAberto] = useState(true)
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [carregando, setCarregando] = useState(true)
  const [ultimaAtt, setUltimaAtt] = useState(new Date())
  const audioCtxRef = useRef<AudioContext | null>(null)
  const qtdAnterior = useRef(0)

  const tocarSom = useCallback(() => {
    if (!somAtivo) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [somAtivo])

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchPedidos = useCallback(async () => {
    if (!estabelecimentoId) return
    const { data } = await supabase
      .from('pedidos')
      .select('id, numero, status, tipo, mesa, cliente, criado_em, itens, estabelecimento_id')
      .eq('estabelecimento_id', estabelecimentoId)
      .in('status', ['pendente', 'em_preparo'])
      .order('criado_em', { ascending: true })

    if (data) {
      const agora = new Date()
      const pedidosComTempo = data.map((p: any) => ({
        ...p,
        itens: Array.isArray(p.itens) ? p.itens : [],
        tempo_espera: Math.floor((agora.getTime() - new Date(p.criado_em).getTime()) / 60000)
      }))
      if (pedidosComTempo.length > qtdAnterior.current) tocarSom()
      qtdAnterior.current = pedidosComTempo.length
      setPedidos(pedidosComTempo)
      setUltimaAtt(new Date())
    }
    setCarregando(false)
  }, [estabelecimentoId, tocarSom])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchPedidos()
    const interval = setInterval(fetchPedidos, 15000)
    return () => clearInterval(interval)
  }, [estabelecimentoId, fetchPedidos])

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)
    setPedidos(prev => novoStatus === 'pronto'
      ? prev.filter(p => p.id !== id)
      : prev.map(p => p.id === id ? { ...p, status: novoStatus as any } : p)
    )
  }

  const pedidosFiltrados = pedidos.filter(p =>
    p.numero?.toString().includes(busca) ||
    p.mesa?.toLowerCase().includes(busca.toLowerCase()) ||
    p.cliente?.toLowerCase().includes(busca.toLowerCase())
  )
  const pendentes = pedidosFiltrados.filter(p => p.status === 'pendente')
  const emPreparo = pedidosFiltrados.filter(p => p.status === 'em_preparo')

  const corTempo = (min: number) => min >= 20 ? '#ef4444' : min >= 10 ? '#f59e0b' : '#22c55e'

  const bg = tema === 'dark' ? '#0a0a0a' : '#f5f5f5'
  const cardBg = tema === 'dark' ? '#1a1a1a' : '#ffffff'
  const bordaCard = tema === 'dark' ? '#2a2a2a' : '#e0e0e0'
  const texto = tema === 'dark' ? '#e6e6e6' : '#111111'
  const textoSec = tema === 'dark' ? '#888' : '#666'
  const topBar = tema === 'dark' ? '#111' : '#fff'
  const topBorder = tema === 'dark' ? '#222' : '#e0e0e0'
  const btnBg = tema === 'dark' ? '#222' : '#f0f0f0'
  const btnBorder = tema === 'dark' ? '#333' : '#d0d0d0'

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', background: bg, minHeight: '100vh', color: texto }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* TOP BAR */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: topBar, borderBottom: `1px solid ${topBorder}`,
        height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <ChefHat size={22} color="#ef4239" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#ef4239' }}>KDS</span>
        </div>

        {/* Busca */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} color={textoSec} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar pedido..."
            style={{
              width: '100%', padding: '6px 10px 6px 32px', borderRadius: 20,
              border: `1px solid ${btnBorder}`, background: btnBg, color: texto,
              fontSize: 13, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Contadores */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          borderRadius: 20, border: `1px solid ${btnBorder}`, background: btnBg, fontSize: 13, fontWeight: 600
        }}>
          Pendentes: <span style={{ color: '#f59e0b' }}>{pendentes.length}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
          borderRadius: 20, border: '1px solid #22c55e', background: '#0f2e1a', fontSize: 13, fontWeight: 600, color: '#22c55e'
        }}>
          Em Produção: <span>{emPreparo.length}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Botões direita */}
        {[
          { icon: <RefreshCw size={16} />, label: 'Atualizar', action: () => fetchPedidos(), active: false },
          { icon: modoGrade ? <List size={16} /> : <Grid size={16} />, label: modoGrade ? 'Lista' : 'Grade', action: () => setModoGrade(!modoGrade), active: modoGrade },
          { icon: somAtivo ? <Bell size={16} /> : <BellOff size={16} />, label: 'Som', action: () => setSomAtivo(!somAtivo), active: somAtivo },
          { icon: tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />, label: 'Tema', action: () => setTema(tema === 'dark' ? 'light' : 'dark'), active: false },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} title={btn.label} style={{
            width: 36, height: 36, borderRadius: '50%', border: `1px solid ${btn.active ? '#ef4239' : btnBorder}`,
            background: btn.active ? '#281615' : btnBg, color: btn.active ? '#ef4239' : texto,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {btn.icon}
          </button>
        ))}

        {/* Última atualização */}
        <span style={{ fontSize: 11, color: textoSec }}>
          {ultimaAtt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* CONTEÚDO */}
      <div style={{ display: 'flex', paddingTop: 56, height: '100vh' }}>
        {/* ÁREA PRINCIPAL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {carregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
              <RefreshCw size={32} color="#ef4239" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: textoSec }}>Carregando pedidos...</span>
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
              <Utensils size={48} color={textoSec} />
              <h2 style={{ margin: 0, fontSize: 20, color: texto }}>Nenhum pedido para preparar</h2>
              <p style={{ margin: 0, color: textoSec, fontSize: 14 }}>Aguardando novos pedidos chegarem</p>
            </div>
          ) : (
            <div style={{
              display: modoGrade ? 'grid' : 'flex',
              gridTemplateColumns: modoGrade ? 'repeat(auto-fill, minmax(280px, 1fr))' : undefined,
              flexDirection: modoGrade ? undefined : 'column',
              gap: 12
            }}>
              {pedidosFiltrados.map(pedido => {
                const isPendente = pedido.status === 'pendente'
                const bordaStatus = isPendente ? '#f59e0b' : '#ef4239'
                const bgStatus = isPendente ? '#2a1f00' : '#281615'
                const txtStatus = isPendente ? '#f59e0b' : '#ef4239'
                const labelStatus = isPendente ? 'PENDENTE' : 'EM PREPARO'

                return (
                  <div key={pedido.id} style={{
                    background: cardBg,
                    border: `1px solid ${bordaCard}`,
                    borderTop: `3px solid ${bordaStatus}`,
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    {/* Header do card */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 18, color: texto }}>#{pedido.numero}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: bgStatus, color: txtStatus, letterSpacing: 0.5
                        }}>{labelStatus}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} color={corTempo(pedido.tempo_espera || 0)} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: corTempo(pedido.tempo_espera || 0) }}>
                          {pedido.tempo_espera || 0}min
                        </span>
                      </div>
                    </div>

                    {/* Info: tipo + mesa/cliente */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 6,
                        background: btnBg, color: textoSec, border: `1px solid ${btnBorder}`
                      }}>{pedido.tipo || 'Mesa'}</span>
                      {pedido.mesa && (
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 6,
                          background: btnBg, color: texto, fontWeight: 600, border: `1px solid ${btnBorder}`
                        }}>Mesa {pedido.mesa}</span>
                      )}
                      {pedido.cliente && !pedido.mesa && (
                        <span style={{ fontSize: 11, color: textoSec }}>{pedido.cliente}</span>
                      )}
                    </div>

                    {/* Itens */}
                    <div style={{ borderTop: `1px solid ${bordaCard}`, paddingTop: 8 }}>
                      {(pedido.itens || []).map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          marginBottom: idx < (pedido.itens?.length || 0) - 1 ? 6 : 0
                        }}>
                          <span style={{
                            minWidth: 22, height: 22, borderRadius: 6,
                            background: '#ef4239', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0
                          }}>{item.quantidade}</span>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: texto }}>{item.nome}</span>
                            {item.observacao && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#f59e0b', fontStyle: 'italic' }}>
                                ⚠ {item.observacao}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!pedido.itens || pedido.itens.length === 0) && (
                        <span style={{ fontSize: 12, color: textoSec }}>Sem itens</span>
                      )}
                    </div>

                    {/* Botões de ação */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {isPendente ? (
                        <button onClick={() => atualizarStatus(pedido.id, 'em_preparo')} style={{
                          flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
                          background: '#ef4239', color: '#fff', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                        }}>Iniciar Preparo</button>
                      ) : (
                        <>
                          <button onClick={() => atualizarStatus(pedido.id, 'pendente')} style={{
                            flex: 1, padding: '8px 0', borderRadius: 6,
                            border: `1px solid ${btnBorder}`, background: btnBg,
                            color: texto, fontWeight: 600, fontSize: 12,
                            cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                          }}>Voltar</button>
                          <button onClick={() => atualizarStatus(pedido.id, 'pronto')} style={{
                            flex: 2, padding: '8px 0', borderRadius: 6, border: 'none',
                            background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13,
                            cursor: 'pointer', fontFamily: 'Mulish, sans-serif',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}>
                            <CheckCircle2 size={15} /> Pronto!
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PAINEL LATERAL - RESUMO */}
        {resumoAberto && (
          <div style={{
            width: 260, background: cardBg, borderLeft: `1px solid ${bordaCard}`,
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: `1px solid ${bordaCard}`
            }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: texto }}>Resumo da Produção</span>
              <button onClick={() => setResumoAberto(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: textoSec, padding: 2
              }}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats */}
              {[
                { label: 'Pendentes', valor: pendentes.length, cor: '#f59e0b' },
                { label: 'Em preparo', valor: emPreparo.length, cor: '#ef4239' },
                { label: 'Total na fila', valor: pedidosFiltrados.length, cor: texto },
              ].map((stat, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 8, background: btnBg, border: `1px solid ${btnBorder}`
                }}>
                  <span style={{ fontSize: 13, color: textoSec }}>{stat.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: stat.cor }}>{stat.valor}</span>
                </div>
              ))}

              {/* Tempo médio */}
              {pedidosFiltrados.length > 0 && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: btnBg, border: `1px solid ${btnBorder}` }}>
                  <span style={{ fontSize: 12, color: textoSec, display: 'block', marginBottom: 4 }}>Tempo médio de espera</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: corTempo(Math.round(pedidosFiltrados.reduce((a, p) => a + (p.tempo_espera || 0), 0) / pedidosFiltrados.length)) }}>
                    {Math.round(pedidosFiltrados.reduce((a, p) => a + (p.tempo_espera || 0), 0) / pedidosFiltrados.length)} min
                  </span>
                </div>
              )}

              {/* Alertas */}
              {pedidos.filter(p => (p.tempo_espera || 0) >= 15).length > 0 && (
                <div style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: '#2a0f0f', border: '1px solid #7f1d1d',
                  display: 'flex', gap: 8, alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', display: 'block' }}>Atenção</span>
                    <span style={{ fontSize: 11, color: '#fca5a5' }}>
                      {pedidos.filter(p => (p.tempo_espera || 0) >= 15).length} pedido(s) há mais de 15 min
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão reabrir resumo */}
        {!resumoAberto && (
          <button onClick={() => setResumoAberto(true)} style={{
            position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
            background: '#ef4239', border: 'none', borderRadius: '8px 0 0 8px',
            color: '#fff', cursor: 'pointer', padding: '12px 6px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
          }}>
            <ChevronLeft size={16} />
            <span style={{ fontSize: 10, fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>RESUMO</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function KDSPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#0a0a0a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ef4239', fontFamily: 'Mulish, sans-serif', fontSize: 16 }}>Carregando KDS...</div>
      </div>
    }>
      <KDSContent />
    </Suspense>
  )
}
