'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Search, RefreshCw, LayoutGrid, List, Truck, CheckCircle, Clock, Users, X } from 'lucide-react'

interface Mesa {
  id: string
  numero: number
  nome: string
  status: 'livre' | 'ocupada' | 'conta'
  capacidade: number
  estabelecimento_id: string
}

function MesasContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [estabId, setEstabId] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'comandas'|'mesas'>('mesas')
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null)
  const [busca, setBusca] = useState('')
  const [modalNova, setModalNova] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaCapacidade, setNovaCapacidade] = useState('4')
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabId(data.id) })
  }, [slug])

  useEffect(() => {
    if (!estabId) return
    fetchMesas()
  }, [estabId])

  const fetchMesas = async () => {
    if (!estabId) return
    const { data } = await supabase.from('mesas').select('*')
      .eq('estabelecimento_id', estabId).order('numero')
    if (data) setMesas(data)
  }

  const mesasFiltradas = mesas.filter(m =>
    !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || m.numero.toString().includes(busca)
  )

  const contadores = {
    livre: mesas.filter(m => m.status === 'livre').length,
    ocupada: mesas.filter(m => m.status === 'ocupada').length,
    conta: mesas.filter(m => m.status === 'conta').length,
  }

  const criarMesa = async () => {
    if (!estabId || !novoNome) return
    setCriando(true)
    const numero = mesas.length + 1
    await supabase.from('mesas').insert({
      estabelecimento_id: estabId,
      numero,
      nome: novoNome,
      status: 'livre',
      capacidade: parseInt(novaCapacidade) || 4,
    })
    setModalNova(false)
    setNovoNome('')
    setNovaCapacidade('4')
    setCriando(false)
    fetchMesas()
  }

  const mudarStatus = async (mesa: Mesa, novoStatus: Mesa['status']) => {
    await supabase.from('mesas').update({ status: novoStatus }).eq('id', mesa.id)
    fetchMesas()
    if (mesaSelecionada?.id === mesa.id) setMesaSelecionada({ ...mesaSelecionada, status: novoStatus })
  }

  const statusConfig = {
    livre:   { cor: '#4ade80', bg: '#0f2018', label: 'Livre',   dot: '#4ade80' },
    ocupada: { cor: '#facc15', bg: '#1e1a0f', label: 'Ocupada', dot: '#facc15' },
    conta:   { cor: '#f87171', bg: '#1e0f0f', label: 'Conta',   dot: '#f87171' },
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#111111' }}>
      {/* Área principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header da página */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#2a2a2a' }}>
          <button onClick={() => setModalNova(true)}
            className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#eb0029' }}>
            <Plus size={15} /> Novo Pedido (F1)
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <Search size={14} style={{ color: '#6b7280' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..." className="bg-transparent outline-none text-sm placeholder-gray-500" style={{ color: '#e5e7eb', width: 140 }} />
          </div>
          <button onClick={fetchMesas} className="p-2 rounded-lg border" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}>
            <RefreshCw size={15} style={{ color: '#9ca3af' }} />
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af' }}>
            <Truck size={14} /> Abrir Delivery
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* Contadores */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
              style={{ borderColor: '#4ade80', color: '#4ade80', backgroundColor: '#0f2018' }}>
              <CheckCircle size={12} /> Livre <span className="font-bold">{contadores.livre}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
              style={{ borderColor: '#facc15', color: '#facc15', backgroundColor: '#1e1a0f' }}>
              <Clock size={12} /> Ocupado <span className="font-bold">{contadores.ocupada}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
              style={{ borderColor: '#f87171', color: '#f87171', backgroundColor: '#1e0f0f' }}>
              Fechado <span className="font-bold">{contadores.conta}</span>
            </div>
          </div>
        </div>

        {/* Abas Comandas / Mesas */}
        <div className="flex items-center border-b px-4 flex-shrink-0" style={{ borderColor: '#2a2a2a' }}>
          {(['mesas', 'comandas'] as const).map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize"
              style={{
                borderColor: abaAtiva === aba ? '#eb0029' : 'transparent',
                color: abaAtiva === aba ? '#ffffff' : '#6b7280'
              }}>
              {aba === 'mesas' ? <LayoutGrid size={14} /> : <List size={14} />}
              {aba === 'mesas' ? 'Mesas' : 'Comandas'}
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: abaAtiva === aba ? '#eb0029' : '#2a2a2a', color: abaAtiva === aba ? '#fff' : '#6b7280' }}>
                {mesas.length}
              </span>
            </button>
          ))}
        </div>

        {/* Grid de mesas */}
        <div className="flex-1 overflow-y-auto p-4">
          {mesasFiltradas.length === 0 ? (
            <div className="text-center py-16">
              <LayoutGrid size={40} className="mx-auto mb-3" style={{ color: '#374151' }} />
              <p style={{ color: '#6b7280' }} className="mb-3">Nenhuma mesa criada ainda</p>
              <button onClick={() => setModalNova(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#eb0029' }}>
                Criar primeira mesa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mesasFiltradas.map(mesa => {
                const cfg = statusConfig[mesa.status]
                const ativa = mesaSelecionada?.id === mesa.id
                return (
                  <button key={mesa.id}
                    onClick={() => setMesaSelecionada(ativa ? null : mesa)}
                    className="text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: ativa ? cfg.bg + 'cc' : cfg.bg,
                      borderColor: ativa ? cfg.cor : cfg.cor + '55'
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium flex items-center gap-1" style={{ color: cfg.cor }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.cor }}></span>
                        {cfg.label}
                      </span>
                      <span className="text-lg font-bold" style={{ color: cfg.cor }}>{mesa.numero}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{mesa.nome}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users size={11} style={{ color: '#6b7280' }} />
                      <span className="text-xs" style={{ color: '#6b7280' }}>{mesa.capacidade} pax</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral — detalhes da mesa */}
      {mesaSelecionada ? (
        <div className="w-80 flex-shrink-0 border-l flex flex-col" style={{ borderColor: '#2a2a2a', backgroundColor: '#161616' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2a2a' }}>
            <div>
              <p className="text-sm font-bold text-white">{mesaSelecionada.nome}</p>
              <p className="text-xs mt-0.5" style={{ color: statusConfig[mesaSelecionada.status].cor }}>
                {statusConfig[mesaSelecionada.status].label} · {mesaSelecionada.capacidade} pax
              </p>
            </div>
            <button onClick={() => setMesaSelecionada(null)} style={{ color: '#4b5563' }}><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Alterar status</p>
            {(['livre', 'ocupada', 'conta'] as const).map(st => (
              <button key={st} onClick={() => mudarStatus(mesaSelecionada, st)}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all capitalize"
                style={{
                  backgroundColor: mesaSelecionada.status === st ? statusConfig[st].cor : statusConfig[st].bg,
                  color: mesaSelecionada.status === st ? '#000' : statusConfig[st].cor,
                  border: '1px solid ' + statusConfig[st].cor + '55'
                }}>
                {statusConfig[st].label}
              </button>
            ))}
          </div>
          <div className="p-4 border-t mt-auto" style={{ borderColor: '#2a2a2a' }}>
            <p className="text-center text-sm" style={{ color: '#4b5563' }}>
              Selecione uma mesa ou comanda para ver os detalhes da venda
            </p>
          </div>
        </div>
      ) : (
        <div className="w-64 flex-shrink-0 border-l flex flex-col items-center justify-center" style={{ borderColor: '#2a2a2a', backgroundColor: '#161616' }}>
          <LayoutGrid size={36} className="mb-3" style={{ color: '#2a2a2a' }} />
          <p className="text-sm text-center" style={{ color: '#4b5563' }}>
            Selecione uma mesa ou comanda para ver os detalhes da venda
          </p>
        </div>
      )}

      {/* Modal nova mesa */}
      {modalNova && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-96" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-lg font-bold text-white mb-4">Nova Mesa</h2>
            <div className="space-y-3">
              <input placeholder="Nome da Mesa *" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ backgroundColor: '#111111', border: '1px solid #374151' }} />
              <input type="number" placeholder="Capacidade (pessoas)" value={novaCapacidade} onChange={e => setNovaCapacidade(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                style={{ backgroundColor: '#111111', border: '1px solid #374151' }} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalNova(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#111111', color: '#9ca3af', border: '1px solid #374151' }}>Cancelar</button>
              <button onClick={criarMesa} disabled={!novoNome || criando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#eb0029' }}>
                {criando ? 'Criando...' : 'Criar Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MesasPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#111111' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <MesasContent />
    </Suspense>
  )
}
