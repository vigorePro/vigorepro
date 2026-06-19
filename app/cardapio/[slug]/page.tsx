'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Search, ChevronRight, Plus, Minus, X, MapPin, Clock, Star, Phone, Bike, Package, ArrowLeft, Check, MessageCircle, Send } from 'lucide-react'

type Produto = {
  id: string
  nome: string
  descricao?: string
  preco: number
  preco_promocional?: number
  imagem_url?: string
  categoria_id: string
  ativo: boolean
  disponivel: boolean
}

type Categoria = {
  id: string
  nome: string
  ordem: number
}

type ItemCarrinho = {
  produto: Produto
  quantidade: number
  obs?: string
}

type Estabelecimento = {
  id: string
  nome: string
  logo_url?: string
  cor_primaria?: string
  descricao?: string
  telefone?: string
  cidade?: string
  estado?: string
  aberto: boolean
  tipos_pedido?: string[]
}

function CardapioPublico({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [checkoutAberto, setCheckoutAberto] = useState(false)
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [obsItem, setObsItem] = useState('')
  const [qtdItem, setQtdItem] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  // IA Chat state
  const [chatAberto, setChatAberto] = useState(false)
  const [chatMensagens, setChatMensagens] = useState<{role: 'user'|'assistant', content: string}[]>([
    { role: 'assistant', content: 'Ola! Sou a MEL, assistente virtual da loja. Como posso ajudar? :)' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatCarregando, setChatCarregando] = useState(false)
  const [chatSessionId] = useState(() => 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2,9))
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [tipoEntrega, setTipoEntrega] = useState<'delivery' | 'retirada'>('delivery')
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', endereco: '', pagamento: 'dinheiro', troco: '' })

  const corPrimaria = estabelecimento?.cor_primaria || '#ef4239'

  const fetchDados = useCallback(async () => {
    if (!slug) return
    const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)

    const [prodR, catR] = await Promise.all([
      supabase.from('produtos').select('*').eq('estabelecimento_id', est.id).order('nome'),
      supabase.from('categorias').select('*').eq('estabelecimento_id', est.id).order('ordem')
    ])
    if (prodR.data) setProdutos(prodR.data)
    if (catR.data) setCategorias(catR.data)
    setCarregando(false)
  }, [slug])

  useEffect(() => { fetchDados() }, [fetchDados])

  const produtosFiltrados = produtos.filter(p => {
    const buscaOk = p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.descricao || '').toLowerCase().includes(busca.toLowerCase())
    const catOk = categoriaAtiva === 'todas' || p.categoria_id === categoriaAtiva
    return buscaOk && catOk
  })

  const adicionarCarrinho = (produto: Produto, quantidade: number, obs?: string) => {
    setCarrinho(prev => {
      const existe = prev.find(i => i.produto.id === produto.id)
      if (existe) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade, obs: obs || i.obs } : i)
      return [...prev, { produto, quantidade, obs }]
    })
    setProdutoDetalhe(null)
    setObsItem('')
    setQtdItem(1)
  }

  const removerCarrinho = (id: string) => setCarrinho(prev => prev.filter(i => i.produto.id !== id))
  const alterarQtd = (id: string, delta: number) => setCarrinho(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i).filter(i => i.quantidade > 0))

  const totalCarrinho = carrinho.reduce((a, i) => a + (i.produto.preco_promocional || i.produto.preco) * i.quantidade, 0)
  const qtdCarrinho = carrinho.reduce((a, i) => a + i.quantidade, 0)

  const enviarPedido = async () => {
    if (!estabelecimento || carrinho.length === 0) return
    const itens = carrinho.map(i => ({ id: i.produto.id, nome: i.produto.nome, quantidade: i.quantidade, preco: i.produto.preco_promocional || i.produto.preco, observacao: i.obs }))
    await supabase.from('pedidos').insert({
      estabelecimento_id: estabelecimento.id,
      cliente: formCliente.nome,
      telefone: formCliente.telefone,
      endereco: tipoEntrega === 'delivery' ? formCliente.endereco : 'Retirada no local',
      tipo: tipoEntrega,
      forma_pagamento: formCliente.pagamento,
      troco: formCliente.troco ? parseFloat(formCliente.troco) : null,
      itens,
      total: totalCarrinho,
      status: 'pendente'
    })
    setPedidoEnviado(true)
    setCarrinho([])
  }

  if (carregando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Mulish, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #eee', borderTop: '4px solid ' + corPrimaria, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#888' }}>Carregando cardapio...</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (!estabelecimento) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Mulish, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>🍽️</p>
        <h2 style={{ margin: '0 0 8px' }}>Restaurante nao encontrado</h2>
        <p>O estabelecimento <strong>{slug}</strong> nao existe ou nao esta ativo.</p>
      </div>
    </div>
  )


  const enviarMensagemChat = async () => {
    if (!chatInput.trim() || chatCarregando) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMensagens(prev => [...prev, { role: 'user', content: msg }])
    setChatCarregando(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg, slug: params.slug, sessionId: chatSessionId })
      })
      const data = await res.json()
      setChatMensagens(prev => [...prev, { role: 'assistant', content: data.resposta || 'Desculpe, tente novamente.' }])
    } catch {
      setChatMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    } finally {
      setChatCarregando(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {estabelecimento.logo_url ? (
              <img src={estabelecimento.logo_url} alt="logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: corPrimaria, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
                {estabelecimento.nome.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111' }}>{estabelecimento.nome}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: estabelecimento.aberto !== false ? '#22c55e' : '#ef4444' }} />
                <span style={{ fontSize: 12, color: estabelecimento.aberto !== false ? '#22c55e' : '#ef4444' }}>
                  {estabelecimento.aberto !== false ? 'Aberto agora' : 'Fechado'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setCarrinhoAberto(true)} style={{
            position: 'relative', background: corPrimaria, border: 'none', borderRadius: 8,
            padding: '10px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, fontFamily: 'Mulish, sans-serif'
          }}>
            <ShoppingCart size={18} />
            {qtdCarrinho > 0 && <span style={{ background: '#fff', color: corPrimaria, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{qtdCarrinho}</span>}
            {totalCarrinho > 0 && <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 80px' }}>
        {/* BUSCA */}
        <div style={{ position: 'relative', margin: '16px 0 12px' }}>
          <Search size={16} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no cardapio..."
            style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: 10, border: '1px solid #e0e0e0', background: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
          />
        </div>

        {/* CATEGORIAS */}
        {categorias.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 12px', scrollbarWidth: 'none' }}>
            {[{ id: 'todas', nome: 'Todos' }, ...categorias].map(cat => (
              <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)} style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                background: categoriaAtiva === cat.id ? corPrimaria : '#fff',
                color: categoriaAtiva === cat.id ? '#fff' : '#555',
                fontWeight: categoriaAtiva === cat.id ? 700 : 500, fontSize: 13, cursor: 'pointer',
                fontFamily: 'Mulish, sans-serif', boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}>{cat.nome}</button>
            ))}
          </div>
        )}

        {/* LISTA DE PRODUTOS */}
        {produtosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔍</p>
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {produtosFiltrados.map(produto => (
              <div key={produto.id} onClick={() => { setProdutoDetalhe(produto); setQtdItem(1); setObsItem('') }}
                style={{ background: '#fff', borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: '#111' }}>{produto.nome}</p>
                  {produto.descricao && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888', lineHeight: 1.4 }}>{produto.descricao.substring(0, 80)}{produto.descricao.length > 80 ? '...' : ''}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {produto.preco_promocional && produto.preco_promocional < produto.preco && (
                      <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>R$ {produto.preco.toFixed(2).replace('.', ',')}</span>
                    )}
                    <span style={{ fontSize: 16, fontWeight: 700, color: corPrimaria }}>
                      R$ {(produto.preco_promocional || produto.preco).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
                {produto.imagem_url && (
                  <img src={produto.imagem_url} alt={produto.nome} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <button onClick={e => { e.stopPropagation(); adicionarCarrinho(produto, 1) }} style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: corPrimaria, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}><Plus size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PRODUTO */}
      {produtoDetalhe && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
            {produtoDetalhe.imagem_url && <img src={produtoDetalhe.imagem_url} alt={produtoDetalhe.nome} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />}
            <button onClick={() => setProdutoDetalhe(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#eee', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{produtoDetalhe.nome}</h2>
            {produtoDetalhe.descricao && <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14, lineHeight: 1.5 }}>{produtoDetalhe.descricao}</p>}
            <div style={{ margin: '0 0 16px' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: corPrimaria }}>R$ {(produtoDetalhe.preco_promocional || produtoDetalhe.preco).toFixed(2).replace('.', ',')}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Observacoes (opcional)</label>
              <textarea value={obsItem} onChange={e => setObsItem(e.target.value)} placeholder="Ex: sem cebola, bem passado..."
                rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setQtdItem(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qtdItem}</span>
                <button onClick={() => setQtdItem(q => q + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: corPrimaria, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
              </div>
              <button onClick={() => adicionarCarrinho(produtoDetalhe, qtdItem, obsItem)} style={{
                padding: '12px 24px', background: corPrimaria, border: 'none', borderRadius: 10, color: '#fff',
                fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>Adicionar · R$ {((produtoDetalhe.preco_promocional || produtoDetalhe.preco) * qtdItem).toFixed(2).replace('.', ',')}</button>
            </div>
          </div>
        </div>
      )}

      {/* CARRINHO LATERAL */}
      {carrinhoAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }}>
          <div onClick={() => setCarrinhoAberto(false)} style={{ flex: 1, background: '#000a' }} />
          <div style={{ width: 380, background: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Seu pedido</h2>
              <button onClick={() => setCarrinhoAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
              {carrinho.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <ShoppingCart size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <p>Seu carrinho esta vazio</p>
                </div>
              ) : carrinho.map(item => (
                <div key={item.produto.id} style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14 }}>{item.produto.nome}</p>
                    {item.obs && <p style={{ margin: '0 0 6px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{item.obs}</p>}
                    <p style={{ margin: 0, fontWeight: 700, color: corPrimaria }}>R$ {((item.produto.preco_promocional || item.produto.preco) * item.quantidade).toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => alterarQtd(item.produto.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{item.quantidade}</span>
                    <button onClick={() => alterarQtd(item.produto.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: corPrimaria, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            {carrinho.length > 0 && (
              <div style={{ padding: 20, borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: corPrimaria }}>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                </div>
                <button onClick={() => { setCarrinhoAberto(false); setCheckoutAberto(true) }} style={{
                  width: '100%', padding: '14px 0', background: corPrimaria, border: 'none', borderRadius: 10,
                  color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                }}>Finalizar Pedido</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {checkoutAberto && !pedidoEnviado && (
        <div style={{ position: 'fixed', inset: 0, background: '#f5f5f5', zIndex: 400, overflowY: 'auto' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <button onClick={() => setCheckoutAberto(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontFamily: 'Mulish, sans-serif', marginBottom: 20, fontSize: 14 }}>
              <ArrowLeft size={16} /> Voltar ao cardapio
            </button>
            <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Finalizar Pedido</h2>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Tipo de entrega</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ id: 'delivery', label: 'Delivery', icon: <Bike size={18} /> }, { id: 'retirada', label: 'Retirada', icon: <Package size={18} /> }].map(t => (
                  <button key={t.id} onClick={() => setTipoEntrega(t.id as any)} style={{
                    padding: '12px 0', borderRadius: 10, border: tipoEntrega === t.id ? '2px solid ' + corPrimaria : '2px solid #e0e0e0',
                    background: tipoEntrega === t.id ? corPrimaria + '11' : '#fff', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    color: tipoEntrega === t.id ? corPrimaria : '#555', fontWeight: 600, fontFamily: 'Mulish, sans-serif'
                  }}>{t.icon}<span style={{ fontSize: 13 }}>{t.label}</span></button>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Seus dados</h3>
              {[
                { key: 'nome', label: 'Nome', placeholder: 'Seu nome' },
                { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999' },
                ...(tipoEntrega === 'delivery' ? [{ key: 'endereco', label: 'Endereco', placeholder: 'Rua, numero, bairro' }] : [])
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 6 }}>{f.label}</label>
                  <input value={(formCliente as any)[f.key]} onChange={e => setFormCliente(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Pagamento</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[{ v: 'dinheiro', l: 'Dinheiro' }, { v: 'cartao', l: 'Cartao' }, { v: 'pix', l: 'Pix' }].map(p => (
                  <button key={p.v} onClick={() => setFormCliente(prev => ({ ...prev, pagamento: p.v }))} style={{
                    padding: '8px 16px', borderRadius: 8, border: formCliente.pagamento === p.v ? '2px solid ' + corPrimaria : '2px solid #e0e0e0',
                    background: formCliente.pagamento === p.v ? corPrimaria + '11' : '#fff', cursor: 'pointer',
                    color: formCliente.pagamento === p.v ? corPrimaria : '#555', fontWeight: 600, fontSize: 13, fontFamily: 'Mulish, sans-serif'
                  }}>{p.l}</button>
                ))}
              </div>
              {formCliente.pagamento === 'dinheiro' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Troco para (opcional)</label>
                  <input value={formCliente.troco} onChange={e => setFormCliente(p => ({ ...p, troco: e.target.value }))}
                    placeholder="Ex: 50.00" type="number" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Resumo</h3>
              {carrinho.map(i => (
                <div key={i.produto.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#555' }}>{i.quantidade}x {i.produto.nome}</span>
                  <span style={{ fontWeight: 600 }}>R$ {((i.produto.preco_promocional || i.produto.preco) * i.quantidade).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: corPrimaria }}>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <button onClick={enviarPedido} disabled={!formCliente.nome || !formCliente.telefone} style={{
              width: '100%', padding: '16px 0', background: formCliente.nome && formCliente.telefone ? corPrimaria : '#ccc',
              border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 17,
              cursor: formCliente.nome && formCliente.telefone ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif'
            }}>Confirmar Pedido · R$ {totalCarrinho.toFixed(2).replace('.', ',')}</button>
          </div>
        </div>
      )}

      {/* PEDIDO ENVIADO */}
      {pedidoEnviado && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#22c55e11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={40} color="#22c55e" />
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111' }}>Pedido enviado!</h2>
          <p style={{ margin: 0, color: '#666', textAlign: 'center' }}>Seu pedido foi recebido com sucesso.<br />Em breve entraremos em contato.</p>
          <button onClick={() => { setPedidoEnviado(false); setCheckoutAberto(false) }} style={{
            padding: '12px 32px', background: corPrimaria, border: 'none', borderRadius: 10,
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8, fontFamily: 'Mulish, sans-serif'
          }}>Fazer novo pedido</button>
        </div>
      )}

      {/* CHAT IA FLUTUANTE */}
      <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 999, fontFamily: 'Mulish, sans-serif' }}>
        {chatAberto && (
          <div style={{ position: 'absolute', bottom: 68, right: 0, width: 320, height: 420, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #eee' }}>
            {/* Header */}
            <div style={{ background: corPrimaria, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>M</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>MEL - Assistente IA</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Online agora</div>
                </div>
              </div>
              <button onClick={() => setChatAberto(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMensagens.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: m.role === 'user' ? corPrimaria : '#f3f4f6', color: m.role === 'user' ? '#fff' : '#111',
                    fontSize: 13, lineHeight: 1.5
                  }}>{m.content}</div>
                </div>
              ))}
              {chatCarregando && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#f3f4f6', borderRadius: '12px 12px 12px 2px', padding: '8px 14px', fontSize: 20, color: '#999' }}>...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviarMensagemChat()}
                placeholder="Digite sua mensagem..."
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }}
              />
              <button onClick={enviarMensagemChat} disabled={chatCarregando} style={{ width: 36, height: 36, borderRadius: '50%', background: corPrimaria, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={15} color="#fff" />
              </button>
            </div>
          </div>
        )}
        {/* Toggle button */}
        <button
          onClick={() => setChatAberto(!chatAberto)}
          style={{ width: 56, height: 56, borderRadius: '50%', background: corPrimaria, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', position: 'relative' }}
        >
          {chatAberto ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
          {!chatAberto && chatMensagens.length > 1 && (
            <div style={{ position: 'absolute', top: 0, right: 0, width: 18, height: 18, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{chatMensagens.filter(m => m.role === 'assistant').length}</div>
          )}
        </button>
      </div>
    </div>
  )
}

export default function CardapioPage({ params }: { params: { slug: string } }) {
  return <CardapioPublico params={params} />
}
