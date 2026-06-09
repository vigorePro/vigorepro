'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Estabelecimento } from '@/lib/supabase'

type Item = { id: string; nome: string; preco: number; quantidade: number }

function PedidoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''
  const carrinhoParam = searchParams.get('carrinho') || '[]'

  const [est, setEst] = useState<Estabelecimento | null>(null)
  const [itens, setItens] = useState<Item[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retirada'>('delivery')
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(0)
  const [erro, setErro] = useState('')

  useEffect(() => {
    try { setItens(JSON.parse(decodeURIComponent(carrinhoParam))) } catch {}
    if (slug) {
      supabase.from('estabelecimentos').select('*').eq('slug', slug).single().then(({ data }) => setEst(data))
    }
  }, [slug, carrinhoParam])

  const total = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  async function enviarPedido(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const payload = {
      cliente_nome: nome,
      cliente_telefone: telefone,
      tipo_entrega: tipoEntrega,
      endereco: tipoEntrega === 'delivery' ? endereco : 'Retirada no local',
      itens: JSON.parse(JSON.stringify(itens)),
      valor_total: total,
      observacoes: obs || null,
      estabelecimento_id: est?.id || null,
    }
    const { data, error } = await supabase.from('pedidos').insert(payload).select('numero_pedido').single()
    if (error) { setErro('Erro ao enviar pedido: ' + error.message); setEnviando(false); return }
    setNumeroPedido(data?.numero_pedido || 0)
    setSucesso(true)
    setEnviando(false)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-900/30 border-2 border-green-600/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Pedido Confirmado!</h2>
          <p className="text-gray-400 mb-4 text-sm">Recebemos seu pedido e já estamos preparando.</p>
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-2xl px-6 py-4 mb-6">
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-1">Número do pedido</p>
            <p className="text-amber-400 font-black text-4xl">#{numeroPedido}</p>
          </div>
          <p className="text-xs text-gray-600 mb-6">Pagamento na entrega</p>
          <button onClick={() => router.push('/cardapio?slug=' + slug)} className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition">
            ← Voltar ao cardápio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="bg-[#161616] border-b border-white/5 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-black text-white text-lg leading-tight">{est?.nome || 'Finalizar Pedido'}</h1>
          <p className="text-gray-500 text-xs">Confirme seus dados</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-10">
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="font-bold text-white text-sm">Resumo do Pedido</h3>
          </div>
          <div className="p-4 space-y-2">
            {itens.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-400"><span className="text-amber-500 font-bold">{item.quantidade}×</span> {item.nome}</span>
                <span className="text-white font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-amber-600/5 border-t border-amber-600/20 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Total do pedido</p>
              <p className="text-xs text-green-500 mt-0.5">✓ Pagamento na entrega</p>
            </div>
            <span className="text-amber-400 font-black text-2xl">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['delivery', 'retirada'] as const).map(tipo => (
            <button key={tipo} type="button" onClick={() => setTipoEntrega(tipo)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${tipoEntrega === tipo ? 'border-amber-500 bg-amber-600/10' : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'}`}>
              <div className="text-2xl mb-1">{tipo === 'delivery' ? '🛵' : '🏪'}</div>
              <p className={`font-bold text-sm ${tipoEntrega === tipo ? 'text-amber-400' : 'text-white'}`}>{tipo === 'delivery' ? 'Delivery' : 'Retirada'}</p>
              <p className="text-gray-500 text-xs mt-0.5">{tipo === 'delivery' ? 'Entregamos no seu endereço' : 'Retire na loja'}</p>
            </button>
          ))}
        </div>

        <form onSubmit={enviarPedido} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Seus Dados
          </h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Nome completo *</label>
            <input type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required
              className="w-full bg-[#111] border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Telefone / WhatsApp *</label>
            <input type="tel" placeholder="(00) 00000-0000" value={telefone} onChange={e => setTelefone(e.target.value)} required
              className="w-full bg-[#111] border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600" />
          </div>
          {tipoEntrega === 'delivery' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Endereço de entrega *</label>
              <input type="text" placeholder="Rua, número, bairro" value={endereco} onChange={e => setEndereco(e.target.value)} required
                className="w-full bg-[#111] border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Observações (opcional)</label>
            <textarea placeholder="Sem açúcar, embalagem especial, etc..." value={obs} onChange={e => setObs(e.target.value)} rows={3}
              className="w-full bg-[#111] border border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600 resize-none" />
          </div>
          {erro && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-t border-white/10">
            <span className="text-gray-400 text-sm">Total a pagar</span>
            <span className="text-amber-400 font-black text-xl">R$ {total.toFixed(2)}</span>
          </div>
          <button type="submit" disabled={enviando}
            className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-base transition-all flex items-center justify-center gap-2">
            {enviando ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando pedido...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Confirmar Pedido · R$ {total.toFixed(2)}</>
            )}
          </button>
          <p className="text-center text-xs text-gray-600">🔒 Pedido seguro · Pagamento na entrega</p>
        </form>
      </div>
    </div>
  )
}

export default function PedidoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <PedidoContent />
    </Suspense>
  )
}
