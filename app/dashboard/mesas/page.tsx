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
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
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
    const [mesaRes, comRes] = await Promise.all([
      supabase.from('mesas').select('*').eq('estabelecimento_id', estabelecimentoId).order('numero'),
      supabase.from('comandas').select('*').eq('estabelecimento_id', estabelecimentoId).order('criado_em', { ascending: false })
    ])
    if (mesaRes.data) setMesas(mesaRes.data)
    if (comRes.data) setComanadas(comRes.data)
    setLoading(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
    const interval = setInterval(fetchDados, 30000)
    // Supabase realtime
    const channel = supabase
      .channel('mesas-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, fetchDados)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchDados])

  const dispararNotificacaoMesa = async (mesa: Mesa, evento: string) => {
    try {
      // Buscar cliente da comanda ativa da mesa, se houver
      const comanda = comandas.find(c => c.status === 'aberta' && (c as any).mesa_id === mesa.id)
      const clienteNome = comanda?.cliente || mesa.nome || 'Cliente'
      await fetch('/api/notificacoes/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estabelecimento_id: estabelecimentoId,
          evento,
          dados: {
            cliente_nome: clienteNome,
            mesa_numero: mesa.numero,
            mesa_nome: mesa.nome,
            venda_numero: comanda?.numero || mesa.numero?.toString() || '',
            venda_produtos: comanda?.itens?.map((i: any) => i.nome || i.produto_nome).join(', ') || '',
            venda_total: comanda?.total ? 'R$ ' + comanda.total.toFixed(2).replace('.', ',') : '',
            slug
          }
        })
      })
    } catch (e) {
      // silencioso - notificacao e opcional
    }
  }

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
    // Disparar notificacao conforme o novo status
    if (novoStatus === 'ocupada') {
      await dispararNotificacaoMesa(mesa, 'confirmado')
    } else if (novoStatus === 'livre') {
      await dispararNotificacaoMesa(mesa, 'entregue')
    }
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

  const corStatus: Record<string, string> = { livre: '#22c55e', ocupada: '#ef4444', reservada: '#f59e0b', inativa: '#555' }
  const labelStatus: Record<string, string> = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada', inativa: 'Inativa' }

  const iconeStatus = (st: string) => {
    if (st === 'livre') return <CheckCircle size={14} />
    if (st === 'ocupada') return <Users size={14} />
    if (st === 'reservada') return <Clock size={14} />
    return <AlertCircle size={14} />
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#888', fontFamily: 'Mulish, sans-serif' }}>
      <RefreshCw size={22} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} /> Carregando mesas...
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', fontFamily: 'Mulish, sans-serif', overflow: 'hidden' }}>
      {/* Painel principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 12, background: '#0d0d0d' }}>
          <Users size={20} color="#c9a227" />
          <span style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>Mesas</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => setModoView('grid')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: modoView === 'grid' ? '#c9a227' : '#1a1a1a', color: modoView === 'grid' ? '#000' : '#888', cursor: 'pointer' }}><LayoutGrid size={14} /></button>
            <button onClick={() => setModoView('lista')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: modoView === 'lista' ? '#c9a227' : '#1a1a1a', color: modoView === 'lista' ? '#000' : '#888', cursor: 'pointer' }}><List size={14} /></button>
            <button onClick={fetchDados} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#888', cursor: 'pointer' }}><RefreshCw size={14} /></button>
            <button onClick={() => setModalNovaMesa(true)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#c9a227', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Nova Mesa</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid #1a1a1a' }}>
          {[{ label: 'Total', value: mesas.length, color: '#888' }, { label: 'Livres', value: livres, color: '#22c55e' }, { label: 'Ocupadas', value: ocupadas, color: '#ef4444' }, { label: 'Reservadas', value: reservadas, color: '#f59e0b' }].map(s => (
            <div key={s.label} style={{ background: '#111', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Busca e filtro */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar mesa..." style={{ width: '100%', padding: '7px 10px 7px 30px', background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'Mulish', boxSizing: 'border-box' }} />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: '7px 12px', background: '#111', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'Mulish' }}>
            <option value="todos">Todos</option>
            <option value="livre">Livres</option>
            <option value="ocupada">Ocupadas</option>
            <option value="reservada">Reservadas</option>
            <option value="inativa">Inativas</option>
          </select>
        </div>

        {/* Grid/Lista de Mesas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {modoView === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {mesasFiltradas.map(mesa => (
                <div key={mesa.id} onClick={() => setMesaSelecionada(mesa)} style={{ background: '#111', border: '2px solid ' + (mesaSelecionada?.id === mesa.id ? '#c9a227' : corStatus[mesa.status] + '44'), borderRadius: 12, padding: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: corStatus[mesa.status] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + corStatus[mesa.status] }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{mesa.numero}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: corStatus[mesa.status], display: 'flex', alignItems: 'center', gap: 3 }}>{iconeStatus(mesa.status)} {labelStatus[mesa.status]}</span>
                  <span style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>{mesa.nome}</span>
                  {mesa.status === 'ocupada' && mesa.total_atual && (
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>
                      R$ {mesa.total_atual.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              ))}
              {mesasFiltradas.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#555' }}>Nenhuma mesa encontrada</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mesasFiltradas.map(mesa => (
                <div key={mesa.id} onClick={() => setMesaSelecionada(mesa)} style={{ background: '#111', border: '1px solid ' + (mesaSelecionada?.id === mesa.id ? '#c9a227' : '#1a1a1a'), borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: corStatus[mesa.status] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + corStatus[mesa.status] }}>
                    <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{mesa.numero}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{mesa.nome}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{mesa.capacidade} pessoas</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: corStatus[mesa.status] + '22', color: corStatus[mesa.status] }}>{labelStatus[mesa.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comandas recentes */}
        {comandas.length > 0 && (
          <div style={{ borderTop: '1px solid #1a1a1a', padding: '12px 20px', maxHeight: 180, overflowY: 'auto' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Comandas Recentes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {comandas.slice(0, 5).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#c9a227' }}>#{c.numero}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 13, color: '#888' }}>{c.cliente || 'Sem nome'}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.status === 'aberta' ? '#22c55e' : c.status === 'fechada' ? '#888' : '#ef4444' }}>{c.status}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>R$ {c.total?.toFixed(2).replace('.', ',') || '0,00'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Painel lateral - detalhes da mesa */}
      {mesaSelecionada && (
        <div style={{ width: 260, borderLeft: '1px solid #1a1a1a', background: '#0d0d0d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: corStatus[mesaSelecionada.status] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + corStatus[mesaSelecionada.status] }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{mesaSelecionada.numero}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{mesaSelecionada.nome}</div>
              <div style={{ fontSize: 11, color: corStatus[mesaSelecionada.status], fontWeight: 600 }}>{labelStatus[mesaSelecionada.status]}</div>
            </div>
            <button onClick={() => setMesaSelecionada(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#666' }}>Capacidade</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {mesaSelecionada.capacidade} pessoas</span>
            </div>

            {mesaSelecionada.ocupada_desde && mesaSelecionada.status === 'ocupada' && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#666' }}>Ocupada desde</p>
                <span style={{ fontSize: 12, color: '#f59e0b' }}>{new Date(mesaSelecionada.ocupada_desde).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mudar Status</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(['livre', 'ocupada', 'reservada', 'inativa'] as const).map(st => (
                <button key={st} onClick={() => alterarStatus(mesaSelecionada, st)} disabled={mesaSelecionada.status === st} style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid ' + (mesaSelecionada.status === st ? corStatus[st] : '#292929'),
                  background: mesaSelecionada.status === st ? corStatus[st] + '22' : '#111',
                  color: mesaSelecionada.status === st ? corStatus[st] : '#888',
                  fontSize: 13, fontWeight: 600, cursor: mesaSelecionada.status === st ? 'not-allowed' : 'pointer',
                  fontFamily: 'Mulish, sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  {iconeStatus(st)} {labelStatus[st]}
                  {st === 'ocupada' && <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>📲 notif.</span>}
                  {st === 'livre' && <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>📲 notif.</span>}
                </button>
              ))}
            </div>

            <button onClick={() => excluirMesa(mesaSelecionada.id)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #3a1212', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
              <Trash2 size={14} /> Excluir Mesa
            </button>
          </div>
        </div>
      )}

      {/* Modal Nova Mesa */}
      {modalNovaMesa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#111', borderRadius: 16, padding: 28, width: 360, border: '1px solid #222' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Nova Mesa</span>
              <button onClick={() => setModalNovaMesa(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {[
              { label: 'Número', key: 'numero', placeholder: 'Ex: 1', type: 'number' },
              { label: 'Nome (opcional)', key: 'nome', placeholder: 'Ex: Mesa VIP', type: 'text' },
              { label: 'Capacidade', key: 'capacidade', placeholder: 'Ex: 4', type: 'number' }
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  value={(novaMesa as any)[f.key]}
                  onChange={e => setNovaMesa(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} type={f.type}
                  style={{ width: '100%', padding: '8px 12px', background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'Mulish', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <button onClick={criarMesa} style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#c9a227', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
              Criar Mesa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MesasPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' }}>Carregando...</div>}>
      <MesasContent />
    </Suspense>
  )
}
