'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { HandCoins, Plus, Search, AlertTriangle, CheckCircle, Clock, RefreshCw, X, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type FiadoLancamento = {
  id: string
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string | null
  descricao: string
  valor: number
  valor_pago: number
  data_lancamento: string
  data_vencimento: string | null
  status: 'aberto' | 'pago' | 'parcial' | 'cancelado'
  observacao: string | null
  created_at: string
}

function FiadoContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [lancamentos, setLancamentos] = useState<FiadoLancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [activeTab, setActiveTab] = useState<'abertos' | 'pagos' | 'todos'>('abertos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<FiadoLancamento | null>(null)
  const [pagandoValor, setPagandoValor] = useState(0)
  const [form, setForm] = useState({
    cliente_nome: '', cliente_telefone: '', descricao: '',
    valor: 0, data_vencimento: '', observacao: ''
  })

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchLancamentos = useCallback(async (estId: string) => {
    const { data } = await supabase
      .from('fiado_lancamentos')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('created_at', { ascending: false })
    setLancamentos(data || [])
  }, [])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => {
      setLoading(true)
      await fetchLancamentos(estabelecimentoId)
      setLoading(false)
    }
    load()
      const ch = supabase
      .channel('fiado-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiado_lancamentos', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchLancamentos(estabelecimentoId) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [estabelecimentoId, fetchLancamentos])

  const abertos = lancamentos.filter(l => l.status === 'aberto' || l.status === 'parcial')
  const pagos = lancamentos.filter(l => l.status === 'pago')
  const totalAberto = abertos.reduce((acc, l) => acc + (Number(l.valor) - Number(l.valor_pago || 0)), 0)
  const totalRecebido = pagos.reduce((acc, l) => acc + Number(l.valor), 0)
  const clientes = [...new Set(abertos.map(l => l.cliente_nome))].length

  const filtrado = lancamentos.filter(l => {
    const matchSearch = l.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTab = activeTab === 'todos' ||
      (activeTab === 'abertos' && (l.status === 'aberto' || l.status === 'parcial')) ||
      (activeTab === 'pagos' && l.status === 'pago')
    return matchSearch && matchTab
  })

  const handleSave = async () => {
    if (!form.cliente_nome || !form.valor || !estabelecimentoId) return
    setSaving(true)
    await supabase.from('fiado_lancamentos').insert({
      estabelecimento_id: estabelecimentoId,
      cliente_nome: form.cliente_nome,
      cliente_telefone: form.cliente_telefone || null,
      descricao: form.descricao,
      valor: form.valor,
      valor_pago: 0,
      data_lancamento: new Date().toISOString().split('T')[0],
      data_vencimento: form.data_vencimento || null,
      status: 'aberto',
      observacao: form.observacao || null
    })
    await fetchLancamentos(estabelecimentoId)
    setSaving(false)
    setShowForm(false)
    setForm({ cliente_nome: '', cliente_telefone: '', descricao: '', valor: 0, data_vencimento: '', observacao: '' })
  }

  const handlePagar = async () => {
    if (!selectedLancamento) return
    const novoValorPago = Number(selectedLancamento.valor_pago || 0) + pagandoValor
    const novoStatus = novoValorPago >= Number(selectedLancamento.valor) ? 'pago' : 'parcial'
    await supabase.from('fiado_lancamentos').update({
      valor_pago: novoValorPago,
      status: novoStatus
    }).eq('id', selectedLancamento.id)
    await fetchLancamentos(estabelecimentoId)
    setSelectedLancamento(null)
    setPagandoValor(0)
  }

  const getStatusColor = (s: string) => s === 'pago' ? '#22c55e' : s === 'parcial' ? '#f59e0b' : s === 'cancelado' ? '#666' : '#ef4239'
  const getStatusLabel = (s: string) => s === 'pago' ? 'Pago' : s === 'parcial' ? 'Parcial' : s === 'cancelado' ? 'Cancelado' : 'Em Aberto'

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HandCoins size={22} color="#ef4239" />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Fiado</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fetchLancamentos(estabelecimentoId)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <Plus size={14} /> Novo Fiado
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total em Aberto', value: 'R$ ' + totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), sub: abertos.length + ' lancamentos', icon: <AlertTriangle size={18} color="#ef4239" />, color: '#ef4239' },
          { label: 'Total Recebido', value: 'R$ ' + totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), sub: pagos.length + ' pagamentos', icon: <CheckCircle size={18} color="#22c55e" />, color: '#22c55e' },
          { label: 'Clientes com Fiado', value: clientes, sub: 'clientes ativos', icon: <HandCoins size={18} color="#f59e0b" />, color: '#f59e0b' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {card.icon}
              <span style={{ fontSize: '13px', color: '#999' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '1px solid #292929' }}>
        {[
          { id: 'abertos', label: 'Em Aberto (' + abertos.length + ')' },
          { id: 'pagos', label: 'Pagos (' + pagos.length + ')' },
          { id: 'todos', label: 'Todos' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent', color: activeTab === tab.id ? '#ef4239' : '#999', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: 'Mulish, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal Novo Fiado */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '460px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Novo Fiado</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Nome do Cliente</label>
                <input value={form.cliente_nome} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))} placeholder="Ex: Joao Silva"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Telefone (opcional)</label>
                <input value={form.cliente_telefone} onChange={e => setForm(p => ({ ...p, cliente_telefone: e.target.value }))} placeholder="(11) 99999-9999"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Valor (R$)</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Descricao</label>
                <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: X-Burguer, Refrigerante"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Vencimento (opcional)</label>
                <input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Observacao</label>
                <input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Opcional"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '8px 18px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {selectedLancamento && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '380px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Registrar Pagamento</span>
              <button onClick={() => setSelectedLancamento(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#111', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6', marginBottom: '4px' }}>{selectedLancamento.cliente_nome}</div>
              <div style={{ fontSize: '13px', color: '#999' }}>{selectedLancamento.descricao}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Total: R$ {Number(selectedLancamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span style={{ fontSize: '12px', color: '#f59e0b' }}>Pago: R$ {Number(selectedLancamento.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4239', marginTop: '4px' }}>
                Restante: R$ {(Number(selectedLancamento.valor) - Number(selectedLancamento.valor_pago || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '6px' }}>Valor recebido agora (R$)</label>
            <input type="number" step="0.01" value={pagandoValor} onChange={e => setPagandoValor(Number(e.target.value))}
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#e6e6e6', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedLancamento(null)} style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={handlePagar} disabled={!pagandoValor}
                style={{ padding: '8px 18px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: !pagandoValor ? 0.5 : 1 }}>
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '400px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por cliente ou descricao..."
          style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
      </div>

      {/* Tabela */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #292929' }}>
              {['Cliente', 'Descricao', 'Valor Total', 'Pago', 'Restante', 'Vencimento', 'Status', 'Acao'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando fiado...</td></tr>
            ) : filtrado.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                {lancamentos.length === 0 ? 'Nenhum lancamento de fiado. Clique em "Novo Fiado" para comecar.' : 'Nenhum resultado.'}
              </td></tr>
            ) : filtrado.map(l => {
              const restante = Number(l.valor) - Number(l.valor_pago || 0)
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>{l.cliente_nome}</div>
                    {l.cliente_telefone && (
                      <div style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={10} />{l.cliente_telefone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999', maxWidth: '160px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao || '-'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#22c55e' }}>R$ {Number(l.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: restante > 0 ? '#ef4239' : '#22c55e' }}>R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{l.data_vencimento ? new Date(l.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: l.status === 'pago' ? 'rgba(34,197,94,0.15)' : l.status === 'parcial' ? 'rgba(245,158,11,0.15)' : 'rgba(239,66,57,0.15)', color: getStatusColor(l.status), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      {getStatusLabel(l.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {(l.status === 'aberto' || l.status === 'parcial') && (
                      <button onClick={() => { setSelectedLancamento(l); setPagandoValor(Number(l.valor) - Number(l.valor_pago || 0)); }}
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                        Receber
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FiadoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FiadoContent />
    </Suspense>
  )
}