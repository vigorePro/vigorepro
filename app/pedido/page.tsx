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
        if (slug) supabase.from('estabelecimentos').select('*').eq('slug', slug).single().then(({ data }) => setEst(data))
  }, [slug, carrinhoParam])

  const total = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0)

  async function enviarPedido(e: React.FormEvent) {
        e.preventDefault()
        setErro('')
        setEnviando(true)
        const { data, error } = await supabase
          .from('pedidos')
          .insert({
                    cliente_nome: nome,
                    cliente_telefone: telefone,
                    endereco: tipoEntrega === 'delivery' ? endereco : 'Retirada no local',
                    itens: itens,
                    valor_total: total,
                    observacoes: obs || null,
          })
          .select('numero_pedido')
          .single()
        setEnviando(false)
        if (error) {
                setErro('Erro ao enviar pedido: ' + error.message)
        } else if (data) {
                setNumeroPedido((data as any).numero_pedido || 0)
                setSucesso(true)
        }
  }

  if (sucesso) {
        return (
                <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                                  <div className="text-6xl mb-4">✅</div>div>
                                  <h1 className="text-2xl font-bold text-green-600 mb-2">Pedido Confirmado!</h1>h1>
                                  <p className="text-gray-600 mb-4">Seu pedido foi recebido com sucesso.</p>p>
                          {numeroPedido > 0 && <p className="text-lg font-semibold text-amber-700">Pedido #{numeroPedido}</p>p>}
                                  <p className="text-sm text-gray-500 mt-4">Pagamento na entrega</p>p>
                                  <button onClick={() => router.push('/cardapio?slug=' + slug)}
                                                className="mt-6 bg-amber-600 text-white px-6 py-2 rounded-xl hover:bg-amber-700">
                                              Voltar ao cardapio
                                  </button>button>
                        </div>div>
                </div>div>
              )
  }
  
    return (
          <div className="min-h-screen bg-amber-50 p-4">
                <div className="max-w-lg mx-auto">
                        <div className="mb-6">
                                  <h1 className="text-2xl font-bold text-amber-800">{est?.nome || 'Dolce&Dolce'}</h1>h1>
                                  <p className="text-gray-500">Confirme seus dados</p>p>
                        </div>div>
                        <div className="bg-white rounded-2xl shadow p-4 mb-4">
                                  <h2 className="font-semibold text-gray-700 mb-3">Resumo</h2>h2>
                          {itens.map(item => (
                        <div key={item.id} className="flex justify-between text-sm py-1">
                                      <span>{item.quantidade}x {item.nome}</span>span>
                                      <span className="font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</span>span>
                        </div>div>
                      ))}
                                  <div className="border-t mt-3 pt-3 flex justify-between font-bold text-amber-700">
                                              <span>Total</span>span>
                                              <span>R$ {total.toFixed(2)}</span>span>
                                  </div>div>
                                  <p className="text-xs text-green-600 mt-2 text-center">Pagamento na entrega</p>p>
                        </div>div>
                        <form onSubmit={enviarPedido} className="bg-white rounded-2xl shadow p-4 space-y-4">
                                  <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>label>
                                              <input required value={nome} onChange={e => setNome(e.target.value)}
                                                              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Nome completo" />
                                  </div>div>
                                  <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>label>
                                              <input required value={telefone} onChange={e => setTelefone(e.target.value)}
                                                              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="(00) 00000-0000" />
                                  </div>div>
                                  <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de entrega</label>label>
                                              <div className="flex gap-3">
                                                            <button type="button" onClick={() => setTipoEntrega('delivery')}
                                                                              className={'flex-1 py-2 rounded-xl text-sm font-medium border-2 ' + (tipoEntrega === 'delivery' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500')}>
                                                                            Delivery
                                                            </button>button>
                                                            <button type="button" onClick={() => setTipoEntrega('retirada')}
                                                                              className={'flex-1 py-2 rounded-xl text-sm font-medium border-2 ' + (tipoEntrega === 'retirada' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500')}>
                                                                            Retirada
                                                            </button>button>
                                              </div>div>
                                  </div>div>
                          {tipoEntrega === 'delivery' && (
                        <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>label>
                                      <input required value={endereco} onChange={e => setEndereco(e.target.value)}
                                                        className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Rua, numero, bairro" />
                        </div>div>
                                  )}
                                  <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>label>
                                              <textarea value={obs} onChange={e => setObs(e.target.value)}
                                                              className="w-full border rounded-xl px-3 py-2 text-sm" rows={3} placeholder="Observacao opcional" />
                                  </div>div>
                          {erro && <p className="text-red-500 text-sm text-center">{erro}</p>p>}
                                  <button type="submit" disabled={enviando}
                                                className="w-full bg-amber-600 text-white py-3 rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50">
                                    {enviando ? 'Enviando...' : `Confirmar Pedido - R$ ${total.toFixed(2)}`}
                                  </button>button>
                        </form>form>
                </div>div>
          </div>div>
        )
}

export default function PedidoPage() {
    return (
          <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center"><p>Carregando...</p>p></div>div>}>
                <PedidoContent />
          </Suspense>Suspense>
        )
}</div>
