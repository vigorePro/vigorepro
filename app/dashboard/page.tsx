'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TrendingUp, ShoppingBag, DollarSign, Clock, ChefHat, Truck } from 'lucide-react'

interface PedidoResumo {
  id: string
  numero: number
  status: string
  total: number
  tipo: string
  cliente_nome: string
  criado_em: string
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [pedidosHoje, setPedidosHoje] = useState<PedidoResumo[]>([])
  const [pedidosMes, setPedidosMes] = useState<number>(0)
  const [receitaHoje, setReceitaHoje] = useState<number>(0)
  const [receitaMes, setReceitaMes] = useState<number>(0)
  const [ticketMedio, setTicketMedio] = useState<number>(0)
  const [emPreparo, setEmPreparo] = useState<number>(0)
  const [emEntrega, setEmEntrega] = useState<number>(0)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [nomeEstab, setNomeEstab] = useState('')

  useEffect(() => {
    if (!slug) return
    const fetchEstab = async () => {
      const { data } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      if (data) { setEstabelecimentoId(data.id); setNomeEstab(data.nome || '') }
    }
    fetchEstab()
  }, [slug])

  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
  }, [estabelecimentoId])

  const fetchDados = async () => {
    setCarregando(true)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const inicioDia = hoje.toISOString()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .gte('criado_em', inicioDia)
      .order('criado_em', { ascending: false })

    if (pedidos) {
      setPedidosHoje(pedidos)
      const entregues = pedidos.filter(p => p.status === 'entregue')
      setReceitaHoje(entregues.reduce((acc, p) => acc + (p.total || 0), 0))
      setEmPreparo(pedidos.filter(p => p.status === 'em_preparo' || p.status === 'aguardando').length)
      setEmEntrega(pedidos.filter(p => p.status === 'pronto').length)
      setTicketMedio(entregues.length > 0 ? entregues.reduce((a, p) => a + (p.total || 0), 0) / entregues.length : 0)
    }

    const { data: mesPedidos } = await supabase
      .from('pedidos')
      .select('total, status')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('status', 'entregue')
      .gte('criado_em', inicioMes)

    if (mesPedidos) {
      setPedidosMes(mesPedidos.length)
      setReceitaMes(mesPedidos.reduce((acc, p) => acc + (p.total || 0), 0))
    }
    setCarregando(false)
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtHora = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const statusLabel: Record<string, string> = {
    aguardando: 'Aguardando', em_preparo: 'Em preparo', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado'
  }
  const statusColor: Record<string, string> = {
    aguardando: '#f59e0b', em_preparo: '#3b82f6', pronto: '#10b981', entregue: '#6b7280', cancelado: '#ef4444'
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{nomeEstab || 'Dashboard'}</h1>
        <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div>
        </div>
      ) : (
        <>
          {/* Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Receita hoje */}
            <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Receita Hoje</span>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#2a1208' }}>
                  <DollarSign size={16} style={{ color: '#eb0029' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{fmt(receitaHoje)}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{pedidosHoje.filter(p => p.status === 'entregue').length} pedidos finalizados</p>
            </div>

            {/* Ticket médio */}
            <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Ticket Médio</span>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#1a2a1a' }}>
                  <TrendingUp size={16} style={{ color: '#10b981' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{fmt(ticketMedio)}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>por pedido entregue</p>
            </div>

            {/* Em preparo */}
            <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Em Preparo</span>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#1a1e2a' }}>
                  <ChefHat size={16} style={{ color: '#3b82f6' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{emPreparo}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>pedidos na cozinha</p>
            </div>

            {/* Receita do mês */}
            <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Receita do Mês</span>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#2a1e10' }}>
                  <ShoppingBag size={16} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{fmt(receitaMes)}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{pedidosMes} pedidos finalizados</p>
            </div>
          </div>

          {/* Pedidos de hoje */}
          <div className="rounded-xl border" style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="font-semibold text-white">Pedidos de Hoje</h2>
              <span className="text-sm px-2 py-1 rounded-full" style={{ backgroundColor: '#2a2a2a', color: '#9ca3af' }}>
                {pedidosHoje.length} total
              </span>
            </div>

            {pedidosHoje.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag size={36} className="mx-auto mb-3" style={{ color: '#374151' }} />
                <p style={{ color: '#6b7280' }}>Nenhum pedido hoje ainda</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#2a2a2a' }}>
                {pedidosHoje.slice(0, 15).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: '#eb0029' }}>
                        #{p.numero}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.cliente_nome || 'Cliente'}</p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>
                          {fmtHora(p.criado_em)} · {p.tipo || 'delivery'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: statusColor[p.status] + '22', color: statusColor[p.status] }}>
                        {statusLabel[p.status] || p.status}
                      </span>
                      <span className="text-sm font-semibold text-white">{fmt(p.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#111111' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <DashboardContent />
    </Suspense>
  )
}
