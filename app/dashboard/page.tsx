'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Pedido, Estabelecimento } from '@/lib/supabase'

const STATUS_LABELS: Record<string, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Novo', cor: '#EF4444', bg: '#FEF2F2' },
  confirmado: { label: 'Confirmado', cor: '#F59E0B', bg: '#FFFBEB' },
  em_preparo: { label: 'Em Preparo', cor: '#3B82F6', bg: '#EFF6FF' },
  pronto: { label: 'Pronto', cor: '#10B981', bg: '#F0FDF4' },
  entregue: { label: 'Entregue', cor: '#6B7280', bg: '#F9FAFB' },
  cancelado: { label: 'Cancelado', cor: '#EF4444', bg: '#FEF2F2' },
}

export default function Dashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'producao' | 'entrega' | 'historico'>('producao')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (slug) iniciar()
    else verificarAuth()
  }, [slug])

  async function verificarAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin'); return }
    // load establishment from user metadata or first establishment
  }

  async function iniciar() {
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()

    if (est) {
      setEstabelecimento(est)
      await carregarPedidos(est.id)

      // Realtime
      supabase
        .channel('dashboard-' + est.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + est.id }, () => {
          carregarPedidos(est.id)
        })
        .subscribe()
    }
    setCarregando(false)
  }

  async function carregarPedidos(estId: string) {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('created_at', { ascending: false })
      .limit(100)

    setPedidos(data || [])
  }

  async function atualizarStatus(pedidoId: string, novoStatus: string) {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
  }

  // Métricas
  const hoje = new Date().toDateString()
  const pedidosHoje = pedidos.filter(p => new Date(p.created_at).toDateString() === hoje)
  const pedidosAtivos = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
  const faturamentoHoje = pedidosHoje.filter(p => p.status !== 'cancelado').reduce((acc, p) => acc + p.total, 0)

  // Linha de produção (cozinha)
  const pedidosProducao = pedidosAtivos.filter(p => ['pendente', 'confirmado', 'em_preparo', 'pronto'].includes(p.status))

  // Linha de entrega
  const pedidosEntrega = pedidosAtivos.filter(p => ['pronto', 'entregue'].includes(p.status) && p.tipo_entrega === 'delivery')

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EDE0' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: '#C8956C', borderTopColor: 'transparent' }}></div>
        <p style={{ color: '#7B3F1E' }}>Carregando dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EDE0' }}>
      {/* Header */}
      <div className="shadow-md py-4 px-4" style={{ backgroundColor: '#7B3F1E' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">{estabelecimento?.nome || 'Dashboard'}</h1>
            <p className="text-orange-200 text-sm">Painel Administrativo</p>
          </div>
          <div className="flex gap-2">
            <a href={'/cozinha?slug=' + slug} target="_blank" className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-white/20 hover:bg-white/30">
              🍳 Cozinha
            </a>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/admin'))}
              className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-white/10 hover:bg-white/20">
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pedidos Hoje', valor: pedidosHoje.length, emoji: '📋' },
            { label: 'Pedidos Ativos', valor: pedidosAtivos.length, emoji: '⚡' },
            { label: 'Faturamento Hoje', valor: 'R$ ' + faturamentoHoje.toFixed(2).replace('.', ','), emoji: '💰' },
            { label: 'Em Entrega', valor: pedidosEntrega.length, emoji: '🛵' },
          ].map((metrica, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">{metrica.emoji}</div>
              <div className="text-2xl font-bold" style={{ color: '#7B3F1E' }}>{metrica.valor}</div>
              <div className="text-gray-500 text-xs">{metrica.label}</div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'producao', label: '👨‍🍳 Linha de Produção' },
            { key: 'entrega', label: '🛵 Linha de Entrega' },
            { key: 'historico', label: '📋 Histórico' },
          ] as const).map(aba => (
            <button
              key={aba.key}
              onClick={() => setAbaAtiva(aba.key)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: abaAtiva === aba.key ? '#7B3F1E' : 'white',
                color: abaAtiva === aba.key ? 'white' : '#7B3F1E',
              }}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* Linha de Produção */}
        {abaAtiva === 'producao' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['pendente', 'confirmado', 'em_preparo', 'pronto'] as const).map(status => {
              const config = STATUS_LABELS[status]
              const listaPedidos = pedidosProducao.filter(p => p.status === status)
              const proximoStatus: Record<string, string> = {
                pendente: 'confirmado', confirmado: 'em_preparo', em_preparo: 'pronto', pronto: 'entregue'
              }

              return (
                <div key={status} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: config.bg, borderBottom: '2px solid ' + config.cor }}>
                    <span className="font-bold text-sm" style={{ color: config.cor }}>{config.label}</span>
                    <span className="text-sm font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: config.cor + '20', color: config.cor }}>{listaPedidos.length}</span>
                  </div>
                  <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                    {listaPedidos.map(pedido => (
                      <div key={pedido.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold" style={{ color: config.cor }}>#{pedido.numero}</span>
                          <span className="text-xs text-gray-400">{new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">{pedido.cliente_nome}</p>
                        <p className="text-xs text-gray-500 mb-2">{pedido.tipo_entrega === 'delivery' ? '🛵' : '🏪'} {pedido.tipo_entrega}</p>
                        <div className="space-y-0.5 mb-2">
                          {(pedido.itens as any[]).map((item: any, i: number) => (
                            <p key={i} className="text-xs text-gray-600"><span className="font-bold">{item.quantidade}x</span> {item.nome}</p>
                          ))}
                        </div>
                        {pedido.observacoes && <p className="text-xs text-yellow-700 bg-yellow-50 rounded p-1 mb-2">💬 {pedido.observacoes}</p>}
                        <div className="flex gap-1">
                          <button onClick={() => atualizarStatus(pedido.id, proximoStatus[status])}
                            className="flex-1 py-1.5 rounded-lg text-white text-xs font-medium"
                            style={{ backgroundColor: config.cor }}>
                            {status === 'pendente' ? 'Confirmar' : status === 'confirmado' ? 'Preparar' : status === 'em_preparo' ? 'Pronto' : 'Entregue'}
                          </button>
                          {status === 'pendente' && (
                            <button onClick={() => atualizarStatus(pedido.id, 'cancelado')}
                              className="px-2 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium">
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {listaPedidos.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum pedido</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Linha de Entrega */}
        {abaAtiva === 'entrega' && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-lg mb-4" style={{ color: '#7B3F1E' }}>🛵 Pedidos para Entrega</h2>
            {pedidosEntrega.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum pedido aguardando entrega</p>
            ) : (
              <div className="space-y-3">
                {pedidosEntrega.map(pedido => (
                  <div key={pedido.id} className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg" style={{ color: '#7B3F1E' }}>#{pedido.numero}</span>
                        <span className="text-sm px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: STATUS_LABELS[pedido.status].bg, color: STATUS_LABELS[pedido.status].cor }}>{STATUS_LABELS[pedido.status].label}</span>
                      </div>
                      <p className="font-medium">{pedido.cliente_nome}</p>
                      <p className="text-gray-500 text-sm">{pedido.cliente_telefone}</p>
                      <p className="text-gray-600 text-sm mt-1">📍 {pedido.cliente_endereco}</p>
                      <p className="font-bold mt-2" style={{ color: '#7B3F1E' }}>R$ {pedido.total.toFixed(2).replace('.', ',')} - Pagar na entrega</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a href={'https://wa.me/55' + pedido.cliente_telefone.replace(/D/g, '')} target="_blank"
                        className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-green-500 text-center">
                        WhatsApp
                      </a>
                      <button onClick={() => atualizarStatus(pedido.id, 'entregue')}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                        style={{ backgroundColor: '#10B981' }}>
                        Entregue ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Histórico */}
        {abaAtiva === 'historico' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="text-left" style={{ backgroundColor: '#F5EDE0' }}>
                <tr>
                  {['#', 'Cliente', 'Status', 'Total', 'Tipo', 'Horário'].map(h => (
                    <th key={h} className="px-4 py-3 text-sm font-medium" style={{ color: '#7B3F1E' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.slice(0, 50).map(pedido => (
                  <tr key={pedido.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold" style={{ color: '#7B3F1E' }}>#{pedido.numero}</td>
                    <td className="px-4 py-3 text-sm">{pedido.cliente_nome}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_LABELS[pedido.status]?.bg, color: STATUS_LABELS[pedido.status]?.cor }}>
                        {STATUS_LABELS[pedido.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">R$ {pedido.total.toFixed(2).replace('.', ',')}</td>
                    <td className="px-4 py-3 text-sm">{pedido.tipo_entrega === 'delivery' ? '🛵' : '🏪'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(pedido.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pedidos.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum pedido ainda</p>}
          </div>
        )}
      </div>
    </div>
  )
}
