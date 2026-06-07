'use client'

import { Suspense } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PedidoMotoboy = {
  id: string
  numero_pedido: number
  cliente_nome: string
  cliente_telefone: string
  endereco: string
  valor_total: number
  status: string
  tipo_entrega: string
  criado_em: string
  itens: Array<{ nome: string; quantidade: number; preco: number }>
}

type FilaItem = {
  id: string
  pedido_id: string
  entregador_id: string | null
  status: string
  criado_em: string
  pedidos: PedidoMotoboy
}

function MotoboyContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [pedidos, setPedidos] = useState<PedidoMotoboy[]>([])
  const [filaAtiva, setFilaAtiva] = useState<FilaItem[]>([])
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agora, setAgora] = useState(new Date())
  const pedidosAnterior = useRef<number>(-1)

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function tempoDecorrido(criado_em: string) {
    const diff = Math.floor((agora.getTime() - new Date(criado_em).getTime()) / 1000)
    const min = Math.floor(diff / 60)
    const seg = diff % 60
    return min + 'm' + seg.toString().padStart(2, '0') + 's'
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

  const carregarDados = useCallback(async () => {
    if (!slug) return
    const { data: estab } = await supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!estab) return
    setEstabelecimentoId(estab.id)
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estabelecimento_id', estab.id)
      .eq('tipo_entrega', 'delivery')
      .in('status', ['pronto'])
      .order('criado_em', { ascending: true })
    const novosPedidos = pedidosData || []
    if (pedidosAnterior.current >= 0 && novosPedidos.length > pedidosAnterior.current) {
      tocarBeep()
    }
    pedidosAnterior.current = novosPedidos.length
    setPedidos(novosPedidos)
    const { data: filaData } = await supabase
      .from('fila_entregadores')
      .select('*, pedidos(*)')
      .eq('estabelecimento_id', estab.id)
      .in('status', ['aceito', 'em_rota'])
      .order('criado_em', { ascending: true })
    setFilaAtiva(filaData || [])
    setLoading(false)
  }, [slug])

  useEffect(() => {
    carregarDados()
    const interval = setInterval(carregarDados, 15000)
    return () => clearInterval(interval)
  }, [carregarDados])

  useEffect(() => {
    const channel = supabase
      .channel('motoboy-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarDados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_entregadores' }, carregarDados)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carregarDados])

  async function atribuirEntregador(pedidoId: string) {
    if (!estabelecimentoId) return
    await supabase.from('fila_entregadores').insert({
      pedido_id: pedidoId,
      estabelecimento_id: estabelecimentoId,
      status: 'aceito',
      atribuido_em: new Date().toISOString(),
    })
    await supabase.from('pedidos').update({ status: 'em_rota' }).eq('id', pedidoId)
    carregarDados()
  }

  async function marcarEntregue(filaId: string, pedidoId: string) {
    await supabase
      .from('fila_entregadores')
      .update({ status: 'entregue', entregue_em: new Date().toISOString() })
      .eq('id', filaId)
    await supabase.from('pedidos').update({ status: 'entregue' }).eq('id', pedidoId)
    carregarDados()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Carregando painel motoboy...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">Painel Motoboy</h1>
            <p className="text-gray-400 text-sm">{slug} - {agora.toLocaleTimeString('pt-BR')}</p>
          </div>
          <button
            onClick={carregarDados}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Atualizar
          </button>
        </div>

        {filaAtiva.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-yellow-400 mb-3">Em Rota ({filaAtiva.length})</h2>
            <div className="space-y-3">
              {filaAtiva.map((item) => (
                <div key={item.id} className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-yellow-300">#{item.pedidos?.numero_pedido}</span>
                      <span className="ml-2 text-white font-medium">{item.pedidos?.cliente_nome}</span>
                    </div>
                    <span className="text-yellow-400 text-sm font-mono">{tempoDecorrido(item.criado_em)}</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">{item.pedidos?.endereco}</p>
                  <p className="text-green-400 font-bold mb-3">R$ {Number(item.pedidos?.valor_total || 0).toFixed(2)}</p>
                  <button
                    onClick={() => marcarEntregue(item.id, item.pedido_id)}
                    className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold text-sm"
                  >
                    Marcar como Entregue
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-orange-400 mb-3">Aguardando Coleta ({pedidos.length})</h2>
          {pedidos.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
              <p>Nenhum pedido aguardando entrega</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-orange-300">#{pedido.numero_pedido}</span>
                      <span className="ml-2 text-white font-medium">{pedido.cliente_nome}</span>
                    </div>
                    <span className="text-gray-400 text-sm font-mono">{tempoDecorrido(pedido.criado_em)}</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">{pedido.cliente_telefone}</p>
                  <p className="text-gray-300 text-sm mb-2">{pedido.endereco}</p>
                  <div className="mb-3">
                    {Array.isArray(pedido.itens) && pedido.itens.map((item, i) => (
                      <span key={i} className="text-gray-400 text-xs block">{item.quantidade}x {item.nome}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">R$ {Number(pedido.valor_total || 0).toFixed(2)}</span>
                    <button
                      onClick={() => atribuirEntregador(pedido.id)}
                      className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-bold text-sm"
                    >
                      Aceitar Entrega
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MotoboyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white animate-pulse">Carregando...</div></div>}>
      <MotoboyContent />
    </Suspense>
  )
}
