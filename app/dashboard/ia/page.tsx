'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, RefreshCw, Users, TrendingUp, Clock, Bot, Zap, Star, AlertCircle, X, PhoneCall, UserCheck, Bell, Pencil, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

type Conversa = {
  telefone: string
  total_mensagens: number
  ultima_mensagem: string
  criado_em: string
}

type MensagemChat = {
  role: 'user' | 'assistant'
  content: string
}

type MensagemHistorico = {
  role: 'user' | 'assistant' | 'atendente'
  content: string
  criado_em: string
}

type Notificacao = {
  id: string
  gatilho: string
  tipo: string
  tipoColor: string
  mensagem: string
  preview: string
  ativo: boolean
  emoji: string
}

const FRASES_HUMANO = [
  'chamar um de nossos atendentes',
  'chamar um atendente',
  'atendente humano',
  'vou chamar',
  'Um momento!',
  'chamo um atendente',
]

function precisaHumano(msg: string): boolean {
  const lower = msg.toLowerCase()
  return FRASES_HUMANO.some(f => lower.includes(f.toLowerCase()))
}

const NOTIFICACOES_DEFAULT: Notificacao[] = [
  {
    id: 'pedido_feito',
    gatilho: 'Pedido feito',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '👋',
    mensagem: `Olá ***CLIENTE_NOME*** 👋,\nseu pedido ***VENDA_NUMERO*** foi recebido com sucesso.\n\n► *Detalhes*\n**VENDA_PRODUTOS**\n–\n**VENDA_TOTAIS**\n\n► *Entrega*\n**VENDA_ENTREGA**\n**MEU_MINUTOS_DELIVERY**\n\n► *Pagamento*\n**VENDA_PAGAMENTO**`,
    preview: 'Olá ***CLIENTE_NOME*** 👋, seu pedido ***VENDA_NUMERO*** foi recebido com sucess...',
    ativo: true,
  },
  {
    id: 'pedido_confirmado',
    gatilho: 'Pedido confirmado',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '🤩',
    mensagem: `Obá 🤩!\nSeu pedido foi confirmado e está sendo preparado.`,
    preview: 'Obá 🤩! Seu pedido foi confirmado e está sendo preparado....',
    ativo: true,
  },
  {
    id: 'pedido_pronto_retirada',
    gatilho: 'Pedido pronto para retirada',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '🛍️',
    mensagem: `🛍️ Seu pedido está pronto para retirada.`,
    preview: '🛍️ Seu pedido está pronto para retirada....',
    ativo: true,
  },
  {
    id: 'pedido_saiu_entrega',
    gatilho: 'Pedido saiu para entrega',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '🛵',
    mensagem: `🛵 Seu pedido está pronto e sairá para entrega.`,
    preview: '🛵 Seu pedido está pronto e sairá para entrega....',
    ativo: true,
  },
  {
    id: 'pedido_entregue',
    gatilho: 'Pedido retirado ou entregue',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '⭐',
    mensagem: `Olá ***CLIENTE_NOME***,\nO que achou do seu pedido? Sua opinião é muito importante para nós.\n\nAcesse o link abaixo e deixe sua opinião:\n► **VENDA_LINK_AVALIACAO**\n\nObrigado e até mais!`,
    preview: 'Olá ***CLIENTE_NOME***, O que achou do seu pedido? Sua opinião é muito important...',
    ativo: true,
  },
  {
    id: 'pedido_cancelado',
    gatilho: 'Pedido cancelado',
    tipo: 'Delivery',
    tipoColor: '#a855f7',
    emoji: '❌',
    mensagem: `***MEU_NOME_FANTASIA***\n\nOlá ***CLIENTE_NOME*** 👋,\nseu pedido ***VENDA_NUMERO*** foi cancelado.\n\n► Motivo: **VENDA_MOTIVO_CANCELAMENTO**\n\nEm caso de dúvidas entre em contato direto com o estabelecimento ***MEU_NOME_FANTASIA*** pelo whatsapp ***MEU_WHATSAPP***.`,
    preview: '***MEU_NOME_FANTASIA*** Olá ***CLIENTE_NOME*** 👋, seu pedido ***VENDA_NUMERO***...',
    ativo: true,
  },
]

const VARIAVEIS_MEU = ['**MEU_NOME_FANTASIA**', '**MEU_MINUTOS_DELIVERY**', '**MEU_TELEFONE**', '**MEU_WHATSAPP**', '**MEU_EMAIL**', '**MEU_LINK_CONSULTA**']
const VARIAVEIS_CLIENTE = ['**CLIENTE_NOME**']
const VARIAVEIS_VENDA = ['**VENDA_NUMERO**', '**VENDA_PRODUTOS**', '**VENDA_TOTAIS**', '**VENDA_ENTREGA**', '**VENDA_PAGAMENTO**', '**VENDA_MOTIVO_CANCELAMENTO**', '**VENDA_LINK_AVALIACAO**']

function ModalEdicao({ notif, onClose, onSave }: { notif: Notificacao, onClose: () => void, onSave: (id: string, msg: string) => void }) {
  const [texto, setTexto] = useState(notif.mensagem)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, width: 560, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#281615', borderRadius: 8, padding: '4px 10px', fontSize: 13, color: '#ef4239', fontWeight: 700, border: '1px solid #3a1212' }}>{notif.gatilho}</div>
            <div style={{ background: '#1a0f2e', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#a855f7', fontWeight: 600, border: '1px solid #3a1f5e' }}>{notif.tipo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: 8, padding: 6 }}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#e6e6e6', display: 'block', marginBottom: 8 }}>Mensagem</label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={10}
            style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 10, padding: '12px 14px', color: '#e6e6e6', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, fontWeight: 600 }}>Variáveis disponíveis:</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#ef4239', fontWeight: 700, marginBottom: 5 }}>MEU</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARIAVEIS_MEU.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#1a0808', border: '1px solid #3a1212', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#ef9090', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 5 }}>CLIENTE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARIAVEIS_CLIENTE.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 5 }}>VENDA</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VARIAVEIS_VENDA.map(v => <button key={v} onClick={() => setTexto(t => t + v)} style={{ background: '#111', border: '1px solid #333', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>)}
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

function IAContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [totalConversas, setTotalConversas] = useState(0)
  const [totalPedidosIA, setTotalPedidosIA] = useState(0)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'notificacoes' | 'teste'>('painel')
  const [testeMensagens, setTesteMensagens] = useState<MensagemChat[]>([
    { role: 'assistant', content: 'Ola! Sou a MEL. Este e o modo de teste — experimente conversar comigo como se fosse um cliente! :)' }
  ])
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
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(NOTIFICACOES_DEFAULT)
  const [editando, setEditando] = useState<Notificacao | null>(null)
  const [nomeEstab, setNomeEstab] = useState('Meu Estabelecimento')
  const [expandido, setExpandido] = useState(true)

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
        const map = new Map<string, { total: number, ultima: string, ultimaAssistente: string, criado_em: string }>()
        msgs.forEach((m: { telefone: string, role: string, content: string, criado_em: string }) => {
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
        map.forEach((v, tel) => { if (!dismissedRef.current.has(tel) && precisaHumano(v.ultimaAssistente)) { novasPiscando.add(tel) } })
        setPiscarHumano(novasPiscando)
      }
      const { count } = await supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estabelecimento_id', estabelecimentoId)
      setTotalPedidosIA(count || 0)
    } finally {
      setLoading(false)
    }
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
          if (prev && payload.new && (payload.new as { telefone?: string }).telefone === prev.telefone) { recarregarConversa(prev.telefone) }
          return prev
        })
      })
      .subscribe()
    const interval = setInterval(() => { fetchDados() }, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [estabelecimentoId, fetchDados, recarregarConversa])

  const enviarMensagemAtendente = async () => {
    if (!atendenteInput.trim() || enviandoAtendente || !conversaAberta || !estabelecimentoId) return
    const texto = atendenteInput.trim()
    setAtendenteInput('')
    setEnviandoAtendente(true)
    const novaMsg: MensagemHistorico = { role: 'atendente', content: texto, criado_em: new Date().toISOString() }
    setMensagensConversa(prev => [...prev, novaMsg])
    setTimeout(() => painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 80)
    try {
      await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefone: conversaAberta.telefone, mensagem: texto, estabelecimento_id: estabelecimentoId }) })
    } finally {
      setEnviandoAtendente(false)
      setTimeout(() => atendenteInputRef.current?.focus(), 100)
    }
  }

  const enviarTesteChat = async () => {
    if (!testeInput.trim() || testeCarregando) return
    const msg = testeInput.trim()
    setTesteInput('')
    setTesteMensagens(prev => [...prev, { role: 'user', content: msg }])
    setTesteCarregando(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: msg, slug, sessionId: testeSessionId }) })
      const data = await res.json()
      setTesteMensagens(prev => [...prev, { role: 'assistant', content: data.resposta || 'Sem resposta.' }])
    } catch {
      setTesteMensagens(prev => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA.' }])
    } finally {
      setTesteCarregando(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  const formatarTelefone = (tel: string) => {
    if (tel.startsWith('web_') || tel.startsWith('chat_') || tel.startsWith('teste_')) return 'Chat Web'
    return tel.length > 8 ? tel.substring(0, 6) + '****' + tel.slice(-2) : tel
  }

  const getCanalTelefone = (tel: string): { label: string; cor: string } => {
    if (tel.startsWith('web_') || tel.startsWith('chat_') || tel.startsWith('teste_')) return { label: 'Chat Web', cor: '#3b82f6' }
    return { label: 'WhatsApp', cor: '#25d366' }
  }

  const abrirConversa = async (conversa: Conversa) => {
    setConversaAberta(conversa)
    setAtendenteInput('')
    setLoadingMensagens(true)
    const { data } = await supabase.from('conversas_ia').select('role, content, criado_em').eq('estabelecimento_id', estabelecimentoId!).eq('telefone', conversa.telefone).order('criado_em', { ascending: true })
    setMensagensConversa(data || [])
    setLoadingMensagens(false)
    setTimeout(() => { painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); atendenteInputRef.current?.focus() }, 100)
  }

  const dispensarAlerta = (telefone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    dismissedRef.current.add(telefone)
    setPiscarHumano(prev => { const s = new Set(prev); s.delete(telefone); return s })
  }

  const formatarTempo = (iso: string) => {
    const d = new Date(iso), now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return 'agora'
    if (diff < 60) return diff + 'min atras'
    if (diff < 1440) return Math.floor(diff / 60) + 'h atras'
    return Math.floor(diff / 1440) + 'd atras'
  }

  const getBubbleStyle = (role: string) => {
    if (role === 'user') return { align: 'flex-end' as const, bg: '#ef4239', border: 'none', label: 'Cliente' }
    if (role === 'atendente') return { align: 'flex-end' as const, bg: '#059669', border: 'none', label: 'Atendente' }
    return { align: 'flex-start' as const, bg: '#1e1e1e', border: '1px solid #292929', label: 'MEL' }
  }

  const toggleNotificacao = (id: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, ativo: !n.ativo } : n))
  }

  const salvarMensagem = (id: string, msg: string) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, mensagem: msg, preview: msg.substring(0, 80) + (msg.length > 80 ? '...' : '') } : n))
  }

  const ativasCount = notificacoes.filter(n => n.ativo).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, fontFamily: 'Mulish, sans-serif', color: '#fff' }}>
      {/* Header */}
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
