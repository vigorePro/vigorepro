'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, RefreshCw, Users, TrendingUp, Clock, Bot, Zap, Star, AlertCircle, X, PhoneCall, UserCheck, Bell, Pencil } from 'lucide-react'

type Conversa = {
  telefone: string
  total_mensagens: number
  ultima_mensagem: string
  criado_em: string
}
type MensagemChat = { role: 'user' | 'assistant'; content: string }
type MensagemHistorico = { role: 'user' | 'assistant' | 'atendente'; content: string; criado_em: string }
type Notificacao = {
  id: string; gatilho: string; tipo: string; tipoColor: string
  mensagem: string; preview: string; ativo: boolean
}

const FRASES_HUMANO = ['chamar um de nossos atendentes','chamar um atendente','atendente humano','vou chamar','Um momento!','chamo um atendente']
function precisaHumano(msg: string) { return FRASES_HUMANO.some(f => msg.toLowerCase().includes(f.toLowerCase())) }

const NOTIFS_DEFAULT: Notificacao[] = [
  { id: 'pedido_feito', gatilho: 'Pedido feito', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Olá ***CLIENTE_NOME*** 👋, seu pedido ***VENDA_NUMERO*** foi recebido com sucess...',
    mensagem: 'Olá ***CLIENTE_NOME*** 👋,\nseu pedido ***VENDA_NUMERO*** foi recebido com sucesso.\n\n► *Detalhes*\n**VENDA_PRODUTOS**\n–\n**VENDA_TOTAIS**\n\n► *Entrega*\n**VENDA_ENTREGA**\n**MEU_MINUTOS_DELIVERY**\n\n► *Pagamento*\n**VENDA_PAGAMENTO**' },
  { id: 'pedido_confirmado', gatilho: 'Pedido confirmado', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Obá 🤩! Seu pedido foi confirmado e está sendo preparado....',
    mensagem: 'Obá 🤩!\nSeu pedido foi confirmado e está sendo preparado.' },
  { id: 'pedido_pronto', gatilho: 'Pedido pronto para retirada', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: '🛍️ Seu pedido está pronto para retirada....',
    mensagem: '🛍️ Seu pedido está pronto para retirada.' },
  { id: 'pedido_saiu', gatilho: 'Pedido saiu para entrega', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: '🛵 Seu pedido está pronto e sairá para entrega....',
    mensagem: '🛵 Seu pedido está pronto e sairá para entrega.' },
  { id: 'pedido_entregue', gatilho: 'Pedido retirado ou entregue', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Olá ***CLIENTE_NOME***, O que achou do seu pedido? Sua opinião é muito important...',
    mensagem: 'Olá ***CLIENTE_NOME***,\nO que achou do seu pedido? Sua opinião é muito importante para nós.\n\nAcesse o link abaixo e deixe sua opinião:\n► **VENDA_LINK_AVALIACAO**\n\nObrigado e até mais!' },
  { id: 'pedido_cancelado', gatilho: 'Pedido cancelado', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: '***MEU_NOME_FANTASIA*** Olá ***CLIENTE_NOME*** 👋, seu pedido ***VENDA_NUMERO***...',
    mensagem: '***MEU_NOME_FANTASIA***\n\nOlá ***CLIENTE_NOME*** 👋,\nseu pedido ***VENDA_NUMERO*** foi cancelado.\n\n► Motivo: **VENDA_MOTIVO_CANCELAMENTO**\n\nEm caso de dúvidas entre em contato direto com o estabelecimento ***MEU_NOME_FANTASIA*** pelo whatsapp ***MEU_WHATSAPP***.' },
]

const VARS_MEU = ['**MEU_NOME_FANTASIA**','**MEU_MINUTOS_DELIVERY**','**MEU_TELEFONE**','**MEU_WHATSAPP**','**MEU_EMAIL**','**MEU_LINK_CONSULTA**']
const VARS_CLIENTE = ['**CLIENTE_NOME**']
const VARS_VENDA = ['**VENDA_NUMERO**','**VENDA_PRODUTOS**','**VENDA_TOTAIS**','**VENDA_ENTREGA**','**VENDA_PAGAMENTO**','**VENDA_MOTIVO_CANCELAMENTO**','**VENDA_LINK_AVALIACAO**']

function ModalEdicao({ notif, onClose, onSave }: { notif: Notificacao; onClose: () => void; onSave: (id: string, msg: string) => void }) {
  const [texto, setTexto] = useState(notif.mensagem)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, width: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#281615', border: '1px solid #3a1212', borderRadius: 8, padding: '4px 10px', fontSize: 13, color: '#ef4239', fontWeight: 700 }}>{notif.gatilho}</span>
            <span style={{ background: '#1a0f2e', border: '1px solid #3a1f5e', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#a855f7', fontWeight: 600 }}>{notif.tipo}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: 8, padding: 6 }}><X size={18} /></button>
        </div>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#e6e6e6', display: 'block', marginBottom: 8 }}>Mensagem</label>
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={10} style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#e6e6e6', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, marginBottom: 16 }} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, fontWeight: 600 }}>Variáveis disponíveis:</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#ef4239', fontWeight: 700, marginBottom: 5 }}>MEU</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARS_MEU.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#1a0808', border: '1px solid #3a1212', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#ef9090', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 5 }}>CLIENTE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARS_CLIENTE.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 5 }}>VENDA</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARS_VENDA.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '8px 18px', color: '#9ca3af', cursor: 'pointer', fontSize: 13, fontFamily: 'Mulish, sans-serif' }}>Cancelar</button>
          <button onClick={() => { onSave(notif.id, texto); onClose() }} style={{ background: '#ef4239', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Mulish, sans-serif' }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ ativo, onChange }: { ativo: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: ativo ? '#22c55e' : '#444', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: ativo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  )
}

function IAContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [nomeEstab, setNomeEstab] = useState('Meu Estabelecimento')
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [totalConversas, setTotalConversas] = useState(0)
  const [totalPedidosIA, setTotalPedidosIA] = useState(0)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'notificacoes' | 'teste'>('painel')
  const [testeMensagens, setTesteMensagens] = useState<MensagemChat[]>([{ role: 'assistant', content: 'Ola! Sou a MEL. Este e o modo de teste — experimente conversar comigo como se fosse um cliente! :)' }])
  const [testeInput, setTesteInput] = useState('')
  const [testeCarregando, setTesteCarregando] = useState(false)
  const [testeSessionId] = useState(() => 'teste_' + Date.now())
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null)
  const [mensagensConversa, setMensagensConversa] = useState<MensagemHistorico[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const [piscarHumano, setPiscarHumano] = useState<Set<string>>(new Set())
  const dismissedRef = useRef<Set<string>>(new Set())
  const [atendenteInput, setAtendenteInput] = useState('')
  const [enviandoAtendente, setEnviandoAtendente] = useState(false)
  const atendenteInputRef = useRef<HTMLInputElement>(null)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(NOTIFS_DEFAULT)
  const [editando, setEditando] = useState<Notificacao | null>(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `@keyframes piscar-humano { 0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,0.7)} 50%{opacity:0.8;transform:scale(1.06);box-shadow:0 0 0 6px rgba(239,68,68,0)} } .badge-humano{animation:piscar-humano 1.1s ease-in-out infinite}`
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [])

  useEffect(() => {
    async function carregarEstab() {
      if (slug && slug !== 'default') {
        const { data } = await supabase.from('estabelecimentos').select('id, nome').eq('slug', slug).single()
        if (data) { setEstabelecimentoId(data.id); if (data.nome) setNomeEstab(data.nome); return }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: perfil } = await supabase.from('estabelecimentos').select('id, nome').eq('user_id', session.user.id).single()
      if (perfil) { setEstabelecimentoId(perfil.id); if (perfil.nome) setNomeEstab(perfil.nome) }
    }
    carregarEstab()
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setLoading(true)
    try {
      const { data: msgs } = await supabase.from('conversas_ia').select('telefone, role, content, criado_em').eq('estabelecimento_id', estabelecimentoId).order('criado_em', { ascending: false })
      if (msgs) {
        const map = new Map<string, { total: number; ultima: string; ultimaAssistente: string; criado_em: string }>()
        msgs.forEach((m: { telefone: string; role: string; content: string; criado_em: string }) => {
          if (!map.has(m.telefone)) map.set(m.telefone, { total: 0, ultima: '', ultimaAssistente: '', criado_em: m.criado_em })
          const entry = map.get(m.telefone)!
          entry.total++
          if (!entry.ultima) entry.ultima = m.content
          if (!entry.ultimaAssistente && m.role === 'assistant') entry.ultimaAssistente = m.content
        })
        const lista: Conversa[] = Array.from(map.entries()).map(([tel, v]) => ({ telefone: tel, total_mensagens: v.total, ultima_mensagem: v.ultima, criado_em: v.criado_em }))
        setConversas(lista.slice(0, 20))
        setTotalConversas(lista.length)
        const novasPiscando = new Set<string>()
        map.forEach((v, tel) => { if (!dismissedRef.current.has(tel) && precisaHumano(v.ultimaAssistente)) novasPiscando.add(tel) })
        setPiscarHumano(novasPiscando)
      }
      const { count } = await supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', estabelecimentoId)
      setTotalPedidosIA(count || 0)
    } finally { setLoading(false) }
  }, [estabelecimentoId])

  const recarregarConversa = useCallback(async (telefone: string) => {
    if (!estabelecimentoId) return
    const { data } = await supabase.from('conversas_ia').select('role, content, criado_em').eq('estabelecimento_id', estabelecimentoId).eq('telefone', telefone).order('criado_em', { ascending: true })
    setMensagensConversa(data || [])
    setTimeout(() => painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80)
  }, [estabelecimentoId])

  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
    const channel = supabase.channel('ia-realtime-' + estabelecimentoId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversas_ia', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, (payload) => {
        fetchDados()
        setConversaAberta(prev => {
          if (prev && payload.new && (payload.new as { telefone?: string }).telefone === prev.telefone) recarregarConversa(prev.telefone)
          return prev
        })
      }).subscribe()
    const interval = setInterval(fetchDados, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [estabelecimentoId, fetchDados, recarregarConversa])

  const enviarMensagemAtendente = async () => {
    if (!atendenteInput.trim() || enviandoAtendente || !conversaAberta || !estabelecimentoId) return
    const texto = atendenteInput.trim()
    setAtendenteInput(''); setEnviandoAtendente(true)
    setMensagensConversa(prev => [...prev, { role: 'atendente', content: texto, criado_em: new Date().toISOString() }])
    setTimeout(() => painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80)
    try { await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: conversaAberta.telefone, mensagem: texto, estabelecimento_id: estabelecimentoId }) }) }
    finally { setEnviandoAtendente(false); setTimeout(() => atendenteInputRef.current?.focus(), 100) }
  }

  const enviarTesteChat = async () => {
    if (!testeInput.trim() || testeCarregando) return
    const msg = testeInput.trim(); setTesteInput('')
    setTesteMensagens(prev => [...prev, { role: 'user', content: msg }]); setTesteCarregando(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: msg, slug, sessionId: testeSessionId }) })
      const data = await res.json()
      setTesteMensagens(prev => [...prev, { role: 'assistant', content: data.resposta || 'Sem resposta.' }])
    } catch { setTesteMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA.' }]) }
    finally { setTesteCarregando(false); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100) }
  }

  const formatarTelefone = (tel: string) => (tel.startsWith('web_') || tel.startsWith('chat_') || tel.startsWith('teste_')) ? 'Chat Web' : tel.length > 8 ? tel.substring(0, 6) + '****' + tel.slice(-2) : tel
  const getCanalTelefone = (tel: string) => (tel.startsWith('web_') || tel.startsWith('chat_') || tel.startsWith('teste_')) ? { label: 'Chat Web', cor: '#3b82f6' } : { label: 'WhatsApp', cor: '#25d366' }

  const abrirConversa = async (conversa: Conversa) => {
    setConversaAberta(conversa); setAtendenteInput(''); setLoadingMensagens(true)
    const { data } = await supabase.from('conversas_ia').select('role, content, criado_em').eq('estabelecimento_id', estabelecimentoId!).eq('telefone', conversa.telefone).order('criado_em', { ascending: true })
    setMensagensConversa(data || []); setLoadingMensagens(false)
    setTimeout(() => { painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); atendenteInputRef.current?.focus() }, 100)
  }

  const dispensarAlerta = (telefone: string, e: React.MouseEvent) => {
    e.stopPropagation(); dismissedRef.current.add(telefone)
    setPiscarHumano(prev => { const s = new Set(prev); s.delete(telefone); return s })
  }

  const formatarTempo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'agora'; if (diff < 60) return diff + 'min atras'
    if (diff < 1440) return Math.floor(diff / 60) + 'h atras'; return Math.floor(diff / 1440) + 'd atras'
  }

  const getBubbleStyle = (role: string) => {
    if (role === 'user') return { align: 'flex-end' as const, bg: '#ef4239', border: 'none', label: 'Cliente' }
    if (role === 'atendente') return { align: 'flex-end' as const, bg: '#059669', border: 'none', label: 'Atendente' }
    return { align: 'flex-start' as const, bg: '#1e1e1e', border: '1px solid #292929', label: 'MEL' }
  }

  const ativasCount = notificacoes.filter(n => n.ativo).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, fontFamily: 'Mulish, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4239, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} color="#fff" /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Inteligencia Artificial</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>MEL — Assistente virtual powered by Claude AI</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>IA Online</span>
          <button onClick={fetchDados} style={{ background: 'none', border: '1px solid #292929', borderRadius: 8, padding: '6px 12px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Conversas Total', value: totalConversas, icon: <MessageCircle size={20} color="#ef4239" />, bg: '#1a0a0a', sub: 'clientes atendidos' },
          { label: 'Pedidos no Sistema', value: totalPedidosIA, icon: <Zap size={20} color="#f59e0b" />, bg: '#1a1500', sub: 'total registrados' },
          { label: 'Sessoes Hoje', value: conversas.filter(c => new Date(c.criado_em).toDateString() === new Date().toDateString()).length, icon: <TrendingUp size={20} color="#10b981" />, bg: '#0a1a12', sub: 'interacoes hoje' },
          { label: 'Disponibilidade', value: '24/7', icon: <Star size={20} color="#8b5cf6" />, bg: '#110a1a', sub: 'sempre online' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: kpi.bg, border: '1px solid #292929', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{kpi.icon}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{loading ? '...' : kpi.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1a1a1a', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([{ key: 'painel', label: 'Conversas Recentes' }, { key: 'notificacoes', label: 'Notificações' }, { key: 'teste', label: 'Testar MEL' }] as const).map(aba => (
          <button key={aba.key} onClick={() => setAbaAtiva(aba.key)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Mulish, sans-serif', background: abaAtiva === aba.key ? '#ef4239' : 'transparent', color: abaAtiva === aba.key ? '#fff' : '#9ca3af', transition: 'all 0.2s' }}>
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'painel' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#9ca3af" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Historico de Conversas</span>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{totalConversas} sessoes</span>
            {piscarHumano.size > 0 && (
              <span className="badge-humano" style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PhoneCall size={13} /> {piscarHumano.size} precisam de atendimento
              </span>
            )}
          </div>
          {conversas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div>
              {conversas.map((c, i) => {
                const humano = piscarHumano.has(c.telefone)
                return (
                  <div key={i} onClick={() => abrirConversa(c)} style={{ padding: '14px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background 0.15s', background: humano ? 'rgba(239,68,68,0.06)' : 'transparent', borderLeft: humano ? '3px solid #ef4444' : '3px solid transparent' }} onMouseEnter={e => (e.currentTarget.style.background = humano ? 'rgba(239,68,68,0.12)' : '#222')} onMouseLeave={e => (e.currentTarget.style.background = humano ? 'rgba(239,68,68,0.06)' : 'transparent')}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: humano ? '#3a1010' : '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {humano ? <PhoneCall size={16} color="#ef4444" /> : <Users size={16} color="#6b7280" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{formatarTelefone(c.telefone)}</span>
                        <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {formatarTempo(c.criado_em)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: humano ? '#fca5a5' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                        {c.ultima_mensagem.substring(0, 80)}{c.ultima_mensagem.length > 80 ? '...' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ background: getCanalTelefone(c.telefone).cor + '22', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: getCanalTelefone(c.telefone).cor, fontWeight: 600 }}>{getCanalTelefone(c.telefone).label}</div>
                      <div style={{ background: '#292929', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#9ca3af' }}>{c.total_mensagens} msgs</div>
                      {humano && (
                        <button className="badge-humano" onClick={e => dispensarAlerta(c.telefone, e)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <PhoneCall size={11} /> HUMANO
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'notificacoes' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={20} color="#9ca3af" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>{nomeEstab}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{ativasCount} de {notificacoes.length} notificações ativas</div>
            </div>
            <div style={{ background: '#ef4239', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
              {ativasCount}/{notificacoes.length}
            </div>
          </div>
          {notificacoes.map((n) => (
            <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 16 }}>
              <Toggle ativo={n.ativo} onChange={() => setNotificacoes(prev => prev.map(x => x.id === n.id ? { ...x, ativo: !x.ativo } : x))} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 20, padding: '2px 12px', fontSize: 12, color: '#e6e6e6', fontWeight: 600 }}>{n.gatilho}</span>
                  <span style={{ background: '#1a0f2e', border: '1px solid #3a1f5e', borderRadius: 20, padding: '2px 12px', fontSize: 12, color: '#a855f7', fontWeight: 600 }}>{n.tipo}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.preview}</div>
              </div>
              <button onClick={() => setEditando(n)} style={{ background: 'none', border: 'none', color: '#ef4239', cursor: 'pointer', padding: 8, borderRadius: 8, display: '
