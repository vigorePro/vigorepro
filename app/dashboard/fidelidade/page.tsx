'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Star, Gift, Users, TrendingUp, Tag, Plus, X, CheckCircle,
  Percent, DollarSign, Clock, Search, RefreshCw, Award, Zap
} from 'lucide-react'

type Cupom = {
  id: string
  codigo: string
  desconto_tipo: 'percentual' | 'fixo'
  desconto_valor: number
  minimo_pedido: number | null
  usos_maximos: number | null
  usos_atuais: number
  ativo: boolean
  valido_ate: string | null
  created_at: string
}

type ClienteFiel = {
  id: string
  nome: string
  telefone: string | null
  total_pedidos: number
  total_gasto: number
  ultima_compra: string | null
}

function FidelidadeContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [clientes, setClientes] = useState<ClienteFiel[]>([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'cupons' | 'clientes'>('cupons')
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    codigo: '', desconto_tipo: 'percentual', desconto_valor: '', minimo_pedido: '', usos_maximos: '', valido_ate: ''
  })

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabelecimentoId(data.id) })
  }, [slug])

  const fetchData = useCallback(async () => {
    if (!estabelecimentoId) return
    setLoading(true)
    const [cuponsRes, clientesRes] = await Promise.all([
      supabase.from('cupons').select('*').eq('estabelecimento_id', estabelecimentoId).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome, telefone, total_pedidos, total_gasto, ultima_compra')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('total_pedidos', { ascending: false })
        .limit(50)
    ])
    if (cuponsRes.data) setCupons(cuponsRes.data)
    if (clientesRes.data) setClientes(clientesRes.data)
    setLoading(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchData() }, [fetchData])

  const criarCupom = async () => {
    if (!form.codigo || !form.desconto_valor) return
    setSaving(true)
    await supabase.from('cupons').insert({
      estabelecimento_id: estabelecimentoId,
      codigo: form.codigo.toUpperCase(),
      desconto_tipo: form.desconto_tipo,
      desconto_valor: parseFloat(form.desconto_valor),
      minimo_pedido: form.minimo_pedido ? parseFloat(form.minimo_pedido) : null,
      usos_maximos: form.usos_maximos ? parseInt(form.usos_maximos) : null,
      valido_ate: form.valido_ate || null,
      ativo: true,
      usos_atuais: 0
    })
    setForm({ codigo: '', desconto_tipo: 'percentual', desconto_valor: '', minimo_pedido: '', usos_maximos: '', valido_ate: '' })
    setShowModal(false)
    setSaving(false)
    fetchData()
  }

  const toggleCupom = async (id: string, ativo: boolean) => {
    await supabase.from('cupons').update({ ativo: !ativo }).eq('id', id)
    setCupons(prev => prev.map(c => c.id === id ? { ...c, ativo: !ativo } : c))
  }

  const excluirCupom = async (id: string) => {
    await supabase.from('cupons').delete().eq('id', id)
    setCupons(prev => prev.filter(c => c.id !== id))
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // KPIs
  const cuponsAtivos = cupons.filter(c => c.ativo).length
  const totalUsos = cupons.reduce((a, c) => a + (c.usos_atuais || 0), 0)
  const topClientes = clientes.filter(c => (c.total_pedidos || 0) >= 3).length
  const ticketMedioClientes = clientes.length > 0
    ? clientes.reduce((a, c) => a + (c.total_gasto || 0), 0) / clientes.filter(c => (c.total_pedidos || 0) > 0).length
    : 0

  const cuponsFilter = cupons.filter(c => !busca || c.codigo.includes(busca.toUpperCase()))
  const clientesFilter = clientes.filter(c => !busca || (c.nome || '').toLowerCase().includes(busca.toLowerCase()) || (c.telefone || '').includes(busca))

  const isCupomValido = (c: Cupom) => {
    if (!c.ativo) return false
    if (c.valido_ate && new Date(c.valido_ate) < new Date()) return false
    if (c.usos_maximos && c.usos_atuais >= c.usos_maximos) return false
    return true
  }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', backgroundColor: '#111', minHeight: '100vh', color: '#fff', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={20} color="#ef4239" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Fidelidade & CRM</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Cupons de desconto e clientes fieis</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} style={{ padding: '7px 12px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 6, color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', backgroundColor: '#ef4239', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Novo Cupom
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Cupons Ativos', value: cuponsAtivos, icon: Tag, cor: '#ef4239', sub: `de ${cupons.length} total` },
          { label: 'Total de Usos', value: totalUsos, icon: Zap, cor: '#f59e0b', sub: 'cupons utilizados' },
          { label: 'Clientes Registrados', value: clientes.length, icon: Users, cor: '#6366f1', sub: 'no sistema' },
          { label: 'Clientes Fieis', value: topClientes, icon: Award, cor: '#22c55e', sub: '3+ pedidos' },
        ].map(kpi => (
          <div key={kpi.label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#888' }}>{kpi.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon size={15} color={kpi.cor} />
              </div>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>{kpi.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#666' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Abas + Busca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'cupons', label: 'Cupons', count: cupons.length },
            { id: 'clientes', label: 'Clientes Fieis', count: clientes.length },
          ].map(a => (
            <button key={a.id} onClick={() => { setAba(a.id as any); setBusca('') }} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', backgroundColor: aba === a.id ? '#ef4239' : 'transparent', color: aba === a.id ? '#fff' : '#888', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
              {a.label} <span style={{ fontSize: 11, backgroundColor: aba === a.id ? '#ffffff33' : '#333', borderRadius: 10, padding: '1px 7px' }}>{a.count}</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder={aba === 'cupons' ? 'Buscar cupom...' : 'Buscar cliente...'}
            style={{ width: '100%', padding: '8px 12px 8px 32px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
          Carregando...
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      ) : aba === 'cupons' ? (
        /* CUPONS */
        cuponsFilter.length === 0 ? (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 60, textAlign: 'center' }}>
            <Gift size={40} color="#333" style={{ marginBottom: 12 }} />
            <p style={{ color: '#888', margin: '0 0 16px' }}>{busca ? 'Nenhum cupom encontrado' : 'Nenhum cupom cadastrado ainda'}</p>
            {!busca && <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', backgroundColor: '#ef4239', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Criar Primeiro Cupom</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {cuponsFilter.map(cupom => {
              const valido = isCupomValido(cupom)
              return (
                <div key={cupom.id} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${valido ? '#292929' : '#3a1212'}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 1, fontFamily: 'monospace' }}>{cupom.codigo}</span>
                        {valido ? <span style={{ fontSize: 10, backgroundColor: '#22c55e22', color: '#22c55e', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>ATIVO</span>
                          : <span style={{ fontSize: 10, backgroundColor: '#3a1212', color: '#ef4444', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>INATIVO</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ef4239' }}>
                        {cupom.desconto_tipo === 'percentual' ? `${cupom.desconto_valor}%` : fmt(cupom.desconto_valor)} OFF
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleCupom(cupom.id, cupom.ativo)} style={{ padding: '5px 10px', backgroundColor: cupom.ativo ? '#333' : '#22c55e22', border: 'none', borderRadius: 6, color: cupom.ativo ? '#888' : '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                        {cupom.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => excluirCupom(cupom.id)} style={{ padding: '5px 8px', backgroundColor: '#3a1212', border: 'none', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {cupom.minimo_pedido && <span style={{ fontSize: 11, color: '#888', backgroundColor: '#111', padding: '3px 8px', borderRadius: 6 }}>Min: {fmt(cupom.minimo_pedido)}</span>}
                    {cupom.usos_maximos && <span style={{ fontSize: 11, color: '#888', backgroundColor: '#111', padding: '3px 8px', borderRadius: 6 }}>{cupom.usos_atuais}/{cupom.usos_maximos} usos</span>}
                    {!cupom.usos_maximos && cupom.usos_atuais > 0 && <span style={{ fontSize: 11, color: '#888', backgroundColor: '#111', padding: '3px 8px', borderRadius: 6 }}>{cupom.usos_atuais} usos</span>}
                    {cupom.valido_ate && <span style={{ fontSize: 11, color: '#888', backgroundColor: '#111', padding: '3px 8px', borderRadius: 6 }}>Ate {new Date(cupom.valido_ate).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* CLIENTES FIEIS */
        clientesFilter.length === 0 ? (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 60, textAlign: 'center' }}>
            <Users size={40} color="#333" style={{ marginBottom: 12 }} />
            <p style={{ color: '#888', margin: 0 }}>{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#111' }}>
                  {['Cliente', 'Telefone', 'Pedidos', 'Total Gasto', 'Ultima Compra', 'Nivel'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: '#666', fontWeight: 700, borderBottom: '1px solid #292929' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesFilter.map((cliente, idx) => {
                  const pedidos = cliente.total_pedidos || 0
                  const nivel = pedidos >= 10 ? { label: 'VIP', cor: '#f59e0b' } : pedidos >= 5 ? { label: 'Fiel', cor: '#22c55e' } : pedidos >= 3 ? { label: 'Regular', cor: '#6366f1' } : { label: 'Novo', cor: '#888' }
                  return (
                    <tr key={cliente.id} style={{ borderBottom: '1px solid #1f1f1f', backgroundColor: idx % 2 === 0 ? 'transparent' : '#111' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#ef423922', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4239' }}>{(cliente.nome || '?')[0].toUpperCase()}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{cliente.nome || 'Sem nome'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{cliente.telefone || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#fff' }}>{pedidos}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>{fmt(cliente.total_gasto || 0)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                        {cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: nivel.cor, backgroundColor: nivel.cor + '22', padding: '3px 10px', borderRadius: 10 }}>{nivel.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal Novo Cupom */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000b', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Novo Cupom de Desconto</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Codigo do Cupom *</label>
                <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="Ex: DESCONTO10" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: 1 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Tipo de Desconto</label>
                  <select value={form.desconto_tipo} onChange={e => setForm(f => ({ ...f, desconto_tipo: e.target.value }))} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none' }}>
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Valor do Desconto *</label>
                  <input type="number" value={form.desconto_valor} onChange={e => setForm(f => ({ ...f, desconto_valor: e.target.value }))} placeholder={form.desconto_tipo === 'percentual' ? '10' : '5.00'} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Pedido Minimo (R$)</label>
                  <input type="number" value={form.minimo_pedido} onChange={e => setForm(f => ({ ...f, minimo_pedido: e.target.value }))} placeholder="Opcional" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Usos Maximos</label>
                  <input type="number" value={form.usos_maximos} onChange={e => setForm(f => ({ ...f, usos_maximos: e.target.value }))} placeholder="Ilimitado" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Valido Ate</label>
                <input type="date" value={form.valido_ate} onChange={e => setForm(f => ({ ...f, valido_ate: e.target.value }))} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={criarCupom} disabled={saving || !form.codigo || !form.desconto_valor} style={{ padding: '12px 0', backgroundColor: saving || !form.codigo || !form.desconto_valor ? '#333' : '#ef4239', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving || !form.codigo ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif' }}>
                {saving ? 'Salvando...' : 'Criar Cupom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FidelidadePage() {
  return <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}><FidelidadeContent /></Suspense>
}
