'use client'

export const dynamic = 'force-dynamic'

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
    const { data: est } = await supabase.from('estabelecimentos').select('*').single()
    if (est) {
      setEstabelecimento(est)
      carregarPedidos(est.id)
      assinarRealtime(est.id)
    }
    setCarregando(false)
  }

  async function iniciar() {
    const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)
    carregarPedidos(est.id)
    assinarRealtime(est.id)
    setCarregando(false)
  }

  async function carregarPedidos(estId: string) {
    const { data } = await supabase.from('pedidos').select('*')
      .eq('estabelecimento_id', estId)
      .order('created_at', { ascending: false })
      .limit(100)
    setPedidos(data || [])
  }

  function assinarRealtime(estId: string) {
    supabase.channel('dashboard-' + estId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + estId },
        () => carregarPedidos(estId))
      .subscribe()
  }

  async function atualizarStatus(pedidoId: string, novoStatus: string) {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
  }

  const ativos = pedidos.filter(p => !['entregue', 'cancelado'].includes(p.status))
  const historico = pedidos.filter(p => ['entregue', 'cancelado'].includes(p.status))
  const emEntrega = pedidos.filter(p => p.status === 'pronto' && p.tipo_entrega === 'delivery')

  const resumo = {
    total: pedidos.filter(p => p.status === 'entregue').reduce((a, p) => a + (p.total || 0), 0),
    count: pedidos.filter(p => p.status === 'entregue').length,
    ativos: ativos.length,
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800">{estabelecimento?.nome || 'Dashboard'}</h1>
          <p className="text-xs text-gray-400">Painel de Controle</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Faturamento hoje</p>
            <p className="font-bold text-green-600">R$ {resumo.total.toFixed(2)}</p>
          </div>
          <button
            onClick={() => router.push('/cozinha?slug=' + slug)}
            className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            Cozinha
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/admin'))}
            className="text-gray-400 text-sm px-2 py-1 rounded hover:bg-gray-100"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600">{resumo.ativos}</p>
          <p className="text-xs text-gray-500">Ativos</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{emEntrega.length}</p>
          <p className="text-xs text-gray-500">Em entrega</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{resumo.count}</p>
          <p className="text-xs text-gray-500">Concluidos</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b bg-white mx-4 rounded-t-xl overflow-hidden shadow-sm">
        {(['producao', 'entrega', 'historico'] as const).map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            className={'flex-1 py-3 text-sm font-medium ' + (abaAtiva === aba ? 'border-b-2 border-amber-500 text-amber-600 bg-amber-50' : 'text-gray-500')}>
            {aba === 'producao' ? 'Producao (' + ativos.length + ')' :
             aba === 'entrega' ? 'Entrega (' + emEntrega.length + ')' :
             'Historico (' + historico.length + ')'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {abaAtiva === 'producao' && (
          <>
            {ativos.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">OK</p>
                <p>Nenhum pedido ativo</p>
              </div>
            )}
            {ativos.map(pedido => {
              const st = STATUS_LABELS[pedido.status] || STATUS_LABELS.pendente
              return (
                <div key={pedido.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: st.bg }}>
                    <div>
                      <span className="font-bold text-base" style={{ color: st.cor }}>#{pedido.numero}</span>
                      <span className="ml-2 text-sm font-medium text-gray-700">{pedido.cliente_nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ color: st.cor, backgroundColor: st.bg + '80' }}>{st.label}</span>
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
                    {pedido.observacoes && <p className="text-xs bg-yellow-50 text-yellow-700 rounded p-2 mb-3">{pedido.observacoes}</p>}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-700">R$ {pedido.total?.toFixed(2)}</span>
                      <div className="flex gap-2">
                        {pedido.status === 'pendente' && (
                          <>
                            <button onClick={() => atualizarStatus(pedido.id, 'cancelado')} className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600">Cancelar</button>
                            <button onClick={() => atualizarStatus(pedido.id, 'confirmado')} className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-white">Confirmar</button>
                          </>
                        )}
                        {pedido.status === 'confirmado' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'em_preparo')} className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white">Iniciar Preparo</button>
                        )}
                        {pedido.status === 'em_preparo' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'pronto')} className="px-3 py-1.5 rounded-lg text-sm bg-green-500 text-white">Marcar Pronto</button>
                        )}
                        {pedido.status === 'pronto' && pedido.tipo_entrega === 'retirada' && (
                          <button onClick={() => atualizarStatus(pedido.id, 'entregue')} className="px-3 py-1.5 rounded-lg text-sm bg-gray-500 text-white">Entregue</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {abaAtiva === 'entrega' && (
          <>
            {emEntrega.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">OK</p>
                <p>Nenhum pedido aguardando entrega</p>
              </div>
            )}
            {emEntrega.map(pedido => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-green-600">#{pedido.numero} - PRONTO</span>
                  <span className="text-xs text-gray-400">R$ {pedido.total?.toFixed(2)}</span>
                </div>
                <p className="text-sm font-medium">{pedido.cliente_nome}</p>
                <p className="text-xs text-gray-500 mb-1">{pedido.cliente_telefone}</p>
                <p className="text-xs text-gray-600 mb-3">{pedido.cliente_endereco}</p>
                <button onClick={() => atualizarStatus(pedido.id, 'entregue')}
                  className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
                  Confirmar Entrega
                </button>
              </div>
            ))}
          </>
        )}

        {abaAtiva === 'historico' && (
          <>
            {historico.slice(0, 20).map(pedido => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between opacity-75">
                <div>
                  <span className="font-medium text-gray-700">#{pedido.numero} - {pedido.cliente_nome}</span>
                  <p className="text-xs text-gray-400">{pedido.status === 'entregue' ? 'Entregue' : 'Cancelado'}</p>
                </div>
                <span className="font-bold text-gray-500">R$ {pedido.total?.toFixed(2)}</span>
              </div>
            ))}
            {historico.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>Nenhum pedido no historico</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
