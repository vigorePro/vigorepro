'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, Plus, Search, AlertTriangle, TrendingDown, ArrowUpDown, Filter, Trash2, Edit2, Check, X } from 'lucide-react'

type Insumo = {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  minimo: number
  custo: number
  fornecedor: string
}

const CATEGORIAS = ['Todos', 'Carnes', 'Bebidas', 'Laticínios', 'Grãos', 'Vegetais', 'Embalagens', 'Outros']

const MOCK_INSUMOS: Insumo[] = [
  { id: 1, nome: 'Carne Bovina (kg)', categoria: 'Carnes', quantidade: 5, unidade: 'kg', minimo: 10, custo: 45, fornecedor: 'Frigorífico A' },
  { id: 2, nome: 'Frango (kg)', categoria: 'Carnes', quantidade: 12, unidade: 'kg', minimo: 8, custo: 18, fornecedor: 'Frigorífico A' },
  { id: 3, nome: 'Coca-Cola 2L', categoria: 'Bebidas', quantidade: 48, unidade: 'un', minimo: 24, custo: 7.5, fornecedor: 'Distribuidora B' },
  { id: 4, nome: 'Queijo Mussarela (kg)', categoria: 'Laticínios', quantidade: 3, unidade: 'kg', minimo: 5, custo: 32, fornecedor: 'Laticínios C' },
  { id: 5, nome: 'Farinha de Trigo (kg)', categoria: 'Grãos', quantidade: 25, unidade: 'kg', minimo: 10, custo: 4.5, fornecedor: 'Moinho D' },
  { id: 6, nome: 'Tomate (kg)', categoria: 'Vegetais', quantidade: 8, unidade: 'kg', minimo: 5, custo: 6, fornecedor: 'Hortifrúti E' },
  { id: 7, nome: 'Caixa de Pizza 35cm', categoria: 'Embalagens', quantidade: 2, unidade: 'un', minimo: 50, custo: 1.2, fornecedor: 'Embalagens F' },
  { id: 8, nome: 'Óleo de Soja (L)', categoria: 'Outros', quantidade: 15, unidade: 'L', minimo: 6, custo: 8, fornecedor: 'Distribuidora B' },
]

function EstoqueContent() {
  const searchParams = useSearchParams()
  const [insumos, setInsumos] = useState<Insumo[]>(MOCK_INSUMOS)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todos')
  const [editando, setEditando] = useState<number | null>(null)
  const [novoItem, setNovoItem] = useState(false)
  const [novo, setNovo] = useState({ nome: '', categoria: 'Carnes', quantidade: 0, unidade: 'kg', minimo: 0, custo: 0, fornecedor: '' })

  const filtrados = insumos.filter(i => {
    const matchBusca = i.nome.toLowerCase().includes(busca.toLowerCase()) || i.fornecedor.toLowerCase().includes(busca.toLowerCase())
    const matchCat = catFiltro === 'Todos' || i.categoria === catFiltro
    return matchBusca && matchCat
  })

  const criticos = insumos.filter(i => i.quantidade <= i.minimo)
  const totalValor = insumos.reduce((acc, i) => acc + i.quantidade * i.custo, 0)

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '16px'
  }
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', backgroundColor: '#111', border: '1px solid #292929',
    borderRadius: '8px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif'
  }
  const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #1a1a1a', verticalAlign: 'middle' as const }
  const thStyle: React.CSSProperties = { padding: '10px 16px', fontSize: '12px', color: '#888', fontWeight: 600, textAlign: 'left' as const, borderBottom: '1px solid #292929' }

  const statusColor = (qtd: number, min: number) => {
    if (qtd === 0) return '#ef4239'
    if (qtd <= min) return '#f59e0b'
    return '#22c55e'
  }

  const statusLabel = (qtd: number, min: number) => {
    if (qtd === 0) return 'Sem Estoque'
    if (qtd <= min) return 'Crítico'
    return 'OK'
  }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package size={26} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Estoque</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Controle de insumos e ingredientes</p>
          </div>
        </div>
        <button onClick={() => setNovoItem(true)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', borderRadius: '8px', border: 'none',
          backgroundColor: '#ef4239', color: '#fff', fontWeight: 700,
          fontSize: '14px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          <Plus size={16} /> Novo Insumo
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total em Estoque', value: `R$ ${totalValor.toFixed(2).replace('.', ',')}`, color: '#22c55e', icon: Package },
          { label: 'Itens Críticos', value: criticos.length.toString(), color: criticos.length > 0 ? '#f59e0b' : '#22c55e', icon: AlertTriangle },
          { label: 'Sem Estoque', value: insumos.filter(i => i.quantidade === 0).length.toString(), color: '#ef4239', icon: TrendingDown },
          { label: 'Total de Itens', value: insumos.length.toString(), color: '#6b7280', icon: Package },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '14px 16px', borderTop: `2px solid ${stat.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>{stat.label}</span>
                <Icon size={14} color={stat.color} />
              </div>
              <div style={{ color: stat.color, fontSize: '22px', fontWeight: 700 }}>{stat.value}</div>
            </div>
          )
        })}
      </div>

      {/* Alertas criticos */}
      {criticos.length > 0 && (
        <div style={{ backgroundColor: '#2d1f0a', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color='#f59e0b' />
          <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 500 }}>
            {criticos.length} item(ns) com estoque abaixo do mínimo: {criticos.map(i => i.nome).join(', ')}
          </span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' as const }}>
          <Search size={14} style={{ position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type='text'
            placeholder='Buscar insumo ou fornecedor...'
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '34px', boxSizing: 'border-box' as const }}
          />
        </div>
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={cardStyle}>
        {novoItem && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px', marginBottom: '8px', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #ef4239', flexWrap: 'wrap' as const }}>
            <input placeholder='Nome' value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} style={{ ...inputStyle, flex: 2, minWidth: '120px' }} />
            <select value={novo.categoria} onChange={e => setNovo({...novo, categoria: e.target.value})} style={{ ...inputStyle, minWidth: '100px' }}>
              {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
            </select>
            <input type='number' placeholder='Qtd' value={novo.quantidade || ''} onChange={e => setNovo({...novo, quantidade: Number(e.target.value)})} style={{ ...inputStyle, width: '70px' }} />
            <input placeholder='Un.' value={novo.unidade} onChange={e => setNovo({...novo, unidade: e.target.value})} style={{ ...inputStyle, width: '60px' }} />
            <input type='number' placeholder='Mín.' value={novo.minimo || ''} onChange={e => setNovo({...novo, minimo: Number(e.target.value)})} style={{ ...inputStyle, width: '70px' }} />
            <input type='number' placeholder='Custo R$' value={novo.custo || ''} onChange={e => setNovo({...novo, custo: Number(e.target.value)})} style={{ ...inputStyle, width: '90px' }} />
            <input placeholder='Fornecedor' value={novo.fornecedor} onChange={e => setNovo({...novo, fornecedor: e.target.value})} style={{ ...inputStyle, flex: 1, minWidth: '100px' }} />
            <button onClick={() => {
              setInsumos([...insumos, { ...novo, id: Date.now() }])
              setNovoItem(false)
              setNovo({ nome: '', categoria: 'Carnes', quantidade: 0, unidade: 'kg', minimo: 0, custo: 0, fornecedor: '' })
            }} style={{ ...inputStyle, backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e', cursor: 'pointer' }}>
              <Check size={14} />
            </button>
            <button onClick={() => setNovoItem(false)} style={{ ...inputStyle, backgroundColor: '#ef423920', color: '#ef4239', border: '1px solid #ef4239', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <thead>
            <tr style={{ backgroundColor: '#111' }}>
              {['Insumo', 'Categoria', 'Quantidade', 'Mínimo', 'Custo Unit.', 'Valor Total', 'Fornecedor', 'Status', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(item => (
              <tr key={item.id} style={{ ':hover': { backgroundColor: '#222' } } as React.CSSProperties}>
                <td style={{ ...tdStyle, color: '#e6e6e6', fontWeight: 500 }}>{item.nome}</td>
                <td style={{ ...tdStyle, color: '#888' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#222', fontSize: '12px' }}>{item.categoria}</span>
                </td>
                <td style={{ ...tdStyle, color: statusColor(item.quantidade, item.minimo), fontWeight: 600 }}>
                  {item.quantidade} {item.unidade}
                </td>
                <td style={{ ...tdStyle, color: '#888' }}>{item.minimo} {item.unidade}</td>
                <td style={{ ...tdStyle, color: '#e6e6e6' }}>R$ {item.custo.toFixed(2).replace('.', ',')}</td>
                <td style={{ ...tdStyle, color: '#e6e6e6' }}>R$ {(item.quantidade * item.custo).toFixed(2).replace('.', ',')}</td>
                <td style={{ ...tdStyle, color: '#888', fontSize: '13px' }}>{item.fornecedor}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: statusColor(item.quantidade, item.minimo) + '20',
                    color: statusColor(item.quantidade, item.minimo),
                  }}>
                    {statusLabel(item.quantidade, item.minimo)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setInsumos(insumos.filter(i => i.id !== item.id))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4239', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center' as const, color: '#444', padding: '32px' }}>
                  Nenhum item encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function EstoquePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <EstoqueContent />
    </Suspense>
  )
}
