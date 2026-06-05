'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Estabelecimento } from '@/lib/supabase'

type Item = { id: string; nome: string; preco: number; quantidade: number }

export default function Pedido() {
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

  useEffect(() => {
    try { setItens(JSON.parse(decodeURIComponent(carrinhoParam))) } catch {}
    if (slug) supabase.from('estabelecimentos').select('*').eq('slug', slug).single().then(({ data }) => setEst(data))
  }, [slug, carrinhoParam])

  const total = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  async function enviarPedido(e: React.FormEvent) {
    e.preventDefault()
    if (!est) return
    setEnviando(true)

    const { data: ultimo } = await supabase.from('pedidos').select('numero').eq('estabelecimento_id', est.id).order('numero', { ascending: false }).limit(1).single()
    const novoNumero = (ultimo?.numero || 0) + 1

    const { data, error } = await supabase.from('pedidos').insert({
      estabelecimento_id: est.id,
      numero: novoNumero,
      status: 'pendente',
      tipo_entrega: tipoEntrega,
      cliente_nome: nome,
      cliente_telefone: telefone,
      cliente_endereco: endereco,
      itens: itens.map(i => ({ produto_id: i.id, nome: i.nome, preco: i.preco, quantidade: i.quantidade })),
      total,
      observacoes: obs
    }).select().single()

    setEnviando(false)
    if (!error && data) { setNumeroPedido(novoNumero); setSucesso(true) }
  }

  if (sucesso) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5EDE0' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7B3F1E' }}>Pedido #{numeroPedido}</h2>
        <p className="text-gray-600 mb-6">Recebemos seu pedido! Aguarde a confirmação.</p>
        <button onClick={() => router.push('/cardapio?slug=' + slug)}
          className="w-full py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: '#7B3F1E' }}>
          Fazer novo pedido
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#F5EDE0' }}>
      <div className="sticky top-0 z-10 shadow-md py-4 px-4" style={{ backgroundColor: '#7B3F1E' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-xl">←</button>
          <h1 className="text-white text-xl font-bold">Finalizar Pedido</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-lg mb-3" style={{ color: '#7B3F1E' }}>Seu pedido</h2>
          {itens.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span>{item.nome} <span className="text-gray-400 text-sm">x{item.quantidade}</span></span>
              <span className="font-semibold" style={{ color: '#7B3F1E' }}>R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-200 font-bold text-lg">
            <span>Total</span>
            <span style={{ color: '#7B3F1E' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
          <p className="text-center text-sm mt-2 py-1 rounded-lg" style={{ backgroundColor: '#F5EDE0', color: '#7B3F1E' }}>💵 Pagamento na entrega</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-lg mb-3" style={{ color: '#7B3F1E' }}>Como prefere receber?</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['delivery', 'retirada'] as const).map(tipo => (
              <button key={tipo} onClick={() => setTipoEntrega(tipo)}
                className="py-3 rounded-xl font-medium border-2 transition-colors"
                style={{ borderColor: tipoEntrega === tipo ? '#7B3F1E' : '#E5E7EB', backgroundColor: tipoEntrega === tipo ? '#F5EDE0' : 'white', color: tipoEntrega === tipo ? '#7B3F1E' : '#6B7280' }}>
                {tipo === 'delivery' ? '🛵 Delivery' : '🏪 Retirada'}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={enviarPedido} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <h2 className="font-bold text-lg" style={{ color: '#7B3F1E' }}>Seus dados</h2>
          {[
            { label: 'Nome completo', value: nome, set: setNome, type: 'text', placeholder: 'Seu nome' },
            { label: 'WhatsApp', value: telefone, set: setTelefone, type: 'tel', placeholder: '(43) 99999-9999' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input value={field.value} onChange={e => field.set(e.target.value)} required type={field.type}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none" placeholder={field.placeholder} />
            </div>
          ))}
          {tipoEntrega === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço de entrega</label>
              <input value={endereco} onChange={e => setEndereco(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none" placeholder="Rua, número, bairro" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none resize-none" placeholder="Alguma observação?" />
          </div>
          <button type="submit" disabled={enviando}
            className="w-full py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50" style={{ backgroundColor: '#7B3F1E' }}>
            {enviando ? 'Enviando...' : 'Confirmar — R$ ' + total.toFixed(2).replace('.', ',')}
          </button>
        </form>
      </div>
    </div>
  )
}
