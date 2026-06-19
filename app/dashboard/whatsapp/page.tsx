'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle, Send, Phone, Check, CheckCheck, Clock, Users, Zap, Plus, Bot, Bell } from 'lucide-react'

const MENSAGENS_RAPIDAS = [
  { id: 1, titulo: 'Pedido Confirmado', texto: 'Olá {nome}! Seu pedido #{numero} foi confirmado e está sendo preparado. Tempo estimado: {tempo} minutos. 🍽️' },
  { id: 2, titulo: 'Saiu para Entrega', texto: 'Seu pedido #{numero} saiu para entrega! 🛵 O entregador chega em aproximadamente {tempo} minutos.' },
  { id: 3, titulo: 'Pedido Entregue', texto: 'Pedido #{numero} entregue com sucesso! 🎉 Obrigado pela preferência! Avalie nosso serviço.' },
  { id: 4, titulo: 'Promoção do Dia', texto: '🔥 Oferta especial hoje! {descricao}. Válido até {hora}. Acesse nosso cardápio: {link}' },
]

const CONVERSAS = [
  { id: 1, nome: 'João Silva', tel: '(11) 99999-1111', ultima: 'Quero fazer um pedido', hora: '20:45', naoLidas: 2, status: 'online' },
  { id: 2, nome: 'Maria Santos', tel: '(11) 99999-2222', ultima: 'Pedido entregue, obrigada!', hora: '20:30', naoLidas: 0, status: 'offline' },
  { id: 3, nome: 'Pedro Costa', tel: '(11) 99999-3333', ultima: 'Qual o tempo de entrega?', hora: '20:15', naoLidas: 1, status: 'offline' },
  { id: 4, nome: 'Ana Lima', tel: '(11) 99999-4444', ultima: 'Tem opção vegana?', hora: '19:58', naoLidas: 0, status: 'offline' },
]

const MSGS_CONVERSA = [
  { id: 1, texto: 'Olá! Gostaria de fazer um pedido', de: 'cliente', hora: '20:40', lida: true },
  { id: 2, texto: 'Olá João! Que bom que entrou em contato 😊 O que você vai querer?', de: 'eu', hora: '20:41', lida: true },
  { id: 3, texto: 'Quero 2 X-Burguer e 2 Coca-Cola 600ml', de: 'cliente', hora: '20:43', lida: true },
  { id: 4, texto: 'Perfeito! Seu pedido ficará R$ 89,00. Confirma?', de: 'eu', hora: '20:44', lida: true },
  { id: 5, texto: 'Sim, pode confirmar! Endereço: Rua das Flores, 123', de: 'cliente', hora: '20:45', lida: false },
]

function WhatsAppContent() {
  const searchParams = useSearchParams()
  const [conversaSelecionada, setConversaSelecionada] = useState(CONVERSAS[0])
  const [mensagem, setMensagem] = useState('')
  const [msgs, setMsgs] = useState(MSGS_CONVERSA)
  const [abaAtiva, setAbaAtiva] = useState<'chat' | 'automacoes' | 'configuracoes'>('chat')
  const [numeroBusiness, setNumeroBusiness] = useState('(11) 94567-8900')
  const [autoResposta, setAutoResposta] = useState(true)

  const enviar = () => {
    if (!mensagem.trim()) return
    setMsgs([...msgs, { id: Date.now(), texto: mensagem, de: 'eu', hora: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), lida: true }])
    setMensagem('')
  }

  const tabStyle = (aba: string): React.CSSProperties => ({
    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
    color: abaAtiva === aba ? '#ef4239' : '#888',
    borderBottom: abaAtiva === aba ? '2px solid #ef4239' : '2px solid transparent',
    fontSize: '13px', fontWeight: abaAtiva === aba ? 600 : 400,
    fontFamily: 'Mulish, sans-serif'
  })

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #292929', backgroundColor: '#111', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <MessageCircle size={24} color='#25d366' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>WhatsApp Business</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Atendimento e automações</p>
          </div>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', backgroundColor: '#25d36620', color: '#25d366', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#25d366' }} />
            Conectado
          </span>
        </div>
        <div style={{ display: 'flex' }}>
          {(['chat', 'automacoes', 'configuracoes'] as const).map(aba => (
            <button key={aba} onClick={() => setAbaAtiva(aba)} style={tabStyle(aba)}>
              {aba === 'chat' ? 'Conversas' : aba === 'automacoes' ? 'Automações' : 'Configurações'}
            </button>
          ))}
        </div>
      </div>

      {/* ABA CHAT */}
      {abaAtiva === 'chat' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
          {/* Lista de conversas */}
          <div style={{ width: '300px', borderRight: '1px solid #292929', overflowY: 'auto' as const, flexShrink: 0 }}>
            <div style={{ padding: '12px' }}>
              <input placeholder='Buscar conversa...' style={{
                width: '100%', padding: '8px 12px', backgroundColor: '#1a1a1a',
                border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6',
                fontSize: '13px', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' as const
              }} />
            </div>
            {CONVERSAS.map(c => (
              <div key={c.id} onClick={() => setConversaSelecionada(c)} style={{
                padding: '14px 16px', cursor: 'pointer',
                backgroundColor: conversaSelecionada.id === c.id ? '#1a1a1a' : 'transparent',
                borderBottom: '1px solid #1a1a1a',
                display: 'flex', gap: '12px', alignItems: 'center'
              }}>
                <div style={{ position: 'relative' as const, flexShrink: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#25d36630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366', fontWeight: 700, fontSize: '15px' }}>
                    {c.nome.charAt(0)}
                  </div>
                  {c.status === 'online' && <span style={{ position: 'absolute' as const, bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#25d366', border: '2px solid #111' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e6e6e6', fontSize: '14px', fontWeight: 500 }}>{c.nome}</span>
                    <span style={{ color: '#555', fontSize: '11px' }}>{c.hora}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.ultima}</span>
                    {c.naoLidas > 0 && <span style={{ backgroundColor: '#25d366', color: '#fff', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{c.naoLidas}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const }}>
            {/* Header conversa */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#25d36630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25d366', fontWeight: 700 }}>
                {conversaSelecionada.nome.charAt(0)}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{conversaSelecionada.nome}</div>
                <div style={{ color: '#888', fontSize: '12px' }}>{conversaSelecionada.tel}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button style={{ background: 'none', border: '1px solid #292929', borderRadius: '8px', padding: '6px 12px', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Mulish, sans-serif' }}>
                  <Phone size={13} /> Ligar
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div style={{ flex: 1, overflowY: 'auto' as const, padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px', backgroundColor: '#0d0d0d' }}>
              {msgs.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: m.de === 'eu' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: m.de === 'eu' ? '#25d36620' : '#1a1a1a',
                    border: m.de === 'eu' ? '1px solid #25d36640' : '1px solid #292929',
                  }}>
                    <p style={{ color: '#e6e6e6', fontSize: '14px', margin: '0 0 4px', lineHeight: '1.4' }}>{m.texto}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#555', fontSize: '11px' }}>{m.hora}</span>
                      {m.de === 'eu' && (m.lida ? <CheckCheck size={12} color='#25d366' /> : <Check size={12} color='#555' />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input mensagem */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #292929', backgroundColor: '#111' }}>
              {/* Mensagens rapidas */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto' as const }}>
                {MENSAGENS_RAPIDAS.map(mr => (
                  <button key={mr.id} onClick={() => setMensagem(mr.texto)} style={{
                    padding: '4px 10px', borderRadius: '999px', border: '1px solid #292929',
                    backgroundColor: '#1a1a1a', color: '#888', fontSize: '12px',
                    cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'Mulish, sans-serif'
                  }}>
                    ⚡ {mr.titulo}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && enviar()}
                  placeholder='Digite uma mensagem...'
                  style={{ flex: 1, padding: '10px 14px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}
                />
                <button onClick={enviar} style={{
                  padding: '10px 18px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#25d366', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Mulish, sans-serif'
                }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA AUTOMACOES */}
      {abaAtiva === 'automacoes' && (
        <div style={{ padding: '24px', maxWidth: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color='#ef4239' />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Mensagens Automáticas</span>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
              <Plus size={14} /> Nova Automação
            </button>
          </div>
          {MENSAGENS_RAPIDAS.map(mr => (
            <div key={mr.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={14} color='#f59e0b' />
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{mr.titulo}</span>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#22c55e20', color: '#22c55e', fontSize: '11px', fontWeight: 600 }}>Ativo</span>
              </div>
              <p style={{ color: '#888', fontSize: '13px', margin: 0, backgroundColor: '#111', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', lineHeight: '1.5' }}>{mr.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* ABA CONFIGURACOES */}
      {abaAtiva === 'configuracoes' && (
        <div style={{ padding: '24px', maxWidth: '600px' }}>
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Phone size={16} color='#ef4239' />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Número Business</span>
            </div>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Número de telefone conectado</label>
            <input value={numeroBusiness} onChange={e => setNumeroBusiness(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', backgroundColor: '#111', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' as const }} />
          </div>
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Resposta Automática</div>
                <div style={{ color: '#888', fontSize: '12px' }}>Responder automaticamente fora do horário</div>
              </div>
              <button onClick={() => setAutoResposta(!autoResposta)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: autoResposta ? '#22c55e' : '#444' }}>
                {autoResposta ? <Bell size={28} /> : <Bell size={28} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <WhatsAppContent />
    </Suspense>
  )
}
