'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Search, Plus, Minus, X, ArrowLeft, Check, MessageCircle, Send } from 'lucide-react'

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
  aberto: boolean; tipos_pedido?: string[]
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
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [obsItem, setObsItem] = useState('')
  const [qtdItem, setQtdItem] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [isLogado, setIsLogado] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)
  const [chatMensagens, setChatMensagens] = useState<{role:'user'|'assistant',content:string}[]>([
    { role: 'assistant', content: 'Ola! Sou a MEL, assistente virtual da loja. Como posso ajudar? :)' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatCarregando, setChatCarregando] = useState(false)
  const [chatSessionId] = useState(() => 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2,9))
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const cor = estabelecimento?.cor_primaria || '#C8956C'

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
    const msg = `Ola! Vim pelo cardapio e quero finalizar meu pedido%0A%0AItens:%0A${itensTexto}%0A%0ASubtotal: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}%0AEntrega: ${freteTexto}%0ATotal: R$ ${total}`
    window.open(`https://wa.me/5543936181082?text=${msg}`, '_blank')
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box}
    body{background:#f4f5f7!important;font-family:'Jost','Mulish',sans-serif!important;margin:0}
    .bf-header{background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .bf-header-inner{max-width:860px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}
    .bf-left{display:flex;align-items:center;gap:12px}
    .bf-logo{width:46px;height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;flex-shrink:0;overflow:hidden}
    .bf-logo img{width:100%;height:100%;object-fit:cover}
    .bf-nome{margin:0;font-size:17px;font-weight:700;color:#111;line-height:1.2}
    .bf-status{display:flex;align-items:center;gap:5px;margin-top:2px}
    .bf-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
    .bf-stxt{font-size:12px;font-weight:500}
    .bf-cart{border:none;border-radius:10px;padding:10px 18px;color:#fff;cursor:pointer;display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;font-family:inherit;transition:opacity .15s}
    .bf-cart:hover{opacity:.88}
    .bf-badge{background:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
    .bf-main{max-width:860px;margin:0 auto;padding:0 20px 100px}
    .bf-search{position:relative;margin:16px 0 8px}
    .bf-sicon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#bbb;pointer-events:none}
    .bf-sinput{width:100%;padding:12px 14px 12px 42px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;outline:none;font-family:inherit;color:#333;transition:border-color .15s}
    .bf-sinput:focus{border-color:var(--cor)}
    .bf-sinput::placeholder{color:#aaa}
    .bf-cats{display:flex;gap:8px;overflow-x:auto;padding:8px 0 14px;scrollbar-width:none}
    .bf-cats::-webkit-scrollbar{display:none}
    .bf-cat{white-space:nowrap;padding:7px 18px;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid #e0e0e0;background:#fff;color:#555;font-family:inherit;flex-shrink:0;transition:all .15s}
    .bf-cat:hover{border-color:var(--cor);color:var(--cor)}
    .bf-cat.on{border-color:transparent!important;color:#fff!important;font-weight:700}
    .bf-list{display:flex;flex-direction:column;gap:12px}
    .bf-card{background:#fff;border-radius:14px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);cursor:pointer;transition:box-shadow .2s}
    .bf-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.10)}
    .bf-ctxt{flex:1;min-width:0}
    .bf-cnome{margin:0 0 4px;font-size:16px;font-weight:700;color:#111;line-height:1.3}
    .bf-cdesc{margin:0 0 8px;font-size:13px;color:#888;line-height:1.4}
    .bf-cpreco{font-size:15px;font-weight:700}
    .bf-cimg{width:82px;height:82px;border-radius:10px;object-fit:cover;flex-shrink:0}
    .bf-plus{width:36px;height:36px;border-radius:50%;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.15);transition:opacity .15s}
    .bf-plus:hover{opacity:.85}
    .bf-empty{text-align:center;padding:60px 20px;color:#aaa}
  `

  if (carregando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f5f7',fontFamily:'Jost,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'4px solid #eee',borderTop:'4px solid '+cor,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:'#888'}}>Carregando cardapio...</p>
        <style>{'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  )

  if (!estabelecimento) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f4f5f7',fontFamily:'Jost,sans-serif'}}>
      <div style={{textAlign:'center',color:'#888'}}>
        <h2 style={{margin:'0 0 8px'}}>Restaurante nao encontrado</h2>
        <p>O estabelecimento <strong>{slug}</strong> nao existe.</p>
      </div>
    </div>
  )

  return (
    <div style={{'--cor':cor} as React.CSSProperties}>
      <style>{css}</style>

      {/* HEADER */}
      <div className="bf-header">
        <div className="bf-header-inner">
          <div className="bf-left">
            {isLogado && (
              <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:4,color:'#666',textDecoration:'none',fontSize:13,fontWeight:600,padding:'4px 8px',borderRadius:6,background:'#f3f4f6',border:'1px solid #e5e7eb'}}>
                <ArrowLeft size={14}/> Dashboard
              </a>
            )}
            <div className="bf-logo" style={{background:cor}}>
              {estabelecimento.logo_url
                ? <img src={estabelecimento.logo_url} alt="logo"/>
                : estabelecimento.nome.charAt(0)}
            </div>
            <div>
              <h1 className="bf-nome">{estabelecimento.nome}</h1>
              <div className="bf-status">
                <div className="bf-dot" style={{background:estabelecimento.aberto!==false?'#22c55e':'#ef4444'}}/>
                <span className="bf-stxt" style={{color:estabelecimento.aberto!==false?'#22c55e':'#ef4444'}}>
                  {estabelecimento.aberto!==false?'Aberto agora':'Fechado'}
                </span>
              </div>
            </div>
          </div>
          <button className="bf-cart" style={{background:cor}} onClick={()=>setCarrinhoAberto(true)}>
            <ShoppingCart size={18}/>
            {qtdCarrinho>0&&<span className="bf-badge" style={{color:cor}}>{qtdCarrinho}</span>}
            {totalCarrinho>0&&<span>R$ {totalCarrinho.toFixed(2).replace('.',',')}</span>}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="bf-main">
        {/* BUSCA */}
        <div className="bf-search">
          <Search className="bf-sicon" size={16}/>
          <input className="bf-sinput" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar no cardapio..."/>
        </div>

        {/* CATEGORIAS */}
        {categorias.length>0&&(
          <div className="bf-cats">
            {[{id:'todas',nome:'Todos'},...categorias].map(cat=>(
              <button key={cat.id} className={'bf-cat'+(categoriaAtiva===cat.id?' on':'')}
                style={categoriaAtiva===cat.id?{background:cor}:{}}
                onClick={()=>setCategoriaAtiva(cat.id)}>
                {cat.nome}
              </button>
            ))}
          </div>
        )}

        {/* PRODUTOS */}
        {produtosFiltrados.length===0?(
          <div className="bf-empty">
            <div style={{fontSize:40,marginBottom:10}}>🍽️</div>
            <p>Nenhum produto encontrado</p>
          </div>
        ):(
          <div className="bf-list">
            {produtosFiltrados.map(produto=>(
              <div key={produto.id} className="bf-card" onClick={()=>{setProdutoDetalhe(produto);setQtdItem(1);setObsItem('')}}>
                <div className="bf-ctxt">
                  <p className="bf-cnome">{produto.nome}</p>
                  {produto.descricao&&<p className="bf-cdesc">{produto.descricao.substring(0,80)}{produto.descricao.length>80?'...':''}</p>}
                  <span className="bf-cpreco" style={{color:cor}}>R$ {(produto.preco_promocional||produto.preco).toFixed(2).replace('.',',')}</span>
                </div>
                {produto.imagem_url&&<img className="bf-cimg" src={produto.imagem_url} alt={produto.nome}/>}
                <button className="bf-plus" style={{background:cor}} onClick={e=>{e.stopPropagation();adicionarCarrinho(produto,1)}}>
                  <Plus size={16}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PRODUTO */}
      {produtoDetalhe&&(
        <div style={{position:'fixed',inset:0,background:'#000a',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',width:'100%',maxWidth:860,maxHeight:'90vh',overflowY:'auto',padding:24,position:'relative'}}>
            {produtoDetalhe.imagem_url&&<img src={produtoDetalhe.imagem_url} alt={produtoDetalhe.nome} style={{width:'100%',height:200,objectFit:'cover',borderRadius:12,marginBottom:16}}/>}
            <button onClick={()=>setProdutoDetalhe(null)} style={{position:'absolute',top:16,right:16,background:'#eee',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
            <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:700}}>{produtoDetalhe.nome}</h2>
            {produtoDetalhe.descricao&&<p style={{margin:'0 0 16px',color:'#666',fontSize:14,lineHeight:1.5}}>{produtoDetalhe.descricao}</p>}
            <span style={{fontSize:22,fontWeight:800,color:cor,display:'block',marginBottom:16}}>R$ {(produtoDetalhe.preco_promocional||produtoDetalhe.preco).toFixed(2).replace('.',',')}</span>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,fontWeight:600,color:'#555',display:'block',marginBottom:6}}>Observacoes (opcional)</label>
              <textarea value={obsItem} onChange={e=>setObsItem(e.target.value)} placeholder="Ex: sem cebola..." rows={2} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e0e0e0',fontSize:14,outline:'none',resize:'none',fontFamily:'Jost,sans-serif',boxSizing:'border-box'}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button onClick={()=>setQtdItem(q=>Math.max(1,q-1))} style={{width:36,height:36,borderRadius:'50%',border:'1px solid #e0e0e0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Minus size={14}/></button>
                <span style={{fontSize:18,fontWeight:700}}>{qtdItem}</span>
                <button onClick={()=>setQtdItem(q=>q+1)} style={{width:36,height:36,borderRadius:'50%',border:'none',background:cor,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Plus size={14}/></button>
              </div>
              <button onClick={()=>adicionarCarrinho(produtoDetalhe,qtdItem,obsItem)} style={{padding:'12px 24px',background:cor,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'Jost,sans-serif'}}>
                Adicionar · R$ {((produtoDetalhe.preco_promocional||produtoDetalhe.preco)*qtdItem).toFixed(2).replace('.',',')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRINHO */}
      {carrinhoAberto&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex'}}>
          <div onClick={()=>setCarrinhoAberto(false)} style={{flex:1,background:'#000a'}}/>
          <div style={{width:380,background:'#fff',display:'flex',flexDirection:'column',height:'100vh'}}>
            <div style={{padding:'20px 20px 16px',borderBottom:'1px solid #eee',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Seu pedido</h2>
              <button onClick={()=>setCarrinhoAberto(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#666'}}><X size={20}/></button>
            </div>
            <div style={{flex:1,padding:20,overflowY:'auto'}}>
              {carrinho.length===0?(
                <div style={{textAlign:'center',padding:40,color:'#aaa'}}>
                  <ShoppingCart size={48} style={{marginBottom:12,opacity:0.3}}/>
                  <p>Seu carrinho esta vazio</p>
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
                    {totalCarrinho<50?'R$ 10,00':totalCarrinho<100?'R$ 5,00':'Gratis!'}
                  </span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,fontSize:17,fontWeight:800}}>
                  <span>Total</span>
                  <span style={{color:cor}}>R$ {(totalCarrinho+(totalCarrinho<50?10:totalCarrinho<100?5:0)).toFixed(2).replace('.',',')}</span>
                </div>
                <button onClick={finalizarComWpp} style={{width:'100%',padding:'14px 0',background:'#25D366',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer',fontFamily:'Jost,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Finalizar via WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PEDIDO FINALIZADO */}
      {pedidoFinalizado&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:20,padding:40,maxWidth:340,textAlign:'center',fontFamily:'Jost,sans-serif'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><Check size={40} color="#22c55e"/></div>
            <h2 style={{margin:'0 0 10px',fontSize:22,fontWeight:800}}>Pedido confirmado!</h2>
            <p style={{margin:'0 0 24px',color:'#666',fontSize:14,lineHeight:1.6}}>Seu pedido foi registrado. Em breve entraremos em contato!</p>
            <button onClick={()=>{setPedidoFinalizado(false);setChatAberto(false)}} style={{padding:'12px 32px',background:cor,border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',fontFamily:'Jost,sans-serif'}}>Fazer novo pedido</button>
          </div>
        </div>
      )}

      {/* CHAT MEL */}
      <div style={{position:'fixed',bottom:24,right:20,zIndex:999,fontFamily:'Jost,sans-serif'}}>
        {chatAberto&&(
          <div style={{position:'absolute',bottom:72,right:0,width:340,height:480,background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,.18)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid #eee'}}>
            <div style={{background:cor,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:15}}>M</div>
                <div>
                  <div style={{color:'#fff',fontWeight:700,fontSize:14}}>MEL — Assistente IA</div>
                  <div style={{color:'rgba(255,255,255,.8)',fontSize:11}}>Online agora</div>
                </div>
              </div>
              <button onClick={()=>setChatAberto(false)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer'}}><X size={18}/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10}}>
              {chatMensagens.map((m,i)=>(
                <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
                  {m.role==='assistant'&&<div style={{width:28,height:28,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800,flexShrink:0}}>M</div>}
                  <div style={{maxWidth:'78%',padding:'9px 13px',borderRadius:m.role==='user'?'14px 14px 2px 14px':'14px 14px 14px 2px',background:m.role==='user'?cor:'#f3f4f6',color:m.role==='user'?'#fff':'#111',fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{m.content}</div>
                </div>
              ))}
              {chatCarregando&&<div style={{display:'flex',gap:8,alignItems:'flex-end'}}><div style={{width:28,height:28,borderRadius:'50%',background:cor,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800}}>M</div><div style={{background:'#f3f4f6',borderRadius:'14px 14px 14px 2px',padding:'10px 16px',fontSize:18,color:'#999'}}>...</div></div>}
              <div ref={chatEndRef}/>
            </div>
            <div style={{padding:'10px 12px',borderTop:'1px solid #f0f0f0',display:'flex',gap:8,flexShrink:0}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enviarMensagemChat()} placeholder="Digite sua mensagem..." style={{flex:1,border:'1px solid #e5e7eb',borderRadius:20,padding:'9px 14px',fontSize:13,outline:'none',fontFamily:'Jost,sans-serif'}}/>
              <button onClick={()=>enviarMensagemChat()} disabled={chatCarregando} style={{width:38,height:38,borderRadius:'50%',background:chatCarregando?'#ccc':cor,border:'none',cursor:chatCarregando?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Send size={15} color="#fff"/></button>
            </div>
          </div>
        )}
        <button onClick={()=>setChatAberto(!chatAberto)} style={{width:58,height:58,borderRadius:'50%',background:cor,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(0,0,0,.2)',position:'relative'}}>
          {chatAberto?<X size={24} color="#fff"/>:<MessageCircle size={24} color="#fff"/>}
          {!chatAberto&&chatMensagens.length>1&&<div style={{position:'absolute',top:2,right:2,width:18,height:18,background:'#ef4444',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',fontWeight:700}}>{chatMensagens.filter(m=>m.role==='assistant').length}</div>}
        </button>
      </div>
    </div>
  )
}

export default function CardapioPage({ params }: { params: { slug: string } }) {
  return <CardapioPublico params={params}/>
}