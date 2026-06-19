'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Search, RefreshCw, Phone, Mail, MapPin, ShoppingBag, TrendingUp, Star, X, Edit3, Trash2, ChevronDown, ChevronUp, Users, Download } from 'lucide-react'

type Cliente = {
  id: string
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  cidade?: string
  data_nascimento?: string
  total_pedidos?: number
  total_gasto?: number
  ultimo_pedido?: string
  cashback?: number
  pontos?: number
  criado_em: string
  estabelecimento_id: string
}

function ClientesContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'nome' | 'total_gasto' | 'total_pedidos' | 'criado_em'>('nome')
  const [ordemAsc, setOrdemAsc] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [modalCadastro, setModalCadastro] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', endereco: '', cidade: '', data_nascimento: '' })
  const POR_PAGINA = 25

  // KPIs
  const totalGasto = clientes.reduce((a, c) => a + (c.total_gasto || 0), 0)
  const ticketMedio = clientes.length > 0 ? totalGasto / clientes.length : 0
  const recorrentes = clientes.filter(c => (c.total_pedidos || 0) > 1).length

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchClientes = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    let query = supabase.from('clientes').select('*', { count: 'exact' })
      .eq('estabelecimento_id', estabelecimentoId)
      .order(ordenacao, { ascending: ordemAsc })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
    
    if (busca) query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`)
    
    const { data, count } = await query
    if (data) setClientes(data)
    if (count !== null) setTotal(count)
    setCarregando(false)
  }, [estabelecimentoId, busca, ordenacao, ordemAsc, pagina])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchClientes()
    const ch = supabase.channel('cli-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchClientes() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [estabelecimentoId, fetchClientes])

  const salvarCliente = async () => {
    if (!form.nome || !estabelecimentoId) return
    if (editando) {
      await supabase.from('clientes').update({ ...form }).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert({ ...form, estabelecimento_id: estabelecimentoId })
    }
    setForm({ nome: '', telefone: '', email: '', endereco: '', cidade: '', data_nascimento: '' })
    setModalCadastro(false)
    setEditando(null)
    fetchClientes()
  }

  const excluirCliente = async (id: string) => {
    await supabase.from('clientes').delete().eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
    if (clienteSelecionado?.id === id) setClienteSelecionado(null)
  }

  const abrirEdicao = (c: Cliente) => {
    setEditando(c)
    setForm({ nome: c.nome || '', telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '', cidade: c.cidade || '', data_nascimento: c.data_nascimento || '' })
    setModalCadastro(true)
  }

  const toggleOrdem = (col: typeof ordenacao) => {
    if (ordenacao === col) setOrdemAsc(a => !a)
    else { setOrdenacao(col); setOrdemAsc(true) }
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA)
  const s = { fontFamily: 'Mulish, sans-serif' }

  return (
    <div style={{ ...s, padding: 24, color: '#e6e6e6', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Clientes</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>{total} cliente(s) cadastrado(s)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchClientes} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setEditando(null); setForm({ nome: '', telefone: '', email: '', endereco: '', cidade: '', data_nascimento: '' }); setModalCadastro(true) }} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ef4239', color: '#fff',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', gap: 6
          }}><Plus size={16} /> Adicionar</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Clientes', valor: total, icon: <Users size={20} />, cor: '#3b82f6' },
          { label: 'Total Gasto', valor: 'R$ ' + totalGasto.toFixed(2).replace('.', ','), icon: <TrendingUp size={20} />, cor: '#22c55e' },
          { label: 'Ticket Médio', valor: 'R$ ' + ticketMedio.toFixed(2).replace('.', ','), icon: <ShoppingBag size={20} />, cor: '#f59e0b' },
          { label: 'Recorrentes', valor: recorrentes, icon: <Star size={20} />, cor: '#ef4239' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#888' }}>{kpi.label}</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{kpi.valor}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color="#555" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }} placeholder="Buscar por nome, telefone ou e-mail..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
        />
        {busca && <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={14} /></button>}
      </div>

      {/* Tabela */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #292929' }}>
              {[
                { key: 'nome', label: 'Nome' },
                { key: null, label: 'Telefone' },
                { key: null, label: 'Email' },
                { key: 'total_pedidos', label: 'Pedidos' },
                { key: 'total_gasto', label: 'Total Gasto' },
                { key: null, label: 'Cashback' },
                { key: 'criado_em', label: 'Cliente há' },
                { key: null, label: 'Ações' },
              ].map(col => (
                <th key={col.label} onClick={col.key ? () => toggleOrdem(col.key as any) : undefined}
                  style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, cursor: col.key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.key === ordenacao && (ordemAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#555' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#555' }}>
                <Users size={40} color="#333" style={{ display: 'block', margin: '0 auto 12px' }} />
                {busca ? 'Nenhum cliente encontrado para "' + busca + '"' : 'Nenhum cliente cadastrado ainda'}
              </td></tr>
            ) : clientes.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < clientes.length - 1 ? '1px solid #1e1e1e' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1f1f1f')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setClienteSelecionado(clienteSelecionado?.id === c.id ? null : c)}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ef423922', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4239', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#e6e6e6', fontSize: 14 }}>{c.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>{c.telefone || '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#888' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#e6e6e6', textAlign: 'center' }}>{c.total_pedidos || 0}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#22c55e' }}>R$ {(c.total_gasto || 0).toFixed(2).replace('.', ',')}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>R$ {(c.cashback || 0).toFixed(2).replace('.', ',')}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#666' }}>
                  {Math.floor((Date.now() - new Date(c.criado_em).getTime()) / (1000 * 60 * 60 * 24))} dias
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => abrirEdicao(c)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #292929', background: 'none', color: '#888', cursor: 'pointer' }}><Edit3 size={13} /></button>
                    <button onClick={() => excluirCliente(c.id)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #292929', background: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#888' }}>
          <span>Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #292929', background: pagina === 1 ? '#111' : '#1a1a1a', color: pagina === 1 ? '#444' : '#888', cursor: pagina === 1 ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif' }}>← Anterior</button>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #292929', background: pagina === totalPaginas ? '#111' : '#1a1a1a', color: pagina === totalPaginas ? '#444' : '#888', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif' }}>Próximo →</button>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO */}
      {modalCadastro && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 28, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{editando ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => { setModalCadastro(false); setEditando(null) }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'nome', label: 'Nome *', placeholder: 'Nome completo', full: true },
                { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                { key: 'email', label: 'E-mail', placeholder: 'email@exemplo.com' },
                { key: 'cidade', label: 'Cidade', placeholder: 'São Paulo' },
                { key: 'data_nascimento', label: 'Nascimento', placeholder: '', type: 'date' },
                { key: 'endereco', label: 'Endereço', placeholder: 'Rua, número, bairro', full: true },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} type={f.type || 'text'}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setModalCadastro(false); setEditando(null) }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #333', background: 'none', color: '#aaa', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Cancelar</button>
              <button onClick={salvarCliente} disabled={!form.nome} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: form.nome ? '#ef4239' : '#555', color: '#fff', fontWeight: 700, cursor: form.nome ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif' }}>
                {editando ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <ClientesContent />
    </Suspense>
  )
}
