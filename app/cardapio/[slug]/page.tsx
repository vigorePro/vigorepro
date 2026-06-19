'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ShoppingCart, Search, Plus, Minus, X, ArrowLeft, Check, MessageCircle, Send, Bot } from 'lucide-react'

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
const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
const [obsItem, setObsItem] = useState('')
const [qtdItem, setQtdItem] = useState(1)
const [carregando, setCarregando] = useState(true)
const [isLogado, setIsLogado] = useState(false)

// Chat IA
const [chatAberto, setChatAberto] = useState(false)
const [chatMensagens, setChatMensagens] = useState<{role: 'user'|'assistant', content: string}[]>([
{ role: 'assistant', content: 'Ola! Sou a MEL, assistente virtual da loja. Como posso ajudar? :)' }
])
const [chatInput, setChatInput] = useState('')
const [chatCarregando, setChatCarregando] = useState(false)
const [chatSessionId] = useState(() => 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2,9))
const [pedidoFinalizado, setPedidoFinalizado] = useState(false)
const chatEndRef = useRef<HTMLDivElement>(null)

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

// Envia mensagem para a MEL
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
const resposta = data.resposta || 'Desculpe, tente novamente.'
setChatMensagens(prev => [...prev, { role: 'assistant', content: resposta }])
// Se pedido foi criado, limpa o carrinho
if (data.pedidoCriado) {
setCarrinho([])
setPedidoFinalizado(true)
}
} catch {
setChatMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
} finally {
setChatCarregando(false)
setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
}
}

// Abre o chat e envia o carrinho para a MEL finalizar
const finalizarComMEL = () => {
if (carrinho.length === 0) return
setCarrinhoAberto(false)

// Monta resumo do carrinho
const itensTexto = carrinho.map(i =>
`${i.quantidade}x ${i.produto.nome} (R$ ${((i.produto.preco_promocional || i.produto.preco) * i.quantidade).toFixed(2).replace('.', ',')})${i.obs ? ` - obs: ${i.obs}` : ''}`
).join(', ')
const frete = totalCarrinho < 50 ? 'R$ 10,00' : totalCarrinho < 100 ? 'R$ 5,00' : 'GRATIS'
const msgCarrinho = `Ola! Quero finalizar meu pedido. Tenho no carrinho: ${itensTexto}. Total dos itens: R$ ${totalCarrinho.toFixed(2).replace('.', ',')}. Taxa de entrega: ${frete}.`

// Abre o chat e envia automaticamente
setChatAberto(true)
setTimeout(() => {
enviarMensagemChat(msgCarrinho)
}, 300)
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
<h2 style={{ margin: '0 0 8px' }}>Restaurante nao encontrado</h2>
<p>O estabelecimento <strong>{slug}</strong> nao existe.</p>
</div>
</div>
)

return (
<div style={{ fontFamily: 'Mulish, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

{/* HEADER */}
<div style={{ background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100 }}>
<div style={{ maxWidth: 800, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
{isLogado && (
<a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
<ArrowLeft size={14} /> Dashboard
</a>
)}
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

<div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 100px' }}>
{/* BUSCA */}
<div style={{ position: 'relative', margin: '16px 0 12px' }}>
<Search size={16} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
<input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no cardapio..."
style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: 10, border: '1px solid #e0e0e0', background: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
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

{/* PRODUTOS */}
{produtosFiltrados.length === 0 ? (
<div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
<p style={{ fontSize: 32, margin: '0 0 8px' }}>🍽️</p>
<p>Nenhum produto encontrado</p>
</div>
) : (
<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
{produtosFiltrados.map(produto => (
<div key={produto.id} onClick={() => { setProdutoDetalhe(produto); setQtdItem(1); setObsItem('') }}
style={{ background: '#fff', borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
<div style={{ flex: 1 }}>
<p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: '#111' }}>{produto.nome}</p>
{produto.descricao && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888', lineHeight: 1.4 }}>{produto.descricao.substring(0, 80)}{produto.descricao.length > 80 ? '...' : ''}</p>}
<span style={{ fontSize: 16, fontWeight: 700, color: corPrimaria }}>
R$ {(produto.preco_promocional || produto.preco).toFixed(2).replace('.', ',')}
</span>
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
<div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', padding: 24, position: 'relative' }}>
{produtoDetalhe.imagem_url && <img src={produtoDetalhe.imagem_url} alt={produtoDetalhe.nome} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />}
<button onClick={() => setProdutoDetalhe(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#eee', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
<h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{produtoDetalhe.nome}</h2>
{produtoDetalhe.descricao && <p style={{ margin: '0 0 16px', color: '#666', fontSize: 14, lineHeight: 1.5 }}>{produtoDetalhe.descricao}</p>}
<span style={{ fontSize: 22, fontWeight: 800, color: corPrimaria, display: 'block', marginBottom: 16 }}>R$ {(produtoDetalhe.preco_promocional || produtoDetalhe.preco).toFixed(2).replace('.', ',')}</span>
<div style={{ marginBottom: 16 }}>
<label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Observacoes (opcional)</label>
<textarea value={obsItem} onChange={e => setObsItem(e.target.value)} placeholder="Ex: sem cebola, bem passado..."
rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' }} />
</div>
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
<button onClick={() => setQtdItem(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
<span style={{ fontSize: 18, fontWeight: 700 }}>{qtdItem}</span>
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
<div style={{ width: 380, background: '#fff', display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
<button onClick={() => removerCarrinho(item.produto.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
</div>
</div>
))}
</div>
{carrinho.length > 0 && (
<div style={{ padding: 20, borderTop: '1px solid #eee' }}>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#666' }}>
<span>Subtotal</span>
<span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, color: '#666' }}>
<span>Entrega</span>
<span style={{ color: totalCarrinho >= 100 ? '#22c55e' : '#555' }}>
{totalCarrinho < 50 ? 'R$ 10,00' : totalCarrinho < 100 ? 'R$ 5,00' : 'Grátis 🎉'}
</span>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 17, fontWeight: 800 }}>
<span>Total</span>
<span style={{ color: corPrimaria }}>R$ {(totalCarrinho + (totalCarrinho < 50 ? 10 : totalCarrinho < 100 ? 5 : 0)).toFixed(2).replace('.', ',')}</span>
</div>
{/* BOTÃO FINALIZAR COM MEL */}
<button onClick={finalizarComMEL} style={{
width: '100%', padding: '14px 0', background: corPrimaria, border: 'none', borderRadius: 10,
color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: 'Mulish, sans-serif',
display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
}}>
<Bot size={20} />
Finalizar com a MEL
</button>
<p style={{ textAlign: 'center', fontSize: 12, color: '#aaa', margin: '8px 0 0' }}>A MEL vai te ajudar a finalizar o pedido :)</p>
</div>
)}
</div>
</div>
)}

{/* PEDIDO FINALIZADO */}
{pedidoFinalizado && (
<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
<div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 340, textAlign: 'center', fontFamily: 'Mulish, sans-serif' }}>
<div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
<Check size={40} color="#22c55e" />
</div>
<h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800 }}>Pedido confirmado!</h2>
<p style={{ margin: '0 0 24px', color: '#666', fontSize: 14, lineHeight: 1.6 }}>Seu pedido foi registrado com sucesso. Em breve entraremos em contato!</p>
<button onClick={() => { setPedidoFinalizado(false); setChatAberto(false) }} style={{
padding: '12px 32px', background: corPrimaria, border: 'none', borderRadius: 10,
color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
}}>Fazer novo pedido</button>
</div>
</div>
)}

{/* CHAT MEL FLUTUANTE */}
<div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 999, fontFamily: 'Mulish, sans-serif' }}>
{chatAberto && (
<div style={{ position: 'absolute', bottom: 72, right: 0, width: 340, height: 480, background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #eee' }}>
<div style={{ background: corPrimaria, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
<div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>M</div>
<div>
<div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>MEL — Assistente IA</div>
<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Online agora ●</div>
</div>
</div>
<button onClick={() => setChatAberto(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
</div>
<div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
{chatMensagens.map((m, i) => (
<div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
{m.role === 'assistant' && (
<div style={{ width: 28, height: 28, borderRadius: '50%', background: corPrimaria, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>M</div>
)}
<div style={{
maxWidth: '78%', padding: '9px 13px',
borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
background: m.role === 'user' ? corPrimaria : '#f3f4f6',
color: m.role === 'user' ? '#fff' : '#111', fontSize: 13, lineHeight: 1.5,
whiteSpace: 'pre-wrap'
}}>{m.content}</div>
</div>
))}
{chatCarregando && (
<div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
<div style={{ width: 28, height: 28, borderRadius: '50%', background: corPrimaria, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>M</div>
<div style={{ background: '#f3f4f6', borderRadius: '14px 14px 14px 2px', padding: '10px 16px', fontSize: 18, color: '#999' }}>...</div>
</div>
)}
<div ref={chatEndRef} />
</div>
<div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
<input
value={chatInput}
onChange={e => setChatInput(e.target.value)}
onKeyDown={e => e.key === 'Enter' && enviarMensagemChat()}
placeholder="Digite sua mensagem..."
style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '9px 14px', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }}
/>
<button onClick={() => enviarMensagemChat()} disabled={chatCarregando} style={{
width: 38, height: 38, borderRadius: '50%', background: chatCarregando ? '#ccc' : corPrimaria,
border: 'none', cursor: chatCarregando ? 'not-allowed' : 'pointer',
display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
}}>
<Send size={15} color="#fff" />
</button>
</div>
</div>
)}
<button
onClick={() => setChatAberto(!chatAberto)}
style={{ width: 58, height: 58, borderRadius: '50%', background: corPrimaria, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', position: 'relative' }}
>
{chatAberto ? <X size={24} color="#fff" /> : <MessageCircle size={24} color="#fff" />}
{!chatAberto && chatMensagens.length > 1 && (
<div style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, background: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>
{chatMensagens.filter(m => m.role === 'assistant').length}
</div>
)}
</button>
</div>
</div>
)
}

export default function CardapioPage({ params }: { params: { slug: string } }) {
return <CardapioPublico params={params} />
}
