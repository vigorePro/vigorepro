'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Plus, Minus, X, ArrowLeft, Check, MessageCircle, Send, MapPin, Star, ChevronDown, Home, Tag, ClipboardList, User } from 'lucide-react'

type Produto = {
  id: string; nome: string; descricao?: string; preco: number
  preco_promocional?: number; imagem_url?: string; categoria_id: string
  ativo: boolean; disponivel: boolean
}
type Categoria = { id: string; nome: string; ordem: number }
type ItemCarrinho = { produto: Produto; quantidade: number; obs?: string }
type Estabelecimento = {
  id: string; nome: string; logo_url?: string; cor_primaria?: string
  descricao?: string; telefone?: string; cidade?: string; estado?: string
  endereco?: string; aberto: boolean; tipos_pedido?: string[]
}

function CardapioPublico({ params }: { params: { slug: string } }) {
  const slug = params.slug
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [obsItem, setObsItem] = useState('')
  const [qtdItem, setQtdItem] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [isLogado, setIsLogado] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'cardapio'|'promocoes'|'pedidos'|'perfil'>('cardapio')
  const [chatAberto, setChatAberto] = useState(false)
  const [chatMensagens, setChatMensagens] = useState<{role:'user'|'assistant',content:string}[]>([
    { role: 'assistant', content: 'Olá! Sou a MEL, assistente virtual da loja. Como posso ajudar? :)' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatCarregando, setChatCarregando] = useState(false)
  const [chatSessionId] = useState(() => 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2,9))
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const cor = estabelecimento?.cor_primaria || '#e53935'

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setIsLogado(!!session) })
  }, [])
  useEffect(() => { fetchDados() }, [fetchDados])

  const produtosFiltrados = produtos.filter(p => {
    const buscaOk = p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.descricao || '').toLowerCase().includes(busca.toLowerCase())
    const catOk = categoriaAtiva === 'todas' || p.categoria_id === categoriaAtiva
    return buscaOk && catOk && p.disponivel
  })

  const categoriaAtivaObj = categorias.find(c => c.id === categoriaAtiva)
  const nomeCategoria = categoriaAtiva === 'todas' ? 'Todos' : (categoriaAtivaObj?.nome || 'Todos')

  const adicionarCarrinho = (produto: Produto, quantidade: number, obs?: string) => {
    setCarrinho(prev => {
      const existe = prev.find(i => i.produto.id === produto.id)
      if (existe) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i)
      return [...prev, { produto, quantidade, obs }]
    })
    setProdutoDetalhe(null); setObsItem(''); setQtdItem(1)
  }
  const removerCarrinho = (id: string) => setCarrinho(prev => prev.filter(i => i.produto.id !== id))
  const alterarQtd = (id: string, delta: number) => setCarrinho(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i).filter(i => i.quantidade > 0))
  const totalCarrinho = carrinho.reduce((a, i) => a + (i.produto.preco_promocional || i.produto.preco) * i.quantidade, 0)
  const qtdCarrinho = carrinho.reduce((a, i) => a + i.quantidade, 0)

  const enviarMensagemChat = async (mensagemOverride?: string) => {
    const msg = mensagemOverride || chatInput.trim()
    if (!msg || chatCarregando) return
    if (!mensagemOverride) setChatInput('')
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
      if (data.pedidoCriado) { setCarrinho([]); setPedidoFinalizado(true) }
    } catch {
      setChatMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    } finally {
      setChatCarregando(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const finalizarComWpp = () => {
    if (carrinho.length === 0) return
    const itensTexto = carrinho.map(i => `• ${i.quantidade}x ${i.produto.nome} - R$ ${((i.produto.preco_promocional || i.produto.preco) * i.quantidade).toFixed(2).replace('.', ',')}${i.obs ? ` (obs: ${i.obs})` : ''}`).join('%0A')
    const frete = totalCarrinho < 50 ? 10 : totalCarrinho < 100 ? 5 : 0
    const total = (totalCarrinho + frete).toFixed(2).replace('.', ',')
    const freteTexto = frete === 0 ? 'Gratis' : `R$ ${frete.toFixed(2).replace('.', ',')}`
    const msg = `Olá! Vim pelo cardápio e quero finalizar meu pedido%0A%0AItens:%0A${itensTexto}%0A%0ASubtotal: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}%0AEntrega: ${freteTexto}%0ATotal: R$ ${total}`
    window.open(`https://wa.me/5543936181082?text=${msg}`, '_blank')
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f5f5f5!important;font-family:'Mulish',sans-serif!important}

    /* HEADER BANNER */
    .bee-banner{height:90px;position:relative;overflow:visible}
    .bee-banner-bg{height:90px;width:100%;display:block}

    /* LOGO */
    .bee-logo-wrap{position:absolute;left:20px;top:10px;width:130px;height:130px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.15);overflow:hidden;z-index:10;display:flex;align-items:center;justify-content:center}
    .bee-logo-wrap img{width:100%;height:100%;object-fit:cover}
    .bee-logo-initial{font-size:48px;font-weight:800;color:var(--cor)}

    /* RATING TOP RIGHT */
    .bee-rating-top{position:absolute;top:10px;right:16px;background:rgba(0,0,0,.45);border-radius:20px;padding:5px 12px;display:flex;align-items:center;gap:5px;color:#fff;font-size:14px;font-weight:700}

    /* INFO SECTION */
    .bee-info{background:#fff;padding:16px 20px 14px 170px;border-bottom:1px solid #eee;min-height:80px}
    .bee-nome{font-size:22px;font-weight:800;color:#222;display:flex;align-items:center;gap:10px}
    .bee-stars{display:flex;align-items:center;gap:4px;color:#f59e0b;font-size:13px;font-weight:700}
    .bee-meta{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:13px;color:#555;flex-wrap:wrap}
    .bee-aberto{color:#22c55e;font-weight:700}
    .bee-fechado{color:#ef4444;font-weight:700}
    .bee-sep{color:#ccc}
    .bee-mais{color:var(--cor);font-weight:700;cursor:pointer;text-decoration:underline}

    /* FILTROS */
    .bee-filtros{background:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #eee;position:sticky;top:0;z-index:50}
    .bee-dropdown-wrap{position:relative;flex:0 0 auto}
    .bee-dropdown-btn{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px solid #ddd;border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:#333;cursor:pointer;font-family:inherit;min-width:160px;justify-content:space-between}
    .bee-dropdown-label{font-size:11px;color:#999;position:absolute;top:-8px;left:10px;background:#fff;padding:0 4px}
    .bee-dropdown-menu{position:absolute;top:calc(100% + 4px);left:0;min-width:100%;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:200;overflow:hidden}
    .bee-dropdown-item{padding:10px 16px;font-size:13px;font-weight:500;cursor:pointer;color:#333;transition:background .15s}
    .bee-dropdown-item:hover{background:#f5f5f5}
    .bee-dropdown-item.on{color:var(--cor);font-weight:700}
    .bee-search-wrap{flex:1;position:relative}
    .bee-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#aaa;pointer-events:none}
    .bee-search-input{width:100%;padding:10px 14px 10px 38px;border:1.5px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;color:#333;outline:none;transition:border-color .15s}
    .bee-search-input:focus{border-color:var(--cor)}
    .bee-search-input::placeholder{color:#bbb}

    /* CONTEUDO */
    .bee-main{padding:20px 20px 80px;max-width:1100px;margin:0 auto}
    .bee-section-title{font-size:16px;font-weight:800;color:#222;margin-bottom:14px}

    /* GRID 2 COLUNAS */
    .bee-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
    @media(max-width:600px){.bee-grid{grid-template-columns:1fr}}

    .bee-card{background:#fff;border-radius:10px;overflow:hidden;display:flex;align-items:stretch;cursor:pointer;border:1px solid #eee;transition:box-shadow .2s;min-height:110px}
    .bee-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.10)}
    .bee-card-txt{flex:1;padding:14px 12px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
    .bee-card-nome{font-size:14px;font-weight:700;color:#111;line-height:1.3;margin-bottom:4px}
    .bee-card-desc{font-size:12px;color:#888;line-height:1.4;margin-bottom:8px;flex:1}
    .bee-card-preco{font-size:14px;font-weight:700;color:#333}
    .bee-card-img{width:110px;height:110px;object-fit:cover;flex-shrink:0;border-radius:0 10px 10px 0}
    .bee-card-img-placeholder{width:110px;height:110px;background:#f3f4f6;flex-shrink:0;border-radius:0 10px 10px 0;display:flex;align-items:center;justify-content:center;font-size:28px}

    /* FOOTER */
    .bee-footer{background:var(--cor);color:#fff;padding:16px 20px;font-size:12px;text-align:left}
    .bee-footer-nome{font-weight:700;margin-bottom:4px;font-size:13px}
    .bee-footer-end{opacity:.85}

    /* BOTTOM NAV */
    .bee-bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #eee;display:flex;z-index:100;height:60px}
    .bee-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:none;background:none;font-family:inherit;color:#aaa;font-size:10px;font-weight:600;transition:color .15s}
    .bee-nav-item.on{color:var(--cor)}
    .bee-nav-icon{font-size:20px}

    /* CARRINHO */
    .bee-cart-btn{position:fixed;top:12px;right:16px;background:var(--cor);border:none;border-radius:20px;padding:8px 16px;color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,.2)}
    .bee-cart-badge{background:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--cor)}
  `

  if (carregando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f5',fontFamily:'Mulish,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'4px solid #eee',borderTop:'4px solid '+cor,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:'#888'}}>Indo até a cozinha...</p>
        <p style={{color:'#bbb',fontSize:13}}>Estamos quase lá</p>
        <style>{'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  )

  if (!estabelecimento) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f5',fontFamily:'Mulish,sans-serif'}}>
      <div style={{textAlign:'center',color:'#888'}}>
        <h2 style={{margin:'0 0 8px'}}>Restaurante não encontrado</h2>
        <p>O estabelecimento <strong>{slug}</strong> não existe.</p>
      </div>
    </div>
  )

  return (
    <div style={{'--cor':cor} as React.CSSProperties}>
      <style>{css}</style>

      {/* BANNER HEADER */}
      <div className="bee-banner">
        <div className="bee-banner-bg" style={{background:cor}}/>
        {/* LOGO SOBREPOSTO */}
        <div className="bee-logo-wrap">
          {estabelecimento.logo_url
            ? <img src={estabelecimento.logo_url} alt="logo"/>
            : <span className="bee-logo-initial">{estabelecimento.nome.charAt(0)}</span>}
        </div>
        {/* RATING NO CANTO */}
        <div className="bee-rating-top">
          <Star size={13} fill="#f59e0b" color="#f59e0b"/>
          <span>5.0</span>
        </div>
        {/* BOTÃO CARRINHO */}
        {qtdCarrinho > 0 && (
          <button className="bee-cart-btn" onClick={()=>setCarrinhoAberto(true)}>
            <ShoppingCart size={16}/>
            <span className="bee-cart-badge">{qtdCarrinho}</span>
            R$ {totalCarrinho.toFixed(2).replace('.',',')}
          </button>
        )}
      </div>

      {/* INFO DO ESTABELECIMENTO */}
      <div className="bee-info">
        {isLogado && (
          <a href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:4,color:'#666',textDecoration:'none',fontSize:12,fontWeight:600,padding:'3px 8px',borderRadius:6,background:'#f3f4f6',border:'1px solid #e5e7eb',marginBottom:8}}>
            <ArrowLeft size={12}/> Dashboard
          </a>
        )}
        <div className="bee-nome">
          {estabelecimento.nome}
          <div className="bee-stars">
            <Star size={14} fill="#f59e0b" color="#f59e0b"/>
            <span>5.0</span>
          </div>
        </div>
        <div className="bee-meta">
          <span className={estabelecimento.aberto !== false ? 'bee-aberto' : 'bee-fechado'}>
            {estabelecimento.aberto !== false ? 'Aberto até 23:59' : 'Fechado'}
          </span>
          {(estabelecimento.cidade || estabelecimento.estado) && (
            <>
              <span className="bee-sep">•</span>
              <MapPin size={12}/>
              <span>{[estabelecimento.cidade, estabelecimento.estado].filter(Boolean).join(' - ')}</span>
            </>
          )}
          <span className="bee-sep">•</span>
          <span className="bee-mais">Mais informações</span>
        </div>
      </div>

      {/* FILTROS: DROPDOWN + BUSCA */}
      <div className="bee-filtros">
        <div className="bee-dropdown-wrap">
          <span className="bee-dropdown-label">Lista de categorias</span>
          <button className="bee-dropdown-btn" onClick={()=>setDropdownAberto(!dropdownAberto)}>
            <span>{nomeCategoria}</span>
            <ChevronDown size={14} style={{transform:dropdownAberto?'rotate(180deg)':'none',transition:'transform .2s'}}/>
          </button>
          {dropdownAberto && (
            <div className="bee-dropdown-menu">
              {[{id:'todas',nome:'Todos'},...categorias].map(cat=>(
                <div key={cat.id} className={'bee-dropdown-item'+(categoriaAtiva===cat.id?' on':'')}
                  onClick={()=>{setCategoriaAtiva(cat.id);setDropdownAberto(false)}}>
                  {cat.nome}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bee-search-wrap">
          <svg className="bee-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="bee-search-input" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Busque por um produto"/>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="bee-main" onClick={()=>dropdownAberto&&setDropdownAberto(false)}>
        {produtosFiltrados.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#aaa'}}>
            <div style={{fontSize:40,marginBottom:10}}>🍽️</div>
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            {/* Título da seção */}
            {categorias.filter(c => categoriaAtiva === 'todas' || c.id === categoriaAtiva).map(cat => {
              const prods = produtosFiltrados.filter(p => p.categoria_id === cat.id)
              if (prods.length === 0) return null
              return (
                <div key={cat.id}>
                  <div className="bee-section-title">{cat.nome}</div>
                  <div className="bee-grid">
                    {prods.map(produto=>(
                      <div key={produto.id} className="bee-card" onClick={()=>{setProdutoDetalhe(produto);setQtdItem(1);setObsItem('')}}>
                        <div className="bee-card-txt">
                          <div>
                            <div className="bee-card-nome">{produto.nome}</div>
                            {produto.descricao && <div className="bee-card-desc">{produto.descricao.substring(0,60)}{produto.descricao.length>60?'...':''}</div>}
                          </div>
                          <div className="bee-card-preco">R$ {(produto.preco_promocional||produto.preco).toFixed(2).replace('.',',')}</div>
                        </div>
                        {produto.imagem_url
                          ? <img className="bee-card-img" src={produto.imagem_url} alt={produto.nome}/>
                          : <div className="bee-card-img-placeholder">🍽️</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {/* Produtos sem categoria */}
            {(() => {
              const semCat = produtosFiltrados.filter(p => !categorias.find(c => c.id === p.categoria_id))
              if (semCat.length === 0) return null
              return (
                <div>
                  <div className="bee-section-title">Outros</div>
                  <div className="bee-grid">
                    {semCat.map(produto=>(
                      <div key={produto.id} className="bee-card" onClick={()=>{setProdutoDetalhe(produto);setQtdItem(1);setObsItem('')}}>
                        <div className="bee-card-txt">
                          <div>
                            <div className="bee-card-nome">{produto.nome}</div>
                            {produto.descricao && <div className="bee-card-desc">{produto.descricao.substring(0,60)}{produto.descricao.length>60?'...':''}</div>}
                          </div>
                          <div className="bee-card-preco">R$ {(produto.preco_promocional||produto.preco).toFixed(2).replace('.',',')}</div>
                        </div>
                        {produto.imagem_url
                          ? <img className="bee-card-img" src={produto.imagem_url} alt={produto.nome}/>
                          : <div className="bee-card-img-placeholder">🍽️</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="bee-footer">
        <div className="bee-footer-nome">{estabelecimento.nome} - {[estabelecimento.cidade, estabelecimento.estado].filter(Boolean).join(' - ')} - 2026. Todos os direitos reservados</div>
        {estabelecimento.endereco && <div className="bee-footer-end">{estabelecimento.endereco}{estabelecimento.telefone ? ` | ${estabelecimento.telefone}` : ''}</div>}
      </div>

      {/* BOTTOM NAV */}
      <nav className="bee-bottom-nav">
        <button className={'bee-nav-item'+(abaAtiva==='cardapio'?' on':'')} onClick={()=>setAbaAtiva('cardapio')}>
          <Home size={20}/>
          <span>Cardápio</span>
        </button>
        <button className={'bee-nav-item'+(abaAtiva==='promocoes'?' on':'')} onClick={()=>setAbaAtiva('promocoes')}>
          <Tag size={20}/>
          <span>Promoções</span>
        </button>
        <button className={'bee-nav-item'+(abaAtiva==='pedidos'?' on':'')} onClick={()=>setAbaAtiva('pedidos')}>
          <ClipboardList size={20}/>
          <span>Pedidos</span>
        </button>
        <button className={'bee-nav-item'+(abaAtiva==='perfil'?' on':'')} onClick={()=>setAbaAtiva('perfil')}>
          <User size={20}/>
          <span>Perfil</span>
        </button>
      </nav>

      {/* MODAL PRODUTO */}
      {produtoDetalhe&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:700,maxHeight:'90vh',overflowY:'auto',padding:24,position:'relative'}}>
            {produtoDetalhe.imagem_url&&<img src={produtoDetalhe.imagem_url} alt={produtoDetalhe.nome} style={{width:'100%',height:200,objectFit:'cover',borderRadius:12,marginBottom:16}}/>}
            <button onClick={()=>setProdutoDetalhe(null)} style={{position:'absolute',top:16,right:16,background:'#eee',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
            <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:700}}>{produtoDetalhe.nome}</h2>
            {produtoDetalhe.descricao&&<p style={{margin:'0 0 16px',color:'#666',fontSize:14,lineHeight:1.5}}>{produtoDetalhe.descricao}</p>}
            <span style={{fontSize:22,fontWeight:800,color:cor,display:'block',marginBottom:16}}>R$ {(produtoDetalhe.preco_promocional||produtoDetalhe.preco).toFixed(2).replace('.',',')}</span>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,color:'#555',display:'block',marginBottom:6}}>Observações (opcional)</label>
              <textarea value={obsItem} onChange={e=>setObsItem(e.target.value)} placeholder="Ex: sem cebola..." rows={2} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:14,outline:'none',resize:'none',fontFamily:'Mulish,sans-serif',boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>setQtdItem(q=>Math.max(1,q-1))} style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e0e0e0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                <span style={{fontSize:18,fontWeight:700}}>{qtdItem}</span>
                <button onClick={()=>setQtdItem(q=>q+1)} style={{width:36,height:36,borderRadius:'50%',border:'none',background:cor,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
              </div>
              <button onClick={()=>adicionarCarrinho(produtoDetalhe,qtdItem,obsItem)} style={{padding:'12px 24px',background:cor,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'Mulish,sans-serif'}}>
                Adicionar · R$ {((produtoDetalhe.preco_promocional||produtoDetalhe.preco)*qtdItem).toFixed(2).replace('.',',')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRINHO LATERAL */}
      {carrinhoAberto&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex'}}>
          <div onClick={()=>setCarrinhoAberto(false)} style={{flex:1,background:'rgba(0,0,0,.6)'}}/>
          <div style={{width:380,background:'#fff',display:'flex',flexDirection:'column',height:'100vh'}}>
            <div style={{padding:'20px 20px 16px',borderBottom:'1px solid #eee',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Seu pedido</h2>
              <button onClick={()=>setCarrinhoAberto(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#666'}}><X size={20}/></button>
            </div>
            <div style={{flex:1,padding:20,overflowY:'auto'}}>
              {carrinho.length===0?(
                <div style={{textAlign:'center',padding:40,color:'#aaa'}}>
                  <ShoppingCart size={48} style={{marginBottom:12,opacity:0.3}}/>
                  <p>Seu carrinho está vazio</p>
                </div>
              ):carrinho.map(item=>(
                <div key={item.produto.id} style={{display:'flex',gap:12,marginBottom:16,paddingBottom:16,borderBottom:'1px solid #f0f0f0'}}>
                  <div style={{flex:1}}>
                    <p style={{margin:'0 0 2px',fontWeight:600,fontSize:14}}>{item.produto.nome}</p>
                    {item.obs&&<p style={{margin:'0 0 6px',fontSize:12,color:'#888',fontStyle:'italic'}}>{item.obs}</p>}
                    <p style={{margin:0,fontWeight:700,color:cor}}>R$ {((item.produto.preco_promocional||item.produto.preco)*item.quantidade).toFixed(2).replace('.',',')}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>alterarQtd(item.produto.id,-1)} style={{width:28,height:28,borderRadius:'50%',border:'1px solid #e0e0e0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={12}/></button>
                    <span style={{fontSize:14,fontWeight:700}}>{item.quantidade}</span>
                    <button onClick={()=>alterarQtd(item.produto.id,1)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:cor,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={12}/></button>
                    <button onClick={()=>removerCarrinho(item.produto.id)} style={{width:28,height:28,borderRadius:'50%',border:'none',background:'#fee2e2',color:'#ef4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
            {carrinho.length>0&&(
              <div style={{padding:20,borderTop:'1px solid #eee'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:14,color:'#666'}}>
                  <span>Subtotal</span><span>R$ {totalCarrinho.toFixed(2).replace('.',',')}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,fontSize:14,color:'#666'}}>
                  <span>Entrega</span>
                  <span style={{color:totalCarrinho>=100?'#22c55e':'#555'}}>
                    {totalCarrinho<50?'R$ 10,00':totalCarrinho<100?'R$ 5,00':'Grátis!'}
                  </span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,fontSize:17,fontWeight:800}}>
                  <span>Total</span>
                  <span style={{color:cor}}>R$ {(totalCarrinho+(totalCarrinho<50?10:totalCarrinho<100?5:0)).toFixed(2).replace('.',',')}</span>
                </div>
                <button onClick={finalizarComWpp} style={{width:'100%',padding:'14px 0',background:'#25D366',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer',fontFamily:'Mulish,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.
