'use client'

import { Suspense } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
    buscarPedidos()
    const canal = supabase
      .channel('cozinha-' + slug)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        buscarPedidos()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [slug])

  async function buscarPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('*, itens:pedido_itens(*)')
      .eq('restaurante_slug', slug)
      .in('status', ['em_producao', 'confirmado', 'em_preparo', 'pronto'])
      .order('criado_em', { ascending: true })
    if (data) {
      const novosCount = data.length
      if (pedidosAnterior.current >= 0 && novosCount > pedidosAnterior.current) {
        tocarBeep()
      }
      pedidosAnterior.current = novosCount
      setPedidos(data as Pedido[])
    }
  }

  function tocarBeep() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      const AudioCtx = w.AudioContext || w.webkitAudioContext
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      osc.connect(ctx.destination)
      osc.frequency.value = 880
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch {}
  }

  async function avancarStatus(pedido: Pedido) {
    if (!(pedido.status in STATUS_CONFIG)) return
    const config = STATUS_CONFIG[pedido.status as StatusKey]
    if (!config) return
    await supabase
      .from('pedidos')
      .update({ status: config.proximo })
      .eq('id', pedido.id)
    buscarPedidos()
  }

  function tempoDecorrido(criadoEm: string) {
    const diff = Math.floor((agora.getTime() - new Date(criadoEm).getTime()) / 1000)
    const min = Math.floor(diff / 60)
    const seg = diff % 60
    return min + ':' + String(seg).padStart(2, '0')
  }

  const colunas = [
    {
      key: 'novos',
      titulo: 'Novos / Aguardando',
      cor: '#EF4444',
      borda: 'border-red-600',
      bg: 'bg-red-950',
      itens: pedidos.filter(p => p.status === 'em_producao' || p.status === 'confirmado'),
    },
    {
      key: 'preparo',
      titulo: 'Em Preparo',
      cor: '#3B82F6',
      borda: 'border-blue-600',
      bg: 'bg-blue-950',
      itens: pedidos.filter(p => p.status === 'em_preparo'),
    },
    {
      key: 'prontos',
      titulo: 'Prontos',
      cor: '#10B981',
      borda: 'border-green-600',
      bg: 'bg-green-950',
      itens: pedidos.filter(p => p.status === 'pronto'),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={slug ? '/dashboard?slug=' + slug : '/dashboard'}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-white text-sm font-bold"
            title="Voltar ao Dashboard"
          >
            {'<'}
          </Link>
          <h1 className="text-xl font-bold">Cozinha</h1>
        </div>
        <div className="text-gray-400 text-sm">{agora.toLocaleTimeString('pt-BR')}</div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {colunas.map(coluna => (
          <div
            key={coluna.key}
            className={'rounded-xl border ' + coluna.borda + ' ' + coluna.bg + ' bg-opacity-20 p-3 flex flex-col'}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm" style={{ color: coluna.cor }}>{coluna.titulo}</h2>
              <span
                className="text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center text-white"
                style={{ backgroundColor: coluna.cor }}
              >
                {coluna.itens.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {coluna.itens.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-6">Nenhum pedido</div>
              ) : (
                coluna.itens.map(pedido => {
                  const config = pedido.status in STATUS_CONFIG ? STATUS_CONFIG[pedido.status as StatusKey] : null
                  return (
                    <div key={pedido.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{'#' + pedido.numero_pedido}</span>
                        <span className="text-xs text-gray-400">{tempoDecorrido(pedido.criado_em)}</span>
                      </div>
                      <div className="text-sm text-gray-300 mb-1">{pedido.cliente_nome}</div>
                      {pedido.tipo_entrega && (
                        <div className="text-xs text-gray-500 mb-2">{pedido.tipo_entrega}</div>
                      )}
                      <div className="text-xs text-gray-400 mb-2">
                        {pedido.itens.map((item, i) => (
                          <div key={i}>{item.quantidade + 'x ' + item.nome}</div>
                        ))}
                      </div>
                      {pedido.observacoes && (
                        <div className="text-xs text-yellow-400 mb-2 italic">{'Obs: ' + pedido.observacoes}</div>
                      )}
                      {config && pedido.status !== 'entregue' && (
                        <div className="mt-2">
                          <button
                            onClick={() => avancarStatus(pedido)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: config.cor }}
                          >
                            {config.btnLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
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
