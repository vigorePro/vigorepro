'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Plus, Search, Filter, RefreshCw, BarChart3, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Lancamento = {
  id: string
  estabelecimento_id: string
  tipo: 'receita' | 'despesa'
  descricao: string
  valor: number
  categoria: string
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  forma_pagamento: string
  fornecedor_id: string | null
  observacao: string | null
  created_at: string
}

const CATEGORIAS_RECEITA = ['Vendas', 'Delivery', 'Mesa', 'PIX', 'Cartao', 'Outros']
const CATEGORIAS_DESPESA = ['Insumos', 'Aluguel', 'Salarios', 'Energia', 'Marketing', 'Equipamentos', 'Manutencao', 'Outros']
const FORMAS_PAGAMENTO = ['PIX', 'Cartao de Credito', 'Cartao de Debito', 'Dinheiro', 'Boleto', 'Transferencia']

function FinanceiroContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'receitas' | 'despesas' | 'lancamentos'>('visao-geral')
  const [periodo, setPeriodo] = useState('mes')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipo: 'despesa' as 'receita' | 'despesa',
    descricao: '', valor: 0, categoria: 'Insumos',
    data_vencimento: new Date().toISOString().split('T')[0],
    forma_pagamento: 'PIX', status: 'pendente', observacao: ''
  })

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchLancamentos = useCallback(async (estId: string) => {
    const now = new Date()
    let dateFilter = new Date()
    if (periodo === 'semana') dateFilter.setDate(now.getDate() - 7)
    else if (periodo === 'mes') dateFilter.setMonth(now.getMonth() - 1)
    else if (periodo === 'trimestre') dateFilter.setMonth(now.getMonth() - 3)
    else if (periodo === 'ano') dateFilter.setFullYear(now.getFullYear() - 1)

    const { data } = await supabase
      .from('lancamentos_financeiros')
      .select('*')
      .eq('estabelecimento_id', estId)
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false })
    setLancamentos(data || [])
  }, [periodo])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => {
      setLoading(true)
      await fetchLancamentos(estabelecimentoId)
      setLoading(false)
    }
    load()
    const channel = supabase
      .channel('fin-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_financeiros', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchLancamentos(estabelecimentoId) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchLancamentos])

  const receitas = lancamentos.filter(l => l.tipo === 'receita')
  const despesas = lancamentos.filter(l => l.tipo === 'despesa')
  const totalReceitas = receitas.reduce((acc, l) => acc + Number(l.valor), 0)
  const totalDespesas = despesas.reduce((acc, l) => acc + Number(l.valor), 0)
  const lucro = totalReceitas - totalDespesas
  const pendentes = lancamentos.filter(l => l.status === 'pendente').reduce((acc, l) => acc + Number(l.valor), 0)

  const lancamentosFiltrados = lancamentos.filter(l => {
    const matchSearch = l.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFiltro === 'todos' || l.status === statusFiltro
    const matchTipo = activeTab === 'lancamentos' || activeTab === 'visao-geral' ||
      (activeTab === 'receitas' && l.tipo === 'receita') ||
      (activeTab === 'despesas' && l.tipo === 'despesa')
    return matchSearch && matchStatus && matchTipo
  })

  const handleSave = async () => {
    if (!form.descricao || !estabelecimentoId) return
    setSaving(true)
    await supabase.from('lancamentos_financeiros').insert({
      estabelecimento_id: estabelecimentoId,
      tipo: form.tipo, descricao: form.descricao, valor: form.valor,
      categoria: form.categoria, data_vencimento: form.data_vencimento,
      forma_pagamento: form.forma_pagamento, status: form.status,
      observacao: form.observacao || null
    })
    await fetchLancamentos(estabelecimentoId)
    setSaving(false)
    setShowForm(false)
    setForm({ tipo: 'despesa', descricao: '', valor: 0, categoria: 'Insumos', data_vencimento: new Date().toISOString().split('T')[0], forma_pagamento: 'PIX', status: 'pendente', observacao: '' })
  }

  const handlePagar = async (id: string) => {
    await supabase.from('lancamentos_financeiros').update({ status: 'pago', data_pagamento: new Date().toISOString() }).eq('id', id)
    await fetchLancamentos(estabelecimentoId)
  }

  const getStatusColor = (status: string) => {
    if (status === 'pago') return '#22c55e'
    if (status === 'atrasado') return '#ef4239'
    if (status === 'cancelado') return '#666'
    return '#f59e0b'
  }

  const catDespesasData = CATEGORIAS_DESPESA.map(cat => ({
    cat,
    total: despesas.filter(d => d.categoria === cat).reduce((acc, d) => acc + Number(d.valor), 0)
  })).filter(d => d.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={22} color="#ef4239" />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Financeiro</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '7px 12px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="trimestre">Trimestre</option>
            <option value="ano">Este ano</option>
          </select>
          <button onClick={() => fetchLancamentos(estabelecimentoId)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <Plus size={14} /> Novo Lancamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Receitas', value: totalReceitas, icon: <TrendingUp size={18} color="#22c55e" />, color: '#22c55e', prefix: 'R$ ' },
          { label: 'Total Despesas', value: totalDespesas, icon: <TrendingDown size={18} color="#ef4239" />, color: '#ef4239', prefix: 'R$ ' },
          { label: lucro >= 0 ? 'Lucro' : 'Prejuizo', value: Math.abs(lucro), icon: <Wallet size={18} color={lucro >= 0 ? '#22c55e' : '#ef4239'} />, color: lucro >= 0 ? '#22c55e' : '#ef4239', prefix: (lucro < 0 ? '-' : '') + 'R$ ' },
          { label: 'A Pagar/Receber', value: pendentes, icon: <CreditCard size={18} color="#f59e0b" />, color: '#f59e0b', prefix: 'R$ ' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {card.icon}
              <span style={{ fontSize: '13px', color: '#999' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: card.color }}>
              {card.prefix}{card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '1px solid #292929' }}>
        {[
          { id: 'visao-geral', label: 'Visao Geral' },
          { id: 'receitas', label: 'Receitas (' + receitas.length + ')' },
          { id: 'despesas', label: 'Despesas (' + despesas.length + ')' },
          { id: 'lancamentos', label: 'Todos os Lancamentos' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent', color: activeTab === tab.id ? '#ef4239' : '#999', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: 'Mulish, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Novo Lancamento</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '20px' }}>x</button>
            </div>
            {/* Tipo toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '16px', background: '#111', borderRadius: '8px', padding: '4px' }}>
              {(['receita', 'despesa'] as const).map(tipo => (
                <button key={tipo} onClick={() => setForm(p => ({ ...p, tipo, categoria: tipo === 'receita' ? 'Vendas' : 'Insumos' }))}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'Mulish, sans-serif',
                    background: form.tipo === tipo ? (tipo === 'receita' ? '#22c55e' : '#ef4239') : 'transparent',
                    color: form.tipo === tipo ? '#fff' : '#666' }}>
                  {tipo === 'receita' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Descricao</label>
                <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Compra de insumos"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  {(form.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Vencimento</label>
                <input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Forma de Pagamento</label>
                <select value={form.forma_pagamento} onChange={e => setForm(p => ({ ...p, forma_pagamento: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Observacao</label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} rows={2} placeholder="Observacoes opcionais..."
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '8px 18px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visao Geral */}
      {activeTab === 'visao-geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ArrowUpCircle size={16} color="#22c55e" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Receitas por Categoria</span>
            </div>
            {receitas.length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Nenhuma receita no periodo.</p>
            ) : CATEGORIAS_RECEITA.map(cat => {
              const total = receitas.filter(r => r.categoria === cat).reduce((acc, r) => acc + Number(r.valor), 0)
              if (total === 0) return null
              const pct = totalReceitas > 0 ? (total / totalReceitas) * 100 : 0
              return (
                <div key={cat} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#999' }}>{cat}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: '6px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: '#22c55e', borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ArrowDownCircle size={16} color="#ef4239" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Despesas por Categoria</span>
            </div>
            {despesas.length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Nenhuma despesa no periodo.</p>
            ) : catDespesasData.map(({ cat, total }) => {
              const pct = totalDespesas > 0 ? (total / totalDespesas) * 100 : 0
              return (
                <div key={cat} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#999' }}>{cat}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4239' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ height: '6px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: '#ef4239', borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Pendentes */}
          <div style={{ gridColumn: '1/-1', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar size={16} color="#f59e0b" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Lancamentos Pendentes</span>
            </div>
            {lancamentos.filter(l => l.status === 'pendente').length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Nenhum lancamento pendente.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Descricao', 'Tipo', 'Vencimento', 'Valor', 'Acao'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.filter(l => l.status === 'pendente').slice(0, 5).map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#e6e6e6' }}>{l.descricao}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: l.tipo === 'receita' ? 'rgba(34,197,94,0.15)' : 'rgba(239,66,57,0.15)', color: l.tipo === 'receita' ? '#22c55e' : '#ef4239', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                          {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#999' }}>{l.data_vencimento ? new Date(l.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: l.tipo === 'receita' ? '#22c55e' : '#ef4239' }}>R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handlePagar(l.id)}
                          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                          Marcar Pago
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tabela de lancamentos (receitas, despesas ou todos) */}
      {(activeTab === 'receitas' || activeTab === 'despesas' || activeTab === 'lancamentos') && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar lancamento..."
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
            </div>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Data', 'Descricao', 'Categoria', 'Tipo', 'Forma Pgto', 'Valor', 'Status', 'Acao'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando...</td></tr>
                ) : lancamentosFiltrados.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    {lancamentos.length === 0 ? 'Nenhum lancamento ainda. Clique em "Novo Lancamento" para comecar.' : 'Nenhum resultado encontrado.'}
                  </td></tr>
                ) : lancamentosFiltrados.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e6e6e6', maxWidth: '180px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999' }}>{l.categoria}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: l.tipo === 'receita' ? 'rgba(34,197,94,0.15)' : 'rgba(239,66,57,0.15)', color: l.tipo === 'receita' ? '#22c55e' : '#ef4239', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                        {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{l.forma_pagamento}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: l.tipo === 'receita' ? '#22c55e' : '#ef4239' }}>
                      {l.tipo === 'receita' ? '+' : '-'}R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: l.status === 'pago' ? 'rgba(34,197,94,0.15)' : l.status === 'atrasado' ? 'rgba(239,66,57,0.15)' : l.status === 'cancelado' ? 'rgba(102,102,102,0.15)' : 'rgba(245,158,11,0.15)', color: getStatusColor(l.status), padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {l.status === 'pendente' && (
                        <button onClick={() => handlePagar(l.id)}
                          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FinanceiroContent />
    </Suspense>
  )
}