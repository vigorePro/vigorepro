'use client'

import { Suspense } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Pedido } from '@/lib/supabase'

const STATUS_CONFIG = {
  em_producao: { label: 'Novo', cor: '#EF4444', proximo: 'em_preparo', btnLabel: 'Iniciar Preparo' },
  confirmado: { label: 'Confirmado', cor: '#F59E0B', proximo: 'em_preparo', btnLabel: 'Iniciar Preparo' },
  em_preparo: { label: 'Em Preparo', cor: '#3B82F6', proximo: 'pronto', btnLabel: 'Marcar Pronto' },
  pronto: { label: 'Pronto', cor: '#10B981', proximo: 'entregue', btnLabel: 'Entregue' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

function CozinhaContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [agora, setAgora] = useState(new Date())
  const pedidosAnterior = useRef<number>(-1)

  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!slug) return
    carregarPedidos()
    const canal = supabase.channel('cozinha-' + slug)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarPedidos)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [slug])

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

  async function carregarPedidos() {
    const { data: est } = await supabase
      .from('estabelecimentos').select('id').eq('slug', slug).single()
    if (!est) return
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', est.id)
      .not('status', 'in', '(entregue,cancelado)')
      .order('criado_em', { ascending: true })
    const novos = (data || []) as Pedido[]
    if (pedidosAnterior.current >= 0 && novos.length > pedidosAnterior.current) {
      tocarBeep()
    }
    pedidosAnterior.current = novos.length
    setPedidos(novos)
  }

  async function avancarStatus(pedido: Pedido) {
    const config = STATUS_CONFIG[pedido.status as StatusKey]
    if (!config) return
    await supabase.from('pedidos').update({ status: config.proximo }).eq('id', pedido.id)
    await carregarPedidos()
  }

  function tempoDecorrido(criado_em: string) {
    const diff = Math.floor((agora.getTime() - new Date(criado_em).getTime()) / 1000)
    const min = Math.floor(diff / 60)
    const seg = diff % 60
    return `${min}:${String(seg).padStart(2, '0')}`
  }

  const colunas = [
    {
      key: 'novos',
      titulo: 'Novos / Aguardando',
      cor: 'text-red-400',
      borda: 'border-red-500/30',
      bg: 'bg-red-950/20',
      itens: pedidos.filter(p => ['em_producao', 'confirmado'].includes(p.status)),
    },
    {
      key: 'preparo',
      titulo: 'Em Preparo',
      cor: 'text-blue-400',
      borda: 'border-blue-500/30',
      bg: 'bg-blue-950/20',
      itens: pedidos.filter(p => p.status === 'em_preparo'),
    },
    {
      key: 'prontos',
      titulo: 'Prontos',
      cor: 'text-green-400',
      borda: 'border-green-500/30',
      bg: 'bg-green-950/20',
      itens: pedidos.filter(p => p.status === 'pronto'),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold"> Cozinha</h1>
        <div className="text-gray-400 text-sm">{agora.toLocaleTimeString('pt-BR')}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {colunas.map(coluna => (
          <div key={coluna.key} className={['rounded-xl border', coluna.borda, coluna.bg, 'p-3'].join(' ')}>
            <h2 className={coluna.cor + ' font-bold mb-3 text-sm flex items-center justify-between'}>
              <span>{coluna.titulo}</span>
              <span className="bg-gray-700 text-white text-xs rounded-full px-2 py-0.5">{coluna.itens.length}</span>
            </h2>

            {coluna.itens.length === 0 && (
              <div className="text-gray-600 text-center text-sm py-8">Nenhum pedido</div>
            )}

            <div className="space-y-3">
              {coluna.itens.map(pedido => {
                const config = STATUS_CONFIG[pedido.status as StatusKey]
                return (
                  <div key={pedido.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: (config?.cor || '#444') + '22' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: config?.cor }}>{'#' + pedido.numero_pedido}</span>
                        <span className="text-white text-sm">{pedido.cliente_nome}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs" style={{ color: config?.cor }}>{config?.label}</div>
                        <div className="text-xs text-gray-400">{tempoDecorrido(pedido.criado_em)}</div>
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <div className="space-y-1 mb-2">
                        {(pedido.items as {quantidade: number, nome: string}[]).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-white">{item.quantidade}x {item.nome}</span>
                          </div>
                        ))}
                      </div>
                      {pedido.observacoes && (
                        <div className="text-xs bg-yellow-900 text-yellow-300 rounded p-2 mb-2">{pedido.observacoes}</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {pedido.tipo_entrega === 'delivery' ? ' Delivery' : ' Retirada'}
                        </span>
                        {config && (
                          <button
                            onClick={() => avancarStatus(pedido)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: config.cor }}
                          >
                            {config.btnLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Cozinha() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Carregando...</div>}>
      <CozinhaContent />
    </Suspense>
  )
}
