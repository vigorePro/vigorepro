'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Entregador = {
  id: string
  nome: string
  telefone: string | null
  veiculo: string | null
  status: 'disponivel' | 'em_entrega' | 'inativo'
  criado_em: string
}

function EntregadoresContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', telefone: '', veiculo: 'moto' })
  const [salvando, setSalvando] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!slug) return
    const { data: estab } = await supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!estab) return
    setEstabelecimentoId(estab.id)
    const { data } = await supabase
      .from('entregadores')
      .select('*')
      .eq('estabelecimento_id', estab.id)
      .order('criado_em', { ascending: false })
    setEntregadores(data || [])
    setLoading(false)
  }, [slug])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  async function salvarEntregador() {
    if (!estabelecimentoId || !form.nome.trim()) return
    setSalvando(true)
    await supabase.from('entregadores').insert({
      estabelecimento_id: estabelecimentoId,
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      veiculo: form.veiculo,
      status: 'disponivel',
    })
    setForm({ nome: '', telefone: '', veiculo: 'moto' })
    setShowForm(false)
    setSalvando(false)
    carregarDados()
  }

  async function alterarStatus(id: string, status: 'disponivel' | 'em_entrega' | 'inativo') {
    await supabase.from('entregadores').update({ status }).eq('id', id)
    carregarDados()
  }

  const statusColor: Record<string, string> = {
    disponivel: 'bg-green-900/40 border-green-700 text-green-400',
    em_entrega: 'bg-yellow-900/40 border-yellow-700 text-yellow-400',
    inativo: 'bg-gray-900/40 border-gray-700 text-gray-500',
  }

  const statusLabel: Record<string, string> = {
    disponivel: 'Disponivel',
    em_entrega: 'Em Entrega',
    inativo: 'Inativo',
  }

  const veiculoEmoji: Record<string, string> = {
    moto: 'Moto',
    bicicleta: 'Bicicleta',
    carro: 'Carro',
    a_pe: 'A Pe',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white animate-pulse">Carregando entregadores...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">Entregadores</h1>
            <p className="text-gray-400 text-sm">{slug}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            {showForm ? 'Cancelar' : '+ Novo Entregador'}
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-bold mb-4">Cadastrar Entregador</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do entregador"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Veiculo</label>
                <select
                  value={form.veiculo}
                  onChange={e => setForm({ ...form, veiculo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="moto">Moto</option>
                  <option value="bicicleta">Bicicleta</option>
                  <option value="carro">Carro</option>
                  <option value="a_pe">A Pe</option>
                </select>
              </div>
              <button
                onClick={salvarEntregador}
                disabled={salvando || !form.nome.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 rounded-lg font-bold"
              >
                {salvando ? 'Salvando...' : 'Salvar Entregador'}
              </button>
            </div>
          </div>
        )}

        {entregadores.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-500">
            <p>Nenhum entregador cadastrado</p>
            <p className="text-sm mt-1">Clique em + Novo Entregador para comecar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entregadores.map((e) => (
              <div key={e.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-lg">{e.nome}</div>
                    <div className="text-gray-400 text-sm">{veiculoEmoji[e.veiculo || 'moto']}</div>
                    {e.telefone && <div className="text-gray-400 text-sm">{e.telefone}</div>}
                  </div>
                  <span className={"px-3 py-1 rounded-full text-xs font-bold border " + (statusColor[e.status] || '')}>
                    {statusLabel[e.status] || e.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => alterarStatus(e.id, 'disponivel')}
                    disabled={e.status === 'disponivel'}
                    className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-30 py-1 rounded-lg text-xs font-semibold"
                  >
                    Disponivel
                  </button>
                  <button
                    onClick={() => alterarStatus(e.id, 'em_entrega')}
                    disabled={e.status === 'em_entrega'}
                    className="flex-1 bg-yellow-800 hover:bg-yellow-700 disabled:opacity-30 py-1 rounded-lg text-xs font-semibold"
                  >
                    Em Entrega
                  </button>
                  <button
                    onClick={() => alterarStatus(e.id, 'inativo')}
                    disabled={e.status === 'inativo'}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 py-1 rounded-lg text-xs font-semibold"
                  >
                    Inativo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EntregadoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white animate-pulse">Carregando...</div></div>}>
      <EntregadoresContent />
    </Suspense>
  )
}
