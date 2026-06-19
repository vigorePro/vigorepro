'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, RefreshCw, X, Check, User, ChevronDown, Printer, Receipt, Tag } from 'lucide-react'

type Produto = {
  id: string
  nome: string
  preco: number
  preco_promocional?: number
  imagem_url?: string
  categoria_id: string
  descricao?: string
  disponivel: boolean
}

type Categoria = { id: string; nome: string; ordem: number }
type ItemCarrinho = { produto: Produto; quantidade: number; obs?: string }
type Cliente = { id: string; nome: string; telefone?: string }

function PDVContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao' | 'pix'>('dinheiro')
  const [toast, setToast] = useState<{msg: string, show: boolean}>({msg: '', show: false})
  const [desconto, setDesconto] = useState(0)
  const [troco, setTroco] = useState('')
  const [mesa, setMesa] = useState('')
  const [tipo, setTipo] = useState<'mesa' | 'balcao' | 'delivery'>('balcao')
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [dropCliente, setDropCliente] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    const [prodRes, catRes, cliRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('estabelecimento_id', estabelecimentoId).order('nome'),
      supabase.from('categorias').select('*').eq('estabelecimento_id', estabelecimentoId).order('ordem'),
      supabase.from('clientes').select('id,nome,telefone').eq('estabelecimento_id', estabelecimentoId).order('nome').limit(200)
    ])
    if (prodRes.data) setProdutos(prodRes.data)
    if (catRes.data) setCategorias(catRes.data)
    if (cliRes.data) setClientes(cliRes.data)
    setCarregando(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
    const ch = supabase.channel('pdv-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchDados() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [estabelecimentoId, fetchDados])

  const produtosFiltrados = produtos.filter(p => {
    const catOk = categoriaAtiva === 'todos' || p.categoria_id === categoriaAtiva
    const buscaOk = !busca || p.nome.toLowerCase().includes(busca.toLowerCase())
    return catOk && buscaOk
  })

  const adicionarItem = (produto: Produto) => {
    setCarrinho(prev => {
      const existe = prev.find(i => i.produto.id === produto.id)
      if (existe) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
      return [...prev, { produto, quantidade: 1 }]
    })
    setToast({ msg: produto.nome + ' adicionado!', show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 1500)
  }

  const removerItem = (id: string) => setCarrinho(prev => prev.filter(i => i.produto.id !== id))
  const alterarQtd = (id: string, delta: number) => setCarrinho(prev =>
    prev.map(i => i.produto.id === id ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i)
  )

  const subtotal = carrinho.reduce((a, i) => a + (i.produto.preco_promocional || i.produto.preco) * i.quantidade, 0)
  const total = Math.max(0, subtotal - desconto)
  const qtdItens = carrinho.reduce((a, i) => a + i.quantidade, 0)

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente ? c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || (c.telefone || '').includes(buscaCliente) : true
  ).slice(0, 8)

  const finalizarPedido = async () => {
    if (carrinho.length === 0 || enviando) return
    setEnviando(true)
    const itens = carrinho.map(i => ({
      id: i.produto.id,
      nome: i.produto.nome,
      preco: i.produto.preco_promocional || i.produto.preco,
      quantidade: i.quantidade,
      observacao: i.obs
    }))
    const { data, error } = await supabase.from('pedidos').insert({
      estabelecimento_id: estabelecimentoId,
      cliente: clienteSelecionado?.nome || 'Balcão',
      cliente_id: clienteSelecionado?.id || null,
      mesa: mesa || null,
      tipo,
      itens,
      total,
      desconto,
      forma_pagamento: formaPagamento,
      troco: troco ? parseFloat(troco) : null,
      status: 'pendente'
    }).select('numero').single()

    if (!error && data) {
      setNumeroPedido(data.numero || 0)
      setPedidoFinalizado(true)
      setCarrinho([])
      setClienteSelecionado(null)
      setDesconto(0)
      setTroco('')
      setMesa('')
      setBuscaCliente('')
    }
    setEnviando(false)
  }

  const novoPedido = () => { setPedidoFinalizado(false); setNumeroPedido(0) }

  const s = { fontFamily: 'Mulish, sans-serif' }
  const card = { background: '#1a1a1a', border: '1px solid #292929', borderRadius: 8 }

  return (
    <div style={{ ...s, display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden', color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* LADO ESQUERDO - PRODUTOS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #292929' }}>
        
        {/* Barra top */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #292929', display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Categorias */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
            {[{ id: 'todos', nome: 'Todos' }, ...categorias].map(cat => (
              <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)} style={{
                padding: '5px 14px', borderRadius: 16, border: 'none', whiteSpace: 'nowrap',
                background: categoriaAtiva === cat.id ? '#ef4239' : '#2a2a2a',
                color: categoriaAtiva === cat.id ? '#fff' : '#aaa',
                fontSize: 13, fontWeight: categoriaAtiva === cat.id ? 700 : 500, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>{cat.nome}</button>
            ))}
          </div>
          {/* Busca */}
          <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
            <Search size={13} color="#666" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input ref={buscaRef} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
            />
          </div>
          <button onClick={fetchDados} style={{ padding: 7, borderRadius: 8, border: '1px solid #333', background: '#111', color: '#666', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Grid de produtos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {carregando ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {produtosFiltrados.map(produto => {
                const preco = produto.preco_promocional || produto.preco
                const noCarrinho = carrinho.find(i => i.produto.id === produto.id)
                return (
                  <div key={produto.id} onClick={() => adicionarItem(produto)} style={{
                    ...card, cursor: 'pointer', overflow: 'hidden',
                    border: noCarrinho ? '1px solid #ef4239' : '1px solid #292929',
                    transition: 'border-color 0.2s'
                  }}>
                    <div style={{ height: 90, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt={produto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ShoppingCart size={28} color="#333" />
                      )}
                      {noCarrinho && (
                        <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4239', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{noCarrinho.quantidade}</div>
                      )}
                      {produto.preco_promocional && produto.preco_promocional < produto.preco && (
                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#ef4239', color: '#fff', borderRadius: 4, padding: '2px 5px', fontSize: 10, fontWeight: 700 }}>PROMO</div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#e6e6e6', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{produto.nome}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ef4239' }}>R$ {preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #292929', fontSize: 12, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
          <span>{produtosFiltrados.length} produto(s)</span>
          <span>{categorias.length} categoria(s)</span>
        </div>
      </div>

      {/* LADO DIREITO - CARRINHO */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header carrinho */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #292929', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} color="#ef4239" />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Pedido</span>
            {qtdItens > 0 && <span style={{ background: '#ef4239', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{qtdItens}</span>}
          </div>
          {/* Tipo pedido */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['balcao', 'mesa', 'delivery'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)} style={{
                padding: '4px 8px', borderRadius: 6, border: 'none',
                background: tipo === t ? '#ef4239' : '#222', color: tipo === t ? '#fff' : '#666',
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif',
                textTransform: 'capitalize'
              }}>{t === 'balcao' ? 'Balcão' : t === 'mesa' ? 'Mesa' : 'Delivery'}</button>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e1e1e', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <User size={13} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={clienteSelecionado ? clienteSelecionado.nome : buscaCliente}
                onChange={e => { setBuscaCliente(e.target.value); setClienteSelecionado(null); setDropCliente(true) }}
                onFocus={() => setDropCliente(true)}
                placeholder="Selecionar cliente..." readOnly={!!clienteSelecionado}
                style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
              />
            </div>
            {clienteSelecionado && (
              <button onClick={() => { setClienteSelecionado(null); setBuscaCliente('') }} style={{ padding: '7px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#555', cursor: 'pointer' }}>
                <X size={13} />
              </button>
            )}
            {tipo === 'mesa' && (
              <input value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Mesa"
                style={{ width: 60, padding: '7px 8px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', textAlign: 'center', fontFamily: 'Mulish, sans-serif' }}
              />
            )}
          </div>
          {/* Dropdown clientes */}
          {dropCliente && !clienteSelecionado && clientesFiltrados.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 14, right: 14, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
              {clientesFiltrados.map(c => (
                <div key={c.id} onClick={() => { setClienteSelecionado(c); setBuscaCliente(''); setDropCliente(false) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: 13, color: '#e6e6e6' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#252525')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600 }}>{c.nome}</span>
                  {c.telefone && <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>{c.telefone}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista carrinho */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }} onClick={() => setDropCliente(false)}>
          {carrinho.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
              <ShoppingCart size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Carrinho vazio</p>
              <p style={{ fontSize: 12 }}>Clique em um produto para adicionar</p>
            </div>
          ) : carrinho.map(item => {
            const preco = item.produto.preco_promocional || item.produto.preco
            return (
              <div key={item.produto.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 0', borderBottom: '1px solid #1e1e1e' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#e6e6e6' }}>{item.produto.nome}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#ef4239', fontWeight: 600 }}>R$ {(preco * item.quantidade).toFixed(2).replace('.', ',')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => alterarQtd(item.produto.id, -1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #333', background: '#111', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={11} /></button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantidade}</span>
                  <button onClick={() => alterarQtd(item.produto.id, 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#ef4239', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} /></button>
                </div>
                <button onClick={() => removerItem(item.produto.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
              </div>
            )
          })}
        </div>

        {/* Pagamento & Total */}
        {carrinho.length > 0 && (
          <div style={{ borderTop: '1px solid #292929', padding: '12px 14px' }}>
            {/* Desconto */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} color="#666" />
                <span style={{ fontSize: 13, color: '#888' }}>Desconto (R$)</span>
              </div>
              <input value={desconto || ''} onChange={e => setDesconto(parseFloat(e.target.value) || 0)} type="number" min="0"
                style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', textAlign: 'right', fontFamily: 'Mulish, sans-serif' }}
              />
            </div>

            {/* Subtotal */}
            {desconto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#666' }}>
                <span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 18, fontWeight: 800, color: '#fff' }}>
              <span>Total</span><span style={{ color: '#ef4239' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>

            {/* Forma de pagamento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
              {([
                { id: 'dinheiro', label: 'Dinheiro', icon: <Banknote size={16} /> },
                { id: 'cartao', label: 'Cartão', icon: <CreditCard size={16} /> },
                { id: 'pix', label: 'Pix', icon: <QrCode size={16} /> },
              ] as const).map(fp => (
                <button key={fp.id} onClick={() => setFormaPagamento(fp.id)} style={{
                  padding: '8px 4px', borderRadius: 8,
                  border: formaPagamento === fp.id ? '2px solid #ef4239' : '1px solid #333',
                  background: formaPagamento === fp.id ? '#281615' : '#111',
                  color: formaPagamento === fp.id ? '#ef4239' : '#666',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 600, fontFamily: 'Mulish, sans-serif'
                }}>{fp.icon}{fp.label}</button>
              ))}
            </div>

            {formaPagamento === 'dinheiro' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>Troco para</span>
                <input value={troco} onChange={e => setTroco(e.target.value)} type="number" placeholder="0,00"
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#111', color: '#e6e6e6', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }}
                />
                {troco && parseFloat(troco) > total && <span style={{ fontSize: 12, color: '#22c55e', whiteSpace: 'nowrap' }}>Troco: R$ {(parseFloat(troco) - total).toFixed(2).replace('.', ',')}</span>}
              </div>
            )}

            {/* Botão finalizar */}
            <button onClick={finalizarPedido} disabled={carrinho.length === 0 || enviando} style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
              background: carrinho.length > 0 ? '#ef4239' : '#333',
              color: '#fff', fontWeight: 800, fontSize: 16, cursor: carrinho.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'Mulish, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {enviando ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Receipt size={18} />}
              {enviando ? 'Finalizando...' : 'Finalizar Pedido'}
            </button>
          </div>
        )}
      </div>

      {/* MODAL PEDIDO FINALIZADO */}
      {pedidoFinalizado && (
        <div style={{ position: 'fixed', inset: 0, background: '#000c', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 16, padding: 40, textAlign: 'center', width: 360 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#22c55e22', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={36} color="#22c55e" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#fff', fontWeight: 800 }}>Pedido Finalizado!</h2>
            {numeroPedido > 0 && <p style={{ margin: '0 0 4px', fontSize: 16, color: '#888' }}>Pedido <span style={{ color: '#ef4239', fontWeight: 700 }}>#{numeroPedido}</span> criado com sucesso</p>}
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#555' }}>O pedido foi enviado para a cozinha.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={novoPedido} style={{
                flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                background: '#ef4239', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>Novo Pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
{toast.show && (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
      {toast.msg}
    </div>
  )}
}

export default function PDVPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando PDV...</div>}>
      <PDVContent />
    </Suspense>
  )
}
