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
      supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', slug)
        .single()
        .then(({ data }) => setEst(data))
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

    const { data, error } = await supabase
      .from('pedidos')
      .insert(payload)
      .select('numero_pedido')
      .single()

    if (error) {
      setErro('Erro ao enviar pedido: ' + error.message)
      setEnviando(false)
      return
    }

    setNumeroPedido(data?.numero_pedido || 0)
    setSucesso(true)
    setEnviando(false)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Pedido Confirmado!</h2>
          <p className="text-gray-600 mb-2">Seu pedido foi recebido.</p>
          <p className="text-amber-600 font-bold text-xl mb-4">Pedido #{numeroPedido}</p>
          <p className="text-sm text-gray-500 mb-6">{est?.nome === 'na entrega' ? 'Pagamento na entrega' : 'Pagamento na entrega'}</p>
          <button onClick={() => router.push('/cardapio?slug=' + slug)}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">
            Voltar ao cardápio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">{est?.nome || 'Dolce&Dolce'}</h1>
          <p className="text-gray-500">Confirme seus dados</p>
        </div>

        {/* Resumo */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="font-bold text-gray-700 mb-3">Resumo</h3>
          {itens.map(item => (
            <div key={item.id} className="flex justify-between text-sm mb-1">
              <span>{item.quantidade}x {item.nome}</span>
              <span>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t mt-3 pt-3 flex justify-between font-bold">
            <span className="text-gray-700">Total</span>
            <span className="text-amber-600">R$ {total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-green-600 text-center mt-2">Pagamento na entrega</p>
        </div>

        {/* Formulario */}
        <form onSubmit={enviarPedido} className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
            <input
              type="text"
              placeholder="Nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de entrega</label>
            <select
              value={tipoEntrega}
              onChange={e => setTipoEntrega(e.target.value as 'delivery' | 'retirada')}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"
            >
              <option value="delivery">Delivery</option>
              <option value="retirada">Retirada no local</option>
            </select>
          </div>

          {tipoEntrega === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereco de entrega</label>
              <input
                type="text"
                placeholder="Rua, numero, bairro"
                value={endereco}
                onChange={e => setEndereco(e.target.value)}
                required
                className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes (opcional)</label>
            <textarea
              placeholder="Sem cebola, etc..."
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Confirmar Pedido'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PedidoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center">Carregando...</div>}>
      <PedidoContent />
    </Suspense>
  )
}
