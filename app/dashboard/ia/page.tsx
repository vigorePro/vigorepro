'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, RefreshCw, Users, TrendingUp, Clock, Bot, Zap, Star, AlertCircle, X } from 'lucide-react'

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
  role: 'user' | 'assistant'
  content: string
  criado_em: string
}

function IAContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [totalConversas, setTotalConversas] = useState(0)
  const [totalPedidosIA, setTotalPedidosIA] = useState(0)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'painel'|'teste'>('painel')

  const [testeMensagens, setTesteMensagens] = useState<MensagemChat[]>([
    { role: 'assistant', content: 'Ola! Sou a MEL. Este e o modo de teste Ã¢ÂÂ experimente conversar comigo como se fosse um cliente! :)' }
  ])
  const [testeInput, setTesteInput] = useState('')
  const [testeCarregando, setTesteCarregando] = useState(false)
  const [testeSessionId] = useState(() => 'teste_' + Date.now())
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null)
  const [mensagensConversa, setMensagensConversa] = useState<MensagemHistorico[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function carregarEstab() {
      if (slug && slug !== 'default') {
        const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
        if (data) { setEstabelecimentoId(data.id); return }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: perfil } = await supabase
        .from('estabelecimentos')
        .select('id')
        .eq('user_id', session.user.id)
        .single()
      if (perfil) setEstabelecimentoId(perfil.id)
    }
    carregarEstab()
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setLoading(true)
    try {
      const { data: msgs } = await supabase
        .from('conversas_ia')
        .select('telefone, content, criado_em')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('criado_em', { ascending: false })

      if (msgs) {
        const map = new Map<string, { total: number, ultima: string, criado_em: string }>()
        msgs.forEach((m: { telefone: string, content: string, criado_em: string }) => {
          if (!map.has(m.telefone)) {
            map.set(m.telefone, { total: 0, ultima: '', criado_em: m.criado_em })
          }
          const entry = map.get(m.telefone)!
          entry.total++
          if (!entry.ultima) entry.ultima = m.content
        })
        const lista: Conversa[] = Array.from(map.entries()).map(([tel, v]) => ({
          telefone: tel,
          total_mensagens: v.total,
          ultima_mensagem: v.ultima,
          criado_em: v.criado_em
        }))
        setConversas(lista.slice(0, 20))
        setTotalConversas(lista.length)
      }

      const { count } = await supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId)
      setTotalPedidosIA(count || 0)
    } finally {
      setLoading(false)
    }
  }, [estabelecimentoId])

  useEffect(() => {
    if (!estabelecimentoId) return
    fetchDados()
    const channel = supabase
      .channel('ia-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas_ia', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => fetchDados())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchDados])

  const enviarTesteChat = async () => {
    if (!testeInput.trim() || testeCarregando) return
    const msg = testeInput.trim()
    setTesteInput('')
    setTesteMensagens(prev => [...prev, { role: 'user', content: msg }])
    setTesteCarregando(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg, slug, sessionId: testeSessionId })
      })
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
    if (tel.startsWith('web_') || tel.startsWith('chat_') || tel.startsWith('teste_')) {
      return { label: 'Chat Web', cor: '#3b82f6' }
    }
    return { label: 'WhatsApp', cor: '#25d366' }
  }

  const abrirConversa = async (conversa: Conversa) => {
    setConversaAberta(conversa)
    setLoadingMensagens(true)
    const { data } = await supabase
      .from('conversas_ia')
      .select('role, content, criado_em')
      .eq('estabelecimento_id', estabelecimentoId!)
      .eq('telefone', conversa.telefone)
      .order('criado_em', { ascending: true })
    setMensagensConversa(data || [])
    setLoadingMensagens(false)
    setTimeout(() => painelRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 100)
  }

  const formatarTempo = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return 'agora'
    if (diff < 60) return diff + 'min atras'
    if (diff < 1440) return Math.floor(diff/60) + 'h atras'
    return Math.floor(diff/1440) + 'd atras'
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, fontFamily: 'Mulish, sans-serif', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4239, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Inteligencia Artificial</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>MEL Ã¢ÂÂ Assistente virtual powered by Claude AI</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>IA Online</span>
          <button onClick={fetchDados} style={{ background: 'none', border: '1px solid #292929', borderRadius: 8, padding: '6px 12px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
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
        {(['painel', 'teste'] as const).map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Mulish, sans-serif',
            background: abaAtiva === aba ? '#ef4239' : 'transparent', color: abaAtiva === aba ? '#fff' : '#9ca3af', transition: 'all 0.2s'
          }}>
            {aba === 'painel' ? 'Conversas Recentes' : 'Testar MEL'}
          </button>
        ))}
      </div>

      {abaAtiva === 'painel' && (
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} color="#9ca3af" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Historico de Conversas</span>
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{totalConversas} sessoes</span>
          </div>
          {conversas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Nenhuma conversa ainda</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>As conversas dos clientes aparecerao aqui em tempo real</p>
            </div>
          ) : (
            <div>
              {conversas.map((c, i) => (
                <div key={i} onClick={() => abrirConversa(c)} style={{ padding: '14px 20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background='#222')} onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={16} color="#6b7280" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{formatarTelefone(c.telefone)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {formatarTempo(c.criado_em)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                      {c.ultima_mensagem.substring(0, 80)}{c.ultima_mensagem.length > 80 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <div style={{ background: getCanalTelefone(c.telefone).cor + '22', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: getCanalTelefone(c.telefone).cor, fontWeight: 600 }}>
                      {getCanalTelefone(c.telefone).label}
                    </div>
                    <div style={{ background: '#292929', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#9ca3af' }}>
                      {c.total_mensagens} msgs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'teste' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 480 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Chat de Teste Ã¢ÂÂ MEL</span>
              <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>Simule a experiencia do cliente</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testeMensagens.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4239, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#fff', fontWeight: 700 }}>M</div>
                  )}
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? '#ef4239' : '#292929', color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{m.content}</div>
                </div>
              ))}
              {testeCarregando && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4239, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>M</div>
                  <div style={{ background: '#292929', borderRadius: '16px 16px 16px 4px', padding: '10px 16px', color: '#9ca3af', fontSize: 18 }}>...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #292929', display: 'flex', gap: 10 }}>
              <input value={testeInput} onChange={e => setTesteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarTesteChat()} placeholder="Simule uma mensagem de cliente..." style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: 24, padding: '10px 16px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Mulish, sans-serif' }} />
              <button onClick={enviarTesteChat} disabled={testeCarregando} style={{ width: 40, height: 40, borderRadius: '50%', background: '#ef4239', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertCircle size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Frases de Teste</span>
              </div>
              {['Ola, quero pedir um bolo', 'Qual o preco do pudim?', 'Voces fazem entrega?', 'Quero 10 salgados mistos', 'Qual o horario de funcionamento?'].map((dica, i) => (
                <button key={i} onClick={() => setTesteInput(dica)} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', marginBottom: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 12, fontFamily: 'Mulish, sans-serif' }}>
                  {dica}
                </button>
              ))}
            </div>
            <div style={{ background: '#1a0a0a', border: '1px solid #3a1212', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Bot size={16} color="#ef4239" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4239' }}>Sobre a MEL</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>A MEL e uma IA treinada para o seu negocio. Ela conhece o cardapio, precos e pode registrar pedidos automaticamente no Supabase em tempo real.</p>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* PAINEL LATERAL DE CONVERSA */}
      {conversaAberta && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: '#111', borderLeft: '1px solid #292929', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)' }}>
          {/* Header do painel */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} color="#9ca3af" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{formatarTelefone(conversaAberta.telefone)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ background: getCanalTelefone(conversaAberta.telefone).cor + '22', borderRadius: 20, padding: '1px 8px', fontSize: 11, color: getCanalTelefone(conversaAberta.telefone).cor, fontWeight: 600 }}>
                    {getCanalTelefone(conversaAberta.telefone).label}
                  </div>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{conversaAberta.total_mensagens} mensagens</span>
                </div>
              </div>
            </div>
            <button onClick={() => setConversaAberta(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={painelRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingMensagens ? (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 40, fontSize: 13 }}>Carregando mensagens...</div>
            ) : mensagensConversa.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', marginTop: 40, fontSize: 13 }}>Nenhuma mensagem encontrada</div>
            ) : (
              mensagensConversa.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? '#ef4239' : '#1e1e1e', color: '#fff', fontSize: 13, lineHeight: 1.5, border: m.role === 'assistant' ? '1px solid #292929' : 'none' }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                    {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {m.role === 'user' ? 'Cliente' : 'MEL'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function IAPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 40, height: 40, border: '4px solid #ef4239', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>}>
      <IAContent />
    </Suspense>
  )
}
