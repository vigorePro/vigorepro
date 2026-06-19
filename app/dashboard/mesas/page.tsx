'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Search, RefreshCw, Users, X, CheckCircle, Clock, AlertCircle, Truck, LayoutGrid, List, Trash2, Edit3 } from 'lucide-react'

type Mesa = {
  id: string
  numero: number
  nome: string
  status: 'livre' | 'ocupada' | 'reservada' | 'inativa'
  capacidade: number
  garcom?: string
  pedido_atual_id?: string
  total_atual?: number
  ocupada_desde?: string
  estabelecimento_id: string
}

type Comanda = {
  id: string
  numero: string
  status: 'aberta' | 'fechada' | 'cancelada'
  cliente?: string
  total: number
  itens: any[]
  criado_em: string
  estabelecimento_id: string
}

function MesasContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandas, setComanadas] = useState<Comanda[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'mesas' | 'comandas'>('mesas')
  const [carregando, setCarregando] = useState(true)
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [modalNovaMesa, setModalNovaMesa] = useState(false)
  const [novaMesa, setNovaMesa] = useState({ numero: '', nome: '', capacidade: '4' })
  const [modoView, setModoView] = useState<'grid' | 'lista'>('grid')

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    const [mesaRes, comRes] = await Promise.all([
      supabase.from('mesas').select('*').eq('estabelecimento_id', estabelecimentoId).order('numero'),
      supabase.from('comandas').select('*').eq('estabelecimento_id', estabelecimentoId).eq('status', 'aberta').order('criado_em', { ascending: false })
    ])
    if (mesaRes.data) setMesas(mesaRes.data)
    if (comRes.data) setComanadas(comRes.data)
    setCarregando(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
    const interval = setInterval(fetchDados, 30000)
    // Supabase Realtime
    const channel = supabase
      .channel('mesas-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchDados() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchDados() })
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchDados])

  const criarMesa = async () => {
    if (!novaMesa.numero || !estabelecimentoId) return
    await supabase.from('mesas').insert({
      estabelecimento_id: estabelecimentoId,
      numero: parseInt(novaMesa.numero),
      nome: novaMesa.nome || 'Mesa ' + novaMesa.numero.padStart(2, '0'),
      capacidade: parseInt(novaMesa.capacidade) || 4,
      status: 'livre'
    })
    setNovaMesa({ numero: '', nome: '', capacidade: '4' })
    setModalNovaMesa(false)
    fetchDados()
  }

  const alterarStatus = async (mesa: Mesa, novoStatus: Mesa['status']) => {
    await supabase.from('mesas').update({ status: novoStatus, ocupada_desde: novoStatus === 'ocupada' ? new Date().toISOString() : null }).eq('id', mesa.id)
    setMesas(prev => prev.map(m => m.id === mesa.id ? { ...m, status: novoStatus } : m))
    if (mesaSelecionada?.id === mesa.id) setMesaSelecionada(prev => prev ? { ...prev, status: novoStatus } : null)
  }

  const excluirMesa = async (id: string) => {
    await supabase.from('mesas').delete().eq('id', id)
    setMesas(prev => prev.filter(m => m.id !== id))
    if (mesaSelecionada?.id === id) setMesaSelecionada(null)
  }

  const mesasFiltradas = mesas.filter(m => {
    const buscaOk = !busca || m.nome?.toLowerCase().includes(busca.toLowerCase()) || m.numero?.toString().includes(busca)
    const statusOk = filtroStatus === 'todos' || m.status === filtroStatus
    return buscaOk && statusOk
  })

  const livres = mesas.filter(m => m.status === 'livre').length
  const ocupadas = mesas.filter(m => m.status === 'ocupada').length
  const reservadas = mesas.filter(m => m.status === 'reservada').length

  const corStatus: Record<string, string> = { livre: '#22c55e', ocupada: '#f59e0b', reservada: '#3b82f6', inativa: '#6b7280' }
  const labelStatus: Record<string, string> = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada', inativa: 'Inativa' }

  const s = { fontFamily: 'Mulish, sans-serif' }

  return (
    <div style={{ ...s, height: '100vh', display: 'flex', overflow: 'hidden', color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* COLUNA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP BAR */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #292929', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Novo pedido */}
          <button onClick={() => setModalNovaMesa(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4239', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
          }}><Plus size={14} /> Nova Mesa</button>

          {/* Busca */}
          <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
            <Search size={13} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar mesa..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #292929', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
            />
          </div>
          <button onClick={fetchDados} style={{ padding: 7, borderRadius: 8, border: '1px solid #292929', background: '#111', color: '#555', cursor: 'pointer', display: 'flex' }}><RefreshCw size={14} /></button>

          {/* Filtros status */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'todos', label: 'Todos', cor: '#888' },
              { id: 'livre', label: `Livre ${livres}`, cor: '#22c55e' },
              { id: 'ocupada', label: `Ocupada ${ocupadas}`, cor: '#f59e0b' },
              { id: 'reservada', label: `Reservada ${reservadas}`, cor: '#3b82f6' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltroStatus(f.id)} style={{
                padding: '5px 12px', borderRadius: 16, border: filtroStatus === f.id ? '1px solid ' + f.cor : '1px solid #292929',
                background: filtroStatus === f.id ? f.cor + '22' : 'transparent',
                color: filtroStatus === f.id ? f.cor : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>{f.label}</button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setModoView('grid')} style={{ padding: 7, borderRadius: 6, border: 'none', background: modoView === 'grid' ? '#ef4239' : '#222', color: modoView === 'grid' ? '#fff' : '#666', cursor: 'pointer', display: 'flex' }}><LayoutGrid size={14} /></button>
            <button onClick={() => setModoView('lista')} style={{ padding: 7, borderRadius: 6, border: 'none', background: modoView === 'lista' ? '#ef4239' : '#222', color: modoView === 'lista' ? '#fff' : '#666', cursor: 'pointer', display: 'flex' }}><List size={14} /></button>
          </div>
        </div>

        {/* ABAS */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
          {[
            { id: 'mesas', label: 'Mesas', badge: mesas.length },
            { id: 'comandas', label: 'Comandas', badge: comandas.length }
          ].map(aba => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: abaAtiva === aba.id ? '2px solid #ef4239' : '2px solid transparent',
              color: abaAtiva === aba.id ? '#ef4239' : '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif', marginBottom: -1
            }}>
              {aba.label}
              <span style={{ background: abaAtiva === aba.id ? '#ef4239' : '#333', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{aba.badge}</span>
            </button>
          ))}
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* ABA MESAS */}
          {abaAtiva === 'mesas' && (
            carregando ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : mesasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
                <Users size={48} color="#333" style={{ marginBottom: 16 }} />
                <h3 style={{ margin: '0 0 8px', color: '#555' }}>Nenhuma mesa encontrada</h3>
                <button onClick={() => setModalNovaMesa(true)} style={{ padding: '10px 20px', background: '#ef4239', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>+ Criar Mesa</button>
              </div>
            ) : modoView === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {mesasFiltradas.map(mesa => (
                  <div key={mesa.id} onClick={() => setMesaSelecionada(mesaSelecionada?.id === mesa.id ? null : mesa)} style={{
                    background: mesaSelecionada?.id === mesa.id ? '#1f1212' : '#1a1a1a',
                    border: '1px solid ' + (mesaSelecionada?.id === mesa.id ? '#ef4239' : corStatus[mesa.status] + '44'),
                    borderTop: '3px solid ' + corStatus[mesa.status],
                    borderRadius: 10, padding: 16, cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: corStatus[mesa.status], textTransform: 'uppercase' }}>{labelStatus[mesa.status]}</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{mesa.numero}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14, color: '#e6e6e6' }}>{mesa.nome}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} color="#555" />
                      <span style={{ fontSize: 12, color: '#666' }}>{mesa.capacidade || 4} pax</span>
                    </div>
                    {mesa.status === 'ocupada' && mesa.ocupada_desde && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Clock size={11} color="#f59e0b" />
                        <span style={{ fontSize: 11, color: '#f59e0b' }}>
                          {Math.floor((Date.now() - new Date(mesa.ocupada_desde).getTime()) / 60000)}min
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mesasFiltradas.map(mesa => (
                  <div key={mesa.id} onClick={() => setMesaSelecionada(mesaSelecionada?.id === mesa.id ? null : mesa)} style={{
                    background: '#1a1a1a', border: '1px solid #292929',
                    borderLeft: '4px solid ' + corStatus[mesa.status],
                    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', minWidth: 30 }}>{mesa.numero}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: '#e6e6e6' }}>{mesa.nome}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontSize: 13 }}><Users size={13} />{mesa.capacidade}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: corStatus[mesa.status] + '22', color: corStatus[mesa.status] }}>{labelStatus[mesa.status]}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ABA COMANDAS */}
          {abaAtiva === 'comandas' && (
            comandas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
                <List size={48} color="#333" style={{ marginBottom: 16 }} />
                <h3 style={{ margin: 0, color: '#555' }}>Nenhuma comanda aberta</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comandas.filter(c => !busca || c.numero?.includes(busca) || (c.cliente || '').toLowerCase().includes(busca.toLowerCase())).map(c => (
                  <div key={c.id} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fff' }}>Comanda #{c.numero}</p>
                      <p style={{ margin: '0 0 2px', fontSize: 13, color: '#888' }}>{c.cliente || 'Sem nome'}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{new Date(c.criado_em).toLocaleString('pt-BR')}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#ef4239' }}>R$ {(c.total || 0).toFixed(2).replace('.', ',')}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#2a1f00', padding: '2px 8px', borderRadius: 8 }}>ABERTA</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* PAINEL LATERAL - DETALHES MESA */}
      <div style={{ width: 280, borderLeft: '1px solid #292929', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mesaSelecionada ? (
          <>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #292929', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{mesaSelecionada.nome}</span>
              <button onClick={() => setMesaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
              {/* Status atual */}
              <div style={{ background: corStatus[mesaSelecionada.status] + '11', border: '1px solid ' + corStatus[mesaSelecionada.status] + '44', borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: corStatus[mesaSelecionada.status], fontWeight: 700 }}>{labelStatus[mesaSelecionada.status].toUpperCase()}</p>
                {mesaSelecionada.status === 'ocupada' && mesaSelecionada.ocupada_desde && (
                  <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Desde {new Date(mesaSelecionada.ocupada_desde).toLocaleTimeString('pt-BR')}</p>
                )}
              </div>

              {/* Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>Número</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Mesa {mesaSelecionada.numero}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>Capacidade</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{mesaSelecionada.capacidade} pessoas</span>
                </div>
              </div>

              {/* Ações */}
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mudar Status</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {(['livre', 'ocupada', 'reservada', 'inativa'] as const).map(st => (
                  <button key={st} onClick={() => alterarStatus(mesaSelecionada, st)} disabled={mesaSelecionada.status === st} style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid ' + (mesaSelecionada.status === st ? corStatus[st] : '#292929'),
                    background: mesaSelecionada.status === st ? corStatus[st] + '22' : '#111',
                    color: mesaSelecionada.status === st ? corStatus[st] : '#888',
                    fontSize: 13, fontWeight: 600, cursor: mesaSelecionada.status === st ? 'not-allowed' : 'pointer',
                    fontFamily: 'Mulish, sans-serif', textAlign: 'left'
                  }}>{labelStatus[st]}</button>
                ))}
              </div>

              {/* Excluir */}
              <button onClick={() => excluirMesa(mesaSelecionada.id)} style={{
                width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #3a1212',
                background: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}><Trash2 size={13} /> Excluir Mesa</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444', padding: 24, textAlign: 'center' }}>
            <LayoutGrid size={40} color="#333" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>Selecione uma mesa para ver detalhes e ações</p>
          </div>
        )}
      </div>

      {/* MODAL NOVA MESA */}
      {modalNovaMesa && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 28, width: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Nova Mesa</h2>
              <button onClick={() => setModalNovaMesa(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {[
              { key: 'numero', label: 'Número', placeholder: 'Ex: 5', type: 'number' },
              { key: 'nome', label: 'Nome (opcional)', placeholder: 'Ex: Mesa 05 ou Varanda', type: 'text' },
              { key: 'capacidade', label: 'Capacidade (pessoas)', placeholder: '4', type: 'number' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{f.label}</label>
                <input value={(novaMesa as any)[f.key]} onChange={e => setNovaMesa(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} type={f.type}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
                />
              </div>
            ))}
            <button onClick={criarMesa} disabled={!novaMesa.numero} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
              background: novaMesa.numero ? '#ef4239' : '#333', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: novaMesa.numero ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif', marginTop: 4
            }}>Criar Mesa</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MesasPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <MesasContent />
    </Suspense>
  )
}
