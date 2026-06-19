'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, Plus, Search, AlertTriangle, TrendingDown, ArrowUpDown, Filter, Trash2, Edit2, Check, X, RefreshCw, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Insumo = {
  id: string
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  minimo: number
  custo: number
  fornecedor: string
  estabelecimento_id: string
}

type Movimentacao = {
  id: string
  insumo_id: string
  tipo: string
  quantidade: number
  observacao: string
  created_at: string
}

const CATEGORIAS = ['Todos', 'Carnes', 'Bebidas', 'Laticinios', 'Graos', 'Vegetais', 'Embalagens', 'Outros']
const UNIDADES = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct']

function EstoqueContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'critico' | 'baixo' | 'ok'>('todos')
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '', categoria: 'Carnes', quantidade: 0, unidade: 'kg', minimo: 0, custo: 0, fornecedor: ''
  })

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchInsumos = useCallback(async (estId: string) => {
    const { data } = await supabase
      .from('estoque')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('nome')
    setInsumos(data || [])
  }, [])

  const fetchMovimentacoes = useCallback(async (estId: string) => {
    const { data } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('created_at', { ascending: false })
      .limit(50)
    setMovimentacoes(data || [])
  }, [])

  useEffect(() => {
    fetchEstabelecimento()
  }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchInsumos(estabelecimentoId), fetchMovimentacoes(estabelecimentoId)])
      setLoading(false)
    }
    load()
    // Supabase Realtime
    const channel = supabase
      .channel('estoque-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchInsumos(estabelecimentoId) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchInsumos, fetchMovimentacoes])

  const getStatus = (insumo: Insumo) => {
    if (insumo.quantidade <= 0) return 'critico'
    if (insumo.quantidade <= insumo.minimo) return 'baixo'
    return 'ok'
  }

  const getStatusColor = (status: string) => {
    if (status === 'critico') return '#ef4239'
    if (status === 'baixo') return '#f59e0b'
    return '#22c55e'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'critico') return 'Critico'
    if (status === 'baixo') return 'Baixo'
    return 'OK'
  }

  const insumosFiltrados = insumos.filter(i => {
    const matchSearch = i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = categoriaFiltro === 'Todos' || i.categoria === categoriaFiltro
    const status = getStatus(i)
    const matchStatus = statusFiltro === 'todos' || status === statusFiltro
    return matchSearch && matchCat && matchStatus
  })

  const totalItens = insumos.length
  const itensCriticos = insumos.filter(i => getStatus(i) === 'critico').length
  const itensBaixos = insumos.filter(i => getStatus(i) === 'baixo').length
  const valorTotal = insumos.reduce((acc, i) => acc + (i.quantidade * i.custo), 0)

  const handleSave = async () => {
    if (!form.nome || !estabelecimentoId) return
    setSaving(true)
    if (editingId) {
      await supabase.from('estoque').update({
        nome: form.nome, categoria: form.categoria, quantidade: form.quantidade,
        unidade: form.unidade, minimo: form.minimo, custo: form.custo, fornecedor: form.fornecedor
      }).eq('id', editingId)
      await supabase.from('movimentacoes_estoque').insert({
        estabelecimento_id: estabelecimentoId, insumo_id: editingId,
        tipo: 'ajuste', quantidade: form.quantidade, observacao: 'Edicao manual'
      })
    } else {
      const { data: novo } = await supabase.from('estoque').insert({
        estabelecimento_id: estabelecimentoId, nome: form.nome, categoria: form.categoria,
        quantidade: form.quantidade, unidade: form.unidade, minimo: form.minimo,
        custo: form.custo, fornecedor: form.fornecedor
      }).select().single()
      if (novo) {
        await supabase.from('movimentacoes_estoque').insert({
          estabelecimento_id: estabelecimentoId, insumo_id: novo.id,
          tipo: 'entrada', quantidade: form.quantidade, observacao: 'Cadastro inicial'
        })
      }
    }
    await Promise.all([fetchInsumos(estabelecimentoId), fetchMovimentacoes(estabelecimentoId)])
    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm({ nome: '', categoria: 'Carnes', quantidade: 0, unidade: 'kg', minimo: 0, custo: 0, fornecedor: '' })
  }

  const handleEdit = (insumo: Insumo) => {
    setForm({
      nome: insumo.nome, categoria: insumo.categoria, quantidade: insumo.quantidade,
      unidade: insumo.unidade, minimo: insumo.minimo, custo: insumo.custo,
      fornecedor: insumo.fornecedor || ''
    })
    setEditingId(insumo.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('estoque').delete().eq('id', id)
    await fetchInsumos(estabelecimentoId)
  }

  const handleMovimentacao = async (insumoId: string, tipo: 'entrada' | 'saida', qtd: number) => {
    const insumo = insumos.find(i => i.id === insumoId)
    if (!insumo) return
    const novaQtd = tipo === 'entrada' ? insumo.quantidade + qtd : Math.max(0, insumo.quantidade - qtd)
    await supabase.from('estoque').update({ quantidade: novaQtd }).eq('id', insumoId)
    await supabase.from('movimentacoes_estoque').insert({
      estabelecimento_id: estabelecimentoId, insumo_id: insumoId,
      tipo, quantidade: qtd, observacao: tipo === 'entrada' ? 'Entrada manual' : 'Saida manual'
    })
    await Promise.all([fetchInsumos(estabelecimentoId), fetchMovimentacoes(estabelecimentoId)])
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Package size={22} color="#ef4239" />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Estoque</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { fetchInsumos(estabelecimentoId); fetchMovimentacoes(estabelecimentoId); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ nome: '', categoria: 'Carnes', quantidade: 0, unidade: 'kg', minimo: 0, custo: 0, fornecedor: '' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <Plus size={14} /> Novo Insumo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total de Itens', value: totalItens, icon: <Package size={18} color="#ef4239" />, color: '#ef4239' },
          { label: 'Itens Criticos', value: itensCriticos, icon: <AlertTriangle size={18} color="#ef4239" />, color: '#ef4239' },
          { label: 'Estoque Baixo', value: itensBaixos, icon: <TrendingDown size={18} color="#f59e0b" />, color: '#f59e0b' },
          { label: 'Valor Total', value: 'R$ ' + valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), icon: <Package size={18} color="#22c55e" />, color: '#22c55e' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {card.icon}
              <span style={{ fontSize: '13px', color: '#999' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #292929' }}>
        {[{ id: 'estoque', label: 'Insumos' }, { id: 'movimentacoes', label: 'Movimentacoes' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent', color: activeTab === tab.id ? '#ef4239' : '#999', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: 'Mulish, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal de Formulario */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{editingId ? 'Editar Insumo' : 'Novo Insumo'}</span>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Nome do Insumo</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Carne Bovina"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Unidade</label>
                <select value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Quantidade Atual</label>
                <input type="number" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Quantidade Minima</label>
                <input type="number" value={form.minimo} onChange={e => setForm(p => ({ ...p, minimo: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Custo Unitario (R$)</label>
                <input type="number" step="0.01" value={form.custo} onChange={e => setForm(p => ({ ...p, custo: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Fornecedor</label>
                <input value={form.fornecedor} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))}
                  placeholder="Nome do fornecedor"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '8px 18px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'estoque' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar insumo..."
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
            </div>
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value as any)}
              style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
              <option value="todos">Todos os status</option>
              <option value="critico">Critico</option>
              <option value="baixo">Estoque Baixo</option>
              <option value="ok">OK</option>
            </select>
          </div>

          {/* Tabela */}
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Insumo', 'Categoria', 'Quantidade', 'Minimo', 'Custo Unit.', 'Valor Total', 'Status', 'Acoes'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando estoque...</td></tr>
                ) : insumosFiltrados.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    {insumos.length === 0 ? 'Nenhum insumo cadastrado. Clique em "Novo Insumo" para comecar.' : 'Nenhum resultado encontrado.'}
                  </td></tr>
                ) : insumosFiltrados.map(insumo => {
                  const status = getStatus(insumo)
                  return (
                    <tr key={insumo.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {status === 'critico' && <AlertTriangle size={14} color="#ef4239" />}
                          {status === 'baixo' && <TrendingDown size={14} color="#f59e0b" />}
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6e6e6' }}>{insumo.nome}</span>
                        </div>
                        {insumo.fornecedor && <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{insumo.fornecedor}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999' }}>{insumo.categoria}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: getStatusColor(status) }}>{insumo.quantidade}</span>
                          <span style={{ fontSize: '11px', color: '#666' }}>{insumo.unidade}</span>
                          <button onClick={() => handleMovimentacao(insumo.id, 'entrada', 1)}
                            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', color: '#22c55e', cursor: 'pointer', padding: '2px 6px', fontSize: '12px' }}>+</button>
                          <button onClick={() => handleMovimentacao(insumo.id, 'saida', 1)}
                            style={{ background: 'rgba(239,66,57,0.15)', border: '1px solid rgba(239,66,57,0.3)', borderRadius: '4px', color: '#ef4239', cursor: 'pointer', padding: '2px 6px', fontSize: '12px' }}>-</button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999' }}>{insumo.minimo} {insumo.unidade}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e6e6e6' }}>R$ {insumo.custo?.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>R$ {(insumo.quantidade * insumo.custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: status === 'critico' ? 'rgba(239,66,57,0.15)' : status === 'baixo' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: getStatusColor(status), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEdit(insumo)}
                            style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#999', cursor: 'pointer', padding: '5px' }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(insumo.id)}
                            style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#ef4239', cursor: 'pointer', padding: '5px' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'movimentacoes' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #292929' }}>
                {['Data', 'Insumo', 'Tipo', 'Quantidade', 'Observacao'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando movimentacoes...</td></tr>
              ) : movimentacoes.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Nenhuma movimentacao registrada ainda.</td></tr>
              ) : movimentacoes.map(mov => {
                const insumo = insumos.find(i => i.id === mov.insumo_id)
                return (
                  <tr key={mov.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666' }}>{new Date(mov.created_at).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e6e6e6' }}>{insumo?.nome || mov.insumo_id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: mov.tipo === 'entrada' ? 'rgba(34,197,94,0.15)' : mov.tipo === 'saida' ? 'rgba(239,66,57,0.15)' : 'rgba(99,102,241,0.15)', color: mov.tipo === 'entrada' ? '#22c55e' : mov.tipo === 'saida' ? '#ef4239' : '#818cf8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                        {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: mov.tipo === 'entrada' ? '#22c55e' : '#ef4239' }}>
                      {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade} {insumo?.unidade || ''}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999' }}>{mov.observacao || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function EstoquePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <EstoqueContent />
    </Suspense>
  )
}