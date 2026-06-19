'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Search, Send, RefreshCw, Settings, Zap, Check, CheckCheck, Phone, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Conversa = {
  id: string
  estabelecimento_id: string
  cliente_nome: string
  cliente_telefone: string
  ultima_mensagem: string
  ultima_mensagem_at: string
  nao_lidas: number
  status: 'aberta' | 'resolvida' | 'aguardando'
  canal: string
}

type Mensagem = {
  id: string
  conversa_id: string
  conteudo: string
  tipo: 'recebida' | 'enviada' | 'sistema'
  lida: boolean
  created_at: string
}

const RESPOSTAS_RAPIDAS = [
  'Pedido Confirmado',
  'Saiu para Entrega',
  'Pedido Entregue',
  'Promocao do Dia',
  'Cardapio disponivel em: ',
  'Tempo estimado: 40 minutos',
]

function tempoRelativo(dt: string): string {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return diff + 'min'
  if (diff < 1440) return Math.floor(diff / 60) + 'h'
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function WhatsAppContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [conversas, setConversas] = useState<Conversa[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [novaMensagem, setNovaMensagem] = useState('')
  const [activeTab, setActiveTab] = useState<'conversas' | 'automacoes' | 'configuracoes'>('conversas')
  const [statusConexao, setStatusConexao] = useState<'conectado' | 'desconectado' | 'verificando'>('verificando')
  const [whatsappNum, setWhatsappNum] = useState('')

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id, whatsapp, evolution_instance').eq('slug', slug).single()
    if (data) {
      setEstabelecimentoId(data.id)
      setWhatsappNum(data.whatsapp || '')
      setStatusConexao(data.evolution_instance ? 'conectado' : 'desconectado')
    }
  }, [slug])

  const fetchConversas = useCallback(async (estId: string) => {
    const { data } = await supabase
      .from('conversas_ia')
      .select('*')
      .eq('estabelecimento_id', estId)
      .order('ultima_mensagem_at', { ascending: false })
      .limit(30)
    setConversas(data || [])
    if (data && data.length > 0 && !conversaSelecionada) {
      setConversaSelecionada(data[0])
    }
  }, [conversaSelecionada])

  const fetchMensagens = useCallback(async (conversaId: string) => {
    setLoadingMsgs(true)
    // Mark as read
    await supabase.from('conversas_ia').update({ nao_lidas: 0 }).eq('id', conversaId)
    setConversas(prev => prev.map(c => c.id === conversaId ? { ...c, nao_lidas: 0 } : c))
    setLoadingMsgs(false)
  }, [])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => { setLoading(true); await fetchConversas(estabelecimentoId); setLoading(false) }
    load()
    // Supabase Realtime
    const channel = supabase
      .channel('wa-' + estabelecimentoId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversas_ia', filter: 'estabelecimento_id=eq.' + estabelecimentoId }, () => { fetchConversas(estabelecimentoId) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [estabelecimentoId, fetchConversas])

  useEffect(() => {
    if (conversaSelecionada) fetchMensagens(conversaSelecionada.id)
  }, [conversaSelecionada, fetchMensagens])

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return
    const texto = novaMensagem
    setNovaMensagem('')
    // Registra mensagem enviada
    await supabase.from('conversas_ia').update({
      ultima_mensagem: texto,
      ultima_mensagem_at: new Date().toISOString()
    }).eq('id', conversaSelecionada.id)
    setConversas(prev => prev.map(c => c.id === conversaSelecionada.id ? { ...c, ultima_mensagem: texto, ultima_mensagem_at: new Date().toISOString() } : c))
    // TODO: enviar via Evolution API
  }

  const conversasFiltradas = conversas.filter(c =>
    c.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cliente_telefone?.includes(searchTerm)
  )

  const totalNaoLidas = conversas.reduce((acc, c) => acc + (c.nao_lidas || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #292929' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageCircle size={20} color="#ef4239" />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>WhatsApp Business</span>
          <span style={{ fontSize: '12px', color: '#666' }}>Atendimento e automacoes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {totalNaoLidas > 0 && (
            <span style={{ background: '#ef4239', color: '#fff', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 700 }}>{totalNaoLidas} nao lidas</span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusConexao === 'conectado' ? '#22c55e' : statusConexao === 'verificando' ? '#f59e0b' : '#666' }} />
            <span style={{ fontSize: '13px', color: statusConexao === 'conectado' ? '#22c55e' : '#999', fontWeight: 600 }}>
              {statusConexao === 'conectado' ? 'Conectado' : statusConexao === 'verificando' ? 'Verificando...' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #292929', paddingLeft: '20px' }}>
        {[
          { id: 'conversas', label: 'Conversas' },
          { id: 'automacoes', label: 'Automacoes' },
          { id: 'configuracoes', label: 'Configuracoes' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent', color: activeTab === tab.id ? '#ef4239' : '#999', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: 'Mulish, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'conversas' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Lista conversas */}
          <div style={{ width: '340px', borderRight: '1px solid #292929', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar conversa..."
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px 8px 32px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '13px' }}>Carregando conversas...</div>
              ) : conversasFiltradas.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <MessageCircle size={32} color="#333" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#666', fontSize: '13px' }}>
                    {conversas.length === 0 ? 'Nenhuma conversa ainda. As mensagens recebidas via WhatsApp aparecerao aqui.' : 'Nenhum resultado.'}
                  </p>
                </div>
              ) : conversasFiltradas.map(c => (
                <div key={c.id} onClick={() => setConversaSelecionada(c)}
                  style={{ display: 'flex', gap: '12px', padding: '14px', cursor: 'pointer', borderBottom: '1px solid #1f1f1f', background: conversaSelecionada?.id === c.id ? 'rgba(239,66,57,0.08)' : 'transparent', borderLeft: conversaSelecionada?.id === c.id ? '3px solid #ef4239' : '3px solid transparent' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#e6e6e6', flexShrink: 0 }}>
                    {c.cliente_nome?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>{c.cliente_nome || c.cliente_telefone}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>{c.ultima_mensagem_at ? tempoRelativo(c.ultima_mensagem_at) : ''}</span>
                        {(c.nao_lidas || 0) > 0 && (
                          <span style={{ background: '#22c55e', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{c.nao_lidas}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ultima_mensagem || '...'}</div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{c.cliente_telefone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Area da conversa */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!conversaSelecionada ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <div style={{ textAlign: 'center' }}>
                  <MessageCircle size={48} color="#333" style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '15px' }}>Selecione uma conversa</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header conversa */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #292929', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#e6e6e6' }}>
                      {conversaSelecionada.cliente_nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{conversaSelecionada.cliente_nome}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{conversaSelecionada.cliente_telefone}</div>
                    </div>
                  </div>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '6px', color: '#999', cursor: 'pointer', fontSize: '12px' }}>
                    <Phone size={12} /> Ligar
                  </button>
                </div>

                {/* Mensagens */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0d0d0d' }}>
                  {mensagens.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#444' }}>
                      <MessageCircle size={32} color="#222" style={{ marginBottom: '12px' }} />
                      <p style={{ fontSize: '13px' }}>Historico de mensagens aparecera aqui</p>
                      <p style={{ fontSize: '11px', color: '#333', marginTop: '6px' }}>Ultima mensagem: {conversaSelecionada.ultima_mensagem}</p>
                    </div>
                  ) : null}
                </div>

                {/* Respostas rapidas */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #1f1f1f', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {RESPOSTAS_RAPIDAS.map(r => (
                    <button key={r} onClick={() => setNovaMensagem(r)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '20px', color: '#999', cursor: 'pointer', fontSize: '11px', fontFamily: 'Mulish, sans-serif' }}>
                      <Zap size={10} color="#ef4239" /> {r}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderTop: '1px solid #292929', background: '#111' }}>
                  <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                    placeholder="Digite uma mensagem..."
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid #292929', borderRadius: '24px', padding: '10px 18px', color: '#e6e6e6', fontSize: '13px', outline: 'none', fontFamily: 'Mulish, sans-serif' }} />
                  <button onClick={enviarMensagem} disabled={!novaMensagem.trim()}
                    style={{ width: '42px', height: '42px', borderRadius: '50%', background: novaMensagem.trim() ? '#ef4239' : '#1a1a1a', border: 'none', cursor: novaMensagem.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} color={novaMensagem.trim() ? '#fff' : '#444'} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'automacoes' && (
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { titulo: 'Confirmacao de Pedido', desc: 'Envia mensagem automatica quando pedido e confirmado', ativo: true, icone: 'BAG' },
              { titulo: 'Saiu para Entrega', desc: 'Notifica cliente quando entregador sai com o pedido', ativo: true, icone: 'BIKE' },
              { titulo: 'Pedido Entregue', desc: 'Confirma entrega e solicita avaliacao', ativo: false, icone: 'CHECK' },
              { titulo: 'Boas-vindas', desc: 'Mensagem automatica para novos clientes', ativo: true, icone: 'WAVE' },
              { titulo: 'Cardapio do Dia', desc: 'Envia destaques do cardapio todos os dias', ativo: false, icone: 'MENU' },
              { titulo: 'Recuperar Clientes', desc: 'Mensagem para clientes que nao pedem ha 15 dias', ativo: false, icone: 'IDEA' },
            ].map((auto, i) => (
              <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: auto.ativo ? '#ef423922' : '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={16} color={auto.ativo ? '#ef4239' : '#555'} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>{auto.titulo}</span>
                    <div style={{ width: '36px', height: '20px', background: auto.ativo ? '#ef4239' : '#292929', borderRadius: '10px', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ position: 'absolute', top: '3px', left: auto.ativo ? '18px' : '3px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{auto.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'configuracoes' && (
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Settings size={16} color="#ef4239" />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#e6e6e6' }}>Conexao WhatsApp Business</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: '#111', borderRadius: '10px', padding: '14px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusConexao === 'conectado' ? '#22c55e' : '#ef4239', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>
                  {statusConexao === 'conectado' ? 'Conectado' : 'Nao conectado'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {whatsappNum ? 'Numero: ' + whatsappNum : 'Nenhum numero vinculado'}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Para conectar, acesse o painel da Evolution API e escaneie o QR Code com seu WhatsApp Business.
            </p>
            <button style={{ width: '100%', padding: '12px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'Mulish, sans-serif' }}>
              Conectar via QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <WhatsAppContent />
    </Suspense>
  )
}