'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string
  endereco: string
  created_at: string
  total_pedidos: number
  total_gasto: number
}

function ClientesContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina] = useState(25)
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Partial<Cliente>>({})
  const [salvando, setSalvando] = useState(false)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)

  useEffect(() => {
    if (slug) carregarClientes()
  }, [slug])

  async function carregarClientes() {
    setCarregando(true)
    try {
      const { data: estab } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      if (!estab) return
      setEstabelecimentoId(estab.id)

      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('estabelecimento_id', estab.id)
        .order('nome')

      setClientes(data || [])
    } finally {
      setCarregando(false)
    }
  }

  async function salvarCliente() {
    if (!clienteEditando.nome || !estabelecimentoId) return
    setSalvando(true)
    try {
      if (clienteEditando.id) {
        await supabase.from('clientes').update({ ...clienteEditando }).eq('id', clienteEditando.id)
      } else {
        await supabase.from('clientes').insert([{ ...clienteEditando, estabelecimento_id: estabelecimentoId }])
      }
      setModalAberto(false)
      setClienteEditando({})
      await carregarClientes()
    } finally {
      setSalvando(false)
    }
  }

  const clientesFiltrados = clientes.filter(c => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return (
      (c.nome || '').toLowerCase().includes(b) ||
      (c.telefone || '').includes(b) ||
      (c.email || '').toLowerCase().includes(b)
    )
  })

  const inicio = (pagina - 1) * porPagina
  const paginados = clientesFiltrados.slice(inicio, inicio + porPagina)
  const totalPaginas = Math.ceil(clientesFiltrados.length / porPagina)

  const formatarData = (d: string) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('pt-BR')
  }

  const formatMoeda = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh', color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      {/* Barra de ações */}
      <div style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setClienteEditando({}); setModalAberto(true) }}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#eb0029', color: '#fff', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          + Adicionar
        </button>

        <div style={{ position: 'relative', minWidth: '200px', maxWidth: '280px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '13px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1) }}
            style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px 8px 30px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as any }}
          />
        </div>

        <button onClick={carregarClientes} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>↻</button>
        <button style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>▼</button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>📊 RFV</button>
          <button style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>📄 Excel ▾</button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
              {[
                { label: 'Nome', sortable: true },
                { label: 'Telefone', sortable: true },
                { label: 'Email', sortable: true },
                { label: 'Saldo Cashback', sortable: true },
                { label: 'Pedidos', sortable: true },
                { label: 'Total Venda', sortable: true },
                { label: 'Ticket Médio', sortable: true },
                { label: 'Cliente há', sortable: true },
                { label: 'Primeira Venda', sortable: true },
                { label: 'Última Venda', sortable: true },
                { label: 'Origem', sortable: true }
              ].map(col => (
                <th key={col.label} style={{ padding: '11px 14px', textAlign: 'left', color: '#9ca3af', fontWeight: '500', whiteSpace: 'nowrap', borderRight: '1px solid #2a2a2a', cursor: col.sortable ? 'pointer' : 'default' }}>
                  {col.label} {col.sortable && <span style={{ opacity: 0.4 }}>↕</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Carregando clientes...</td></tr>
            ) : paginados.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Nenhum cliente encontrado</td></tr>
            ) : paginados.map((cliente, i) => (
              <tr
                key={cliente.id}
                style={{ backgroundColor: i % 2 === 0 ? '#111111' : '#131313', borderBottom: '1px solid #1e1e1e', cursor: 'pointer' }}
                onClick={() => { setClienteEditando(cliente); setModalAberto(true) }}
              >
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', fontWeight: '500', color: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eb002933', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', color: '#eb0029', fontWeight: '700' }}>
                      {(cliente.nome || 'C').charAt(0).toUpperCase()}
                    </div>
                    {cliente.nome || '-'}
                  </div>
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{cliente.telefone || '-'}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{cliente.email || '-'}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#10b981' }}>R$ 0,00</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#fff', fontWeight: '600' }}>{cliente.total_pedidos || 0}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#fff', fontWeight: '600' }}>{formatMoeda(cliente.total_gasto || 0)}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>
                  {cliente.total_pedidos ? formatMoeda((cliente.total_gasto || 0) / cliente.total_pedidos) : '-'}
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>
                  {cliente.created_at ? (() => {
                    const dias = Math.floor((Date.now() - new Date(cliente.created_at).getTime()) / 86400000)
                    return dias < 30 ? dias + 'd' : Math.floor(dias/30) + 'm'
                  })() : '-'}
                </td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>{formatarData(cliente.created_at)}</td>
                <td style={{ padding: '10px 14px', borderRight: '1px solid #1e1e1e', color: '#9ca3af' }}>-</td>
                <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: '12px' }}>Manual</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Por página:</span>
          <select style={{ backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '4px 8px', color: '#fff', fontSize: '13px' }}>
            <option>25</option><option>50</option><option>100</option>
          </select>
        </div>
        <span>Mostrando {inicio + 1}-{Math.min(inicio + porPagina, clientesFiltrados.length)} de {clientesFiltrados.length}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{ padding: '4px 12px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', color: pagina === 1 ? '#4b5563' : '#9ca3af', cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Anterior
          </button>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            style={{ padding: '4px 12px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', color: pagina >= totalPaginas ? '#4b5563' : '#9ca3af', cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer' }}
          >
            Próximo →
          </button>
        </div>
      </div>

      {/* Modal Adicionar/Editar Cliente */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', width: '440px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{clienteEditando.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setModalAberto(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nome *', field: 'nome', type: 'text', placeholder: 'Nome completo' },
                { label: 'Telefone', field: 'telefone', type: 'tel', placeholder: '(11) 99999-9999' },
                { label: 'Email', field: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Endereço', field: 'endereco', type: 'text', placeholder: 'Rua, número, bairro' }
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>{label}</label>
                  <input
                    type={type}
                    value={(clienteEditando as any)[field] || ''}
                    onChange={e => setClienteEditando(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={salvarCliente} disabled={salvando} style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#eb0029', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
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
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>}>
      <ClientesContent />
    </Suspense>
  )
}
