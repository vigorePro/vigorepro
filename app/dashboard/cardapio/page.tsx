'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutGrid, List, RefreshCw, Search, Trash2 } from 'lucide-react'

type Categoria = {
  id: string
  estabelecimento_id: string
  nome: string
  ordem: number
  banner_url: string | null
}

type Produto = {
  id: string
  estabelecimento_id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number
  imagem_url: string | null
  foto_url: string | null
  disponivel: boolean
  destaque: boolean
}

function formatarPreco(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardapioContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  // supabase from @/lib/supabase

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todos')
  const [filtroAba, setFiltroAba] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [busca, setBusca] = useState('')
  const [abaTipo, setAbaTipo] = useState<'produtos' | 'grupos' | 'complementos'>('produtos')
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<Partial<Produto>>({})
  const [salvando, setSalvando] = useState(false)
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)

  useEffect(() => {
    if (slug) carregarDados()
  }, [slug])

  // Supabase Realtime
  useEffect(() => {
    if (!estabelecimentoId) return
    const ch = supabase
      .channel('card-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { carregarDados() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { carregarDados() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [estabelecimentoId])

  async function carregarDados() {
    setCarregando(true)
    try {
      const { data: estab } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      if (!estab) return
      setEstabelecimentoId(estab.id)

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categorias').select('*').eq('estabelecimento_id', estab.id).order('ordem'),
        supabase.from('produtos').select('*').eq('estabelecimento_id', estab.id).order('nome')
      ])
      setCategorias(cats || [])
      setProdutos(prods || [])
    } finally {
      setCarregando(false)
    }
  }

  async function salvarProduto() {
    if (!produtoEditando.nome || !estabelecimentoId) return
    setSalvando(true)
    try {
      if (produtoEditando.id) {
        await supabase.from('produtos').update({ ...produtoEditando }).eq('id', produtoEditando.id)
      } else {
        await supabase.from('produtos').insert([{ ...produtoEditando, estabelecimento_id: estabelecimentoId }])
      }
      setModalAberto(false)
      setProdutoEditando({})
      await carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  async function toggleDisponivel(id: string, atual: boolean) {
    await supabase.from('produtos').update({ disponivel: !atual }).eq('id', id)
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, disponivel: !atual } : p))
  }

  async function excluirProduto(id: string) {
    if (!confirm('Excluir produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    setProdutos(prev => prev.filter(p => p.id !== id))
  }

  const produtosFiltrados = produtos.filter(p => {
    if (categoriaSelecionada !== 'todos' && p.categoria_id !== categoriaSelecionada) return false
    if (filtroAba === 'ativos' && !p.disponivel) return false
    if (filtroAba === 'inativos' && p.disponivel) return false
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const totalPorCategoria = (catId: string) => produtos.filter(p => p.categoria_id === catId).length
  const totalGeral = produtos.length

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh', color: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* Header tabs + acoes */}
      <div style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { key: 'produtos', label: 'Produtos' },
            { key: 'grupos', label: 'Grupo de Opcoes' },
            { key: 'complementos', label: 'Complementos' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAbaTipo(tab.key as any)}
              style={{
                padding: '14px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: abaTipo === tab.key ? '2px solid #eb0029' : '2px solid transparent',
                color: abaTipo === tab.key ? '#eb0029' : '#9ca3af'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutGrid size={14} /></button>
          <button style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><List size={14} /></button>
          <button onClick={carregarDados} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={14} /></button>
          <button style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={14} /></button>
          <button
            onClick={() => { setProdutoEditando({ disponivel: true, destaque: false }); setModalAberto(true) }}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#eb0029', color: '#fff', fontSize: '13px', fontWeight: '600' }}
          >
            + Novo Produto (F1)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar setores */}
        <div style={{ width: '220px', backgroundColor: '#1a1a1a', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2a2a' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SETORES</span>
            <button
              onClick={() => { /* nova categoria */ }}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: '#eb0029', color: '#fff', fontWeight: '600' }}
            >
              + Novo Setor
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            <button
              onClick={() => setCategoriaSelecionada('todos')}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left' as any,
                backgroundColor: categoriaSelecionada === 'todos' ? '#eb002922' : 'transparent',
                color: categoriaSelecionada === 'todos' ? '#eb0029' : '#9ca3af',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '2px'
              }}
            >
              <span>Todos</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{totalGeral}</span>
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaSelecionada(cat.id)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'left' as any,
                  backgroundColor: categoriaSelecionada === cat.id ? '#eb002922' : 'transparent',
                  color: categoriaSelecionada === cat.id ? '#eb0029' : '#9ca3af',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '2px'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.nome}</span>
                <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0, marginLeft: '4px' }}>{totalPorCategoria(cat.id)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteudo principal */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Barra filtros */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#fff' }}>
              {categoriaSelecionada === 'todos' ? 'Todos os Produtos' : categorias.find(c => c.id === categoriaSelecionada)?.nome || ''}
              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '400' }}>{produtosFiltrados.length} produtos</span>
            </h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              {(['todos', 'ativos', 'inativos'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroAba(f)}
                  style={{
                    padding: '5px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid #2a2a2a',
                    backgroundColor: filtroAba === f ? '#2a2a2a' : 'transparent',
                    color: filtroAba === f ? '#fff' : '#9ca3af'
                  }}
                >
                  {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
              <button style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid #2a2a2a', backgroundColor: 'transparent', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 Editar em Lote
              </button>
              <button style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid #2a2a2a', backgroundColor: 'transparent', color: '#9ca3af' }}>
                 Importar
              </button>
            </div>
          </div>

          {/* Grid produtos */}
          <div style={{ padding: '16px 20px' }}>
            {carregando ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Carregando cardapio...</div>
            ) : abaTipo !== 'produtos' ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                {abaTipo === 'grupos' ? 'Grupos de Opcoes' : 'Complementos'}  em breve
              </div>
            ) : (
              <>
                {categorias
                  .filter(cat => categoriaSelecionada === 'todos' || cat.id === categoriaSelecionada)
                  .map(cat => {
                    const prods = produtosFiltrados.filter(p => p.categoria_id === cat.id)
                    if (prods.length === 0 && categoriaSelecionada !== 'todos') return null
                    return (
                      <div key={cat.id} style={{ marginBottom: '28px' }}>
                        {/* Header categoria */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 14px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>IMG</span>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#fff' }}>{cat.nome}</span>
                          <span style={{ fontSize: '12px', color: '#6b7280', padding: '2px 8px', backgroundColor: '#2a2a2a', borderRadius: '10px' }}>{prods.length} produtos</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                            <button style={{ width: '52px', height: '28px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600' }}>Editar</button>
                            <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #3a1212', backgroundColor: '#111111', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {/* Grid produtos */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                          {prods.map(produto => (
                            <div
                              key={produto.id}
                              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                            >
                              <div style={{ display: 'flex', padding: '12px', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '6px', backgroundColor: '#2a2a2a', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(produto.foto_url || produto.imagem_url) ? (
                                    <img src={produto.foto_url || produto.imagem_url || ''} alt={produto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <span style={{ fontSize: '12px', color: '#555' }}>#</span>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{produto.nome}</span>
                                    <button style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '16px', padding: '0', flexShrink: 0 }}>X</button>
                                  </div>
                                  <div style={{ color: '#eb0029', fontWeight: '700', fontSize: '14px', marginTop: '4px' }}>{formatarPreco(produto.preco)}</div>
                                </div>
                              </div>
                              <div style={{ padding: '8px 12px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span title={produto.disponivel ? 'Ativo' : 'Inativo'} style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: produto.disponivel ? '#10b981' : '#4b5563', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }} onClick={() => toggleDisponivel(produto.id, produto.disponivel)}></span>
                                <span title="Delivery" style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>D</span>
                                <span title="Mesa" style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>M</span>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                                  <button onClick={() => { setProdutoEditando(produto); setModalAberto(true) }} style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}>Ed</button>
                                  <button onClick={() => excluirProduto(produto.id)} style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #2a2a2a', backgroundColor: '#111111', color: '#ef4444', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                {produtosFiltrados.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    Nenhum produto encontrado
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal novo/editar produto */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{produtoEditando.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setModalAberto(false)} style={{ backgroundColor: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px' }}></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Nome *</label>
                <input type="text" value={produtoEditando.nome || ''} onChange={e => setProdutoEditando(prev => ({ ...prev, nome: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }} placeholder="Nome do produto" />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Categoria</label>
                <select value={produtoEditando.categoria_id || ''} onChange={e => setProdutoEditando(prev => ({ ...prev, categoria_id: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }}>
                  <option value="">Selecionar categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Preo (R$)</label>
                <input type="number" step="0.01" value={produtoEditando.preco || ''} onChange={e => setProdutoEditando(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }} placeholder="0,00" />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Descrio</label>
                <textarea value={produtoEditando.descricao || ''} onChange={e => setProdutoEditando(prev => ({ ...prev, descricao: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' as any }} placeholder="Descrio do produto" />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Imagem do Produto</label>
                <input
                  type="text"
                  value={produtoEditando.foto_url || ''}
                  onChange={e => setProdutoEditando(prev => ({ ...prev, foto_url: e.target.value }))}
                  style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as any }}
                  placeholder="https://... (URL da imagem)"
                />
                {produtoEditando.foto_url && (
                  <img src={produtoEditando.foto_url} alt="preview"
                    style={{ marginTop: '8px', width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2a2a2a' }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#9ca3af' }}>
                  <input type="checkbox" checked={produtoEditando.disponivel !== false} onChange={e => setProdutoEditando(prev => ({ ...prev, disponivel: e.target.checked }))} />
                  Disponvel
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#9ca3af' }}>
                  <input type="checkbox" checked={!!produtoEditando.destaque} onChange={e => setProdutoEditando(prev => ({ ...prev, destaque: e.target.checked }))} />
                  Destaque
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalAberto(false)} style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #2a2a2a', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={salvarProduto} disabled={salvando} style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#eb0029', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CardapioPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>}>
      <CardapioContent />
    </Suspense>
  )
                                }
