'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Headphones, MessageCircle, ExternalLink, ChevronDown, ChevronUp, Search, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

const FAQS = [
  { id: 1, q: 'Como adicionar um novo produto ao cardápio?', a: 'Acesse Cardápio > Produtos e clique em "+ Novo Produto". Preencha nome, descrição, preço e foto. Clique em Salvar.' },
  { id: 2, q: 'Como configurar a área de entrega?', a: 'Vá em Cardápio Digital > Área de Entrega. Adicione bairros/regiões com a taxa e tempo estimado de entrega.' },
  { id: 3, q: 'Como integrar com o iFood?', a: 'Acesse Aplicativos > iFood e clique em Conectar. Você será redirecionado ao portal do iFood para autorizar a integração.' },
  { id: 4, q: 'Como imprimir comandas ou pedidos?', a: 'No módulo PDV ou Mesas/Comandas, cada pedido tem um botão de impressão. Configure a impressora em Configurações > Impressora.' },
  { id: 5, q: 'Como exportar relatórios?', a: 'Em Histórico de Vendas, clique no botão Exportar (ícone de download) para gerar um arquivo CSV com todos os pedidos.' },
  { id: 6, q: 'O sistema funciona offline?', a: 'O VigorePro requer conexão com a internet. Em caso de instabilidade, os dados são sincronizados automaticamente quando a conexão for restabelecida.' },
]

const TICKETS = [
  { id: 1, titulo: 'Erro ao abrir o PDV', status: 'resolvido', data: '10/06/2026', resposta: 'Resolvido com atualização do navegador.' },
  { id: 2, titulo: 'Integração com iFood não funciona', status: 'em_atendimento', data: '17/06/2026', resposta: 'Aguardando resposta da equipe iFood.' },
]

const STATUS_TICKET: Record<string, { label: string; cor: string; icon: React.ElementType }> = {
  resolvido: { label: 'Resolvido', cor: '#22c55e', icon: CheckCircle2 },
  em_atendimento: { label: 'Em Atendimento', cor: '#f59e0b', icon: Clock },
  aguardando: { label: 'Aguardando', cor: '#6b7280', icon: AlertCircle },
}

function SuporteContent() {
  const searchParams = useSearchParams()
  const [faqAberto, setFaqAberto] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [novoTicket, setNovoTicket] = useState(false)
  const [ticketForm, setTicketForm] = useState({ titulo: '', descricao: '', categoria: 'Técnico' })
  const [enviado, setEnviado] = useState(false)

  const faqsFiltrados = FAQS.filter(f => f.q.toLowerCase().includes(busca.toLowerCase()) || f.a.toLowerCase().includes(busca.toLowerCase()))

  const enviarTicket = () => {
    if (!ticketForm.titulo) return
    setEnviado(true)
    setNovoTicket(false)
    setTimeout(() => setEnviado(false), 4000)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', backgroundColor: '#111', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' as const }
  const cardStyle: React.CSSProperties = { backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '16px' }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px', maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Headphones size={26} color='#ef4239' />
        <div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Suporte</h1>
          <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Central de ajuda e atendimento</p>
        </div>
      </div>

      {enviado && (
        <div style={{ backgroundColor: '#22c55e20', border: '1px solid #22c55e40', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#22c55e' }}>
          <CheckCircle2 size={18} /> Ticket aberto com sucesso! Nossa equipe responderá em até 24 horas.
        </div>
      )}

      {/* Canais de contato */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[
          { titulo: 'Chat ao Vivo', desc: 'Disponível seg-sex 9h-18h', cor: '#25d366', icon: MessageCircle, label: 'Iniciar Chat', url: '#' },
          { titulo: 'WhatsApp', desc: '(11) 94567-8900', cor: '#25d366', icon: MessageCircle, label: 'Enviar Mensagem', url: 'https://wa.me/5511945678900' },
          { titulo: 'E-mail', desc: 'suporte@vigorepro.com.br', cor: '#6366f1', icon: Send, label: 'Enviar E-mail', url: 'mailto:suporte@vigorepro.com.br' },
        ].map(c => {
          const Icon = c.icon
          return (
            <div key={c.titulo} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', textAlign: 'center' as const }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: c.cor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon size={20} color={c.cor} />
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{c.titulo}</div>
              <div style={{ color: '#888', fontSize: '12px', marginBottom: '14px' }}>{c.desc}</div>
              <a href={c.url} target='_blank' rel='noopener noreferrer' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', backgroundColor: c.cor + '20', color: c.cor, fontSize: '13px', fontWeight: 600, textDecoration: 'none', border: `1px solid ${c.cor}40` }}>
                {c.label} <ExternalLink size={12} />
              </a>
            </div>
          )
        })}
      </div>

      {/* Meus tickets */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Meus Tickets</span>
          <button onClick={() => setNovoTicket(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
            <Send size={13} /> Abrir Ticket
          </button>
        </div>
        {novoTicket && (
          <div style={{ backgroundColor: '#111', border: '1px solid #ef4239', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
              <input value={ticketForm.titulo} onChange={e => setTicketForm({...ticketForm, titulo: e.target.value})} placeholder='Título do problema...' style={inputStyle} />
              <textarea value={ticketForm.descricao} onChange={e => setTicketForm({...ticketForm, descricao: e.target.value})} placeholder='Descreva o problema com detalhes...' rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={enviarTicket} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Enviar</button>
                <button onClick={() => setNovoTicket(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #292929', backgroundColor: 'transparent', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        {TICKETS.map(t => {
          const st = STATUS_TICKET[t.status]
          const Icon = st.icon
          return (
            <div key={t.id} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #222', marginBottom: '8px', backgroundColor: '#111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#e6e6e6', fontWeight: 500, fontSize: '14px' }}>{t.titulo}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, backgroundColor: st.cor + '20', color: st.cor }}>
                  <Icon size={11} />{st.label}
                </span>
              </div>
              <div style={{ color: '#555', fontSize: '12px' }}>{t.data} · {t.resposta}</div>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Search size={16} color='#ef4239' />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Perguntas Frequentes</span>
        </div>
        <div style={{ position: 'relative' as const, marginBottom: '16px' }}>
          <Search size={14} style={{ position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder='Buscar dúvida...' style={{ ...inputStyle, paddingLeft: '34px' }} />
        </div>
        {faqsFiltrados.map(f => (
          <div key={f.id} style={{ borderBottom: '1px solid #222', paddingBottom: '2px', marginBottom: '4px' }}>
            <button onClick={() => setFaqAberto(faqAberto === f.id ? null : f.id)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' as const }}>
              <span style={{ color: '#e6e6e6', fontSize: '14px', fontWeight: 500, fontFamily: 'Mulish, sans-serif' }}>{f.q}</span>
              {faqAberto === f.id ? <ChevronUp size={16} color='#888' /> : <ChevronDown size={16} color='#888' />}
            </button>
            {faqAberto === f.id && (
              <p style={{ color: '#888', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6', paddingRight: '24px' }}>{f.a}</p>
            )}
          </div>
        ))}
        {faqsFiltrados.length === 0 && <p style={{ color: '#444', fontSize: '13px', textAlign: 'center' as const, padding: '20px' }}>Nenhuma dúvida encontrada. Tente outra busca ou abra um ticket.</p>}
      </div>
    </div>
  )
}

export default function SuportePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <SuporteContent />
    </Suspense>
  )
}
