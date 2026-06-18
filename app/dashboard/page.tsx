'use client'

import { Suspense } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Pedido, Estabelecimento } from '@/lib/supabase'

const STATUS_LABELS: Record<string, { label: string; cor: string; bg: string }> = {
  em_producao: { label: 'Em Producao', cor: '#F59E0B', bg: '#FFFBEB' },
  confirmado: { label: 'Confirmado', cor: '#F59E0B', bg: '#FFFBEB' },
  em_preparo: { label: 'Em Preparo', cor: '#3B82F6', bg: '#EFF6FF' },
  pronto: { label: 'Pronto', cor: '#10B981', bg: '#F0FDF4' },
  entregue: { label: 'Entregue', cor: '#6B7280', bg: '#F9FAFB' },
  cancelado: { label: 'Cancelado', cor: '#EF4444', bg: '#FEF2F2' },
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug')
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const pedidosAnterior = useRef<number>(-1)
  const [abaAtiva, setAbaAtiva] = useState<'producao' | 'entrega' | 'historico'>('producao')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (slug) iniciar()
    else verificarAuth()
  }, [slug])

  async function verificarAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin'); return }
    const { data: est } = await supabase.from('estabelecimentos').select('*').single()
    if (est) {
      setEstabelecimento(est)
      carregarPedidos(est.id)
      assinarRealtime(est.id)
    }
    setCarregando(false)
  }

  async function iniciar() {
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()
    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)
    carregarPedidos(est.id)
    assinarRealtime(est.id)
    setCarregando(false)
  }

  function tocarBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  async function carregarPedidos(estId: string) {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('criado_em', { ascending: false })
      .limit(100)
    const novos = (data || []) as Pedido[]
    const ativos = novos.filter(p => !['entregue', 'cancelado'].includes(p.status))
    if (pedidosAnterior.current >= 0 && ativos.length > pedidosAnterior.current) {
      tocarBeep()
    }
    pedidosAnterior.current = ativos.length
    setPedidos(novos)
  }

  function assinarRealtime(estId: string) {
    supabase.channel('dashboard-' + estId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pedidos',
        filter: 'estabelecimento_id=eq.' + estId
      }, () => carregarPedidos(estId))
      .subscribe()
  }

  async function atualizarStatus(pedidoId: string, novoStatus: string) {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
    if (estabelecimento?.id) await carregarPedidos(estabelecimento.id)
  }

  const ativos = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
  const historico = pedidos.filter(p => ['entregue', 'cancelado'].includes(p.status))
  const emEntrega = pedidos.filter(p => p.status === 'pronto' && p.tipo_entrega === 'delivery')
  const resumo = {
    total: pedidos.filter(p => p.status === 'entregue').reduce((s, p) => s + p.valor_total, 0),
    count: pedidos.filter(p => p.status === 'entregue').length,
    ativos: ativos.length,
  }

  if (carregando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-gray-500">Carregando...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <div className="text-lg font-bold text-gray-800">{estabelecimento?.nome || 'Dashboard'}</div>
          <div className="text-xs text-gray-400">Painel de Controle</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-400">Faturamento hoje</div>
            <div className="font-bold text-green-600">R$ {resumo.total.toFixed(2)}</div>
          </div>
          <button onClick={() => router.push('/cozinha?slug=' + slug)}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm">Cozinha</button>
          <button onClick={() => router.push('/admin/delivery?slug=' + (slug || estabelecimento?.slug))}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Delivery</button>
          <button onClick={() => router.push('/dashboard/cardapio?slug=' + (slug || estabelecimento?.slug))}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Cardápio</button>
          <button onClick={() => router.push('/dashboard/pdv?slug=' + (slug || estabelecimento?.slug))}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">PDV</button>
          <button onClick={() => router.push('/dashboard/produtos')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Produtos</button>
          <button onClick={() => router.push('/dashboard/categorias?slug=' + (slug || estabelecimento?.slug))}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Banners</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/admin'))}
            className="text-gray-400 text-sm px-2 py-1 rounded hover:bg-gray-100">Sair</button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-amber-600">{resumo.ativos}</div>
          <div className="text-xs text-gray-500">Ativos</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{emEntrega.length}</div>
          <div className="text-xs text-gray-500">Em entrega</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">{resumo.count}</div>
          <div className="text-xs text-gray-500">Concluidos</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b bg-white mx-4 rounded-t-xl overflow-hidden shadow-sm">
        {(['producao', 'entrega', 'historico'] as const).map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            className={'flex-1 py-3 text-sm font-medium ' + (abaAtiva === aba ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50' : 'text-gray-500')}>
            {aba === 'producao' ? `Producao (${ativos.length})` : aba === 'entrega' ? `Entrega (${emEntrega.length})` : `Historico (${historico.length})`}
          </button>
        ))}
      </div>

      {/* Conteudo */}
      <div className="p-4 space-y-3">
        {/* ABA PRODUCAO */}
        {abaAtiva === 'producao' && (
          ativos.length === 0
            ? <div className="text-center py-12 text-gray-400">Nenhum pedido ativo</div>
            : ativos.map(pedido => {
              const info = STATUS_LABELS[pedido.status] || STATUS_LABELS.em_producao
              return (
                <div key={pedido.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: info.bg }}>
                    <div>
                      <span className="font-bold text-base" style={{ color: info.cor }}>#{pedido.numero_pedido}</span>
                      <span className="ml-2 text-sm font-medium text-gray-700">{pedido.cliente_nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: info.cor }}>{info.label}</span>
                      <span className="text-xs text-gray-400">{pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retirada'}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="space-y-1 mb-3">
                      {(pedido.itens as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span className="text-gray-500">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {pedido.observacoes && (
                      <div className="text-xs bg-yellow-50 text-yellow-700 rounded p-2 mb-3">{pedido.observacoes}</div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-700">R$ {pedido.valor_total.toFixed(2)}</span>
                      <div className="flex gap-2">
                        {pedido.status === 'em_producao' && (
                          <>
                            <button onClick={() => atualizarStatus(pedido.id, 'cancelado')}
                              className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600">Cancelar</button>
                            <button onClick={() => atualizarStatus(pedido.id, 'em_preparo')}
                              className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white">Iniciar Preparo</button>
                          </>
                        )}
                        {pedido.status === 'confirmado' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'em_preparo')}
                            className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white">Iniciar Preparo</button>
                        )}
                        {pedido.status === 'em_preparo' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'pronto')}
                            className="px-3 py-1.5 rounded-lg text-sm bg-green-500 text-white">Marcar Pronto</button>
                        )}
                        {pedido.status === 'pronto' && pedido.tipo_entrega === 'retirada' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'entregue')}
                            className="px-3 py-1.5 rounded-lg text-sm bg-gray-500 text-white">Entregue</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
        )}

        {/* ABA ENTREGA */}
        {abaAtiva === 'entrega' && (
          emEntrega.length === 0
            ? <div className="text-center py-12 text-gray-400">Nenhum pedido aguardando entrega</div>
            : emEntrega.map(pedido => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-600">#{pedido.numero_pedido} - PRONTO</span>
                  <span className="text-xs text-gray-400">R$ {pedido.valor_total.toFixed(2)}</span>
                </div>
                <div className="text-sm font-medium">{pedido.cliente_nome}</div>
                <div className="text-xs text-gray-500 mb-1">{pedido.cliente_telefone}</div>
                <div className="text-xs text-gray-600 mb-3">{pedido.endereco}</div>
                <button onClick={() => atualizarStatus(pedido.id, 'entregue')}
                  className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium">Confirmar Entrega</button>
              </div>
            ))
        )}

        {/* ABA HISTORICO */}
        {abaAtiva === 'historico' && (
          historico.length === 0
            ? <div className="text-center py-12 text-gray-400">Nenhum pedido no historico</div>
            : historico.slice(0, 50).map(pedido => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between opacity-75">
                <div>
                  <span className="font-medium text-gray-700">#{pedido.numero_pedido} - {pedido.cliente_nome}</span>
                  <div className="text-xs text-gray-400">{pedido.status === 'entregue' ? 'Entregue' : 'Cancelado'}</div>
                </div>
                <span className="font-bold text-gray-500">R$ {pedido.valor_total.toFixed(2)}</span>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
