'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Pedido } from '@/lib/supabase'

const STATUS_CONFIG = {
  pendente: { label: 'Novo', cor: '#EF4444', emoji: '🔔', proximo: 'confirmado', btnLabel: 'Confirmar' },
  confirmado: { label: 'Confirmado', cor: '#F59E0B', emoji: '✅', proximo: 'em_preparo', btnLabel: 'Iniciar Preparo' },
  em_preparo: { label: 'Em Preparo', cor: '#3B82F6', emoji: '👨‍🍳', proximo: 'pronto', btnLabel: 'Marcar Pronto' },
  pronto: { label: 'Pronto', cor: '#10B981', emoji: '🎉', proximo: 'entregue', btnLabel: 'Entregue' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

export default function Cozinha() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (slug) iniciar()
  }, [slug])

  async function iniciar() {
    const { data: est } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (!est) return
    carregarPedidos(est.id)
    supabase.channel('cozinha-' + est.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: 'estabelecimento_id=eq.' + est.id }, () => carregarPedidos(est.id))
      .subscribe()
  }

  async function carregarPedidos(estId: string) {
    const { data } = await supabase.from('pedidos').select('*')
      .eq('estabelecimento_id', estId)
      .in('status', ['pendente', 'confirmado', 'em_preparo', 'pronto'])
      .order('created_at', { ascending: true })
    setPedidos(data || [])
  }

  async function avancar(pedido: Pedido) {
    const config = STATUS_CONFIG[pedido.status as StatusKey]
    if (!config) return
    await supabase.from('pedidos').update({ status: config.proximo }).eq('id', pedido.id)
  }

  function tempo(created_at: string) {
    const diff = Math.floor((agora.getTime() - new Date(created_at).getTime()) / 1000)
    if (diff < 60) return diff + 's'
    return Math.floor(diff / 60) + 'min'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">🍳 Cozinha — {agora.toLocaleTimeString('pt-BR')}</h1>
        <span className="px-3 py-1 rounded-full text-sm bg-red-500">{pedidos.filter(p => p.status !== 'pronto').length} ativos</span>
      </div>

      <div className="flex gap-2 p-2 overflow-x-auto" style={{ height: 'calc(100vh - 56px)' }}>
        {(Object.keys(STATUS_CONFIG) as StatusKey[]).map(status => {
          const config = STATUS_CONFIG[status]
          const lista = pedidos.filter(p => p.status === status)
          return (
            <div key={status} className="flex-shrink-0 w-72 flex flex-col">
              <div className="px-3 py-2 flex items-center justify-between mb-1" style={{ borderBottom: '2px solid ' + config.cor }}>
                <span className="font-bold text-sm">{config.emoji} {config.label}</span>
                <span className="text-sm font-bold" style={{ color: config.cor }}>{lista.length}</span>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-4">
                {lista.map(pedido => (
                  <div key={pedido.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg" style={{ color: config.cor }}>#{pedido.numero}</span>
                      <span className="text-gray-400 text-xs">{tempo(pedido.created_at)}</span>
                    </div>
                    <p className="text-sm font-medium">{pedido.cliente_nome}</p>
                    <p className="text-gray-400 text-xs mb-2">{pedido.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}</p>
                    <div className="space-y-1 mb-3 border-t border-gray-700 pt-2">
                      {(pedido.itens as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="font-bold text-yellow-400">{item.quantidade}x</span>
                          <span className="text-gray-200">{item.nome}</span>
                        </div>
                      ))}
                    </div>
                    {pedido.observacoes && <p className="text-xs text-yellow-300 bg-yellow-900/20 rounded p-2 mb-2">💬 {pedido.observacoes}</p>}
                    <button onClick={() => avancar(pedido)}
                      className="w-full py-2 rounded-lg text-white text-sm font-bold"
                      style={{ backgroundColor: config.cor }}>
                      {config.btnLabel} →
                    </button>
                  </div>
                ))}
                {lista.length === 0 && <p className="text-center py-4 text-gray-600 text-sm">Vazio</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
