'use client'

import { useState } from 'react'
import {
  HelpCircle, MessageCircle, Phone, Mail, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Clock, ExternalLink, BookOpen, Video,
  Zap, Shield, Send, User, FileText, Search
} from 'lucide-react'

const faqs = [
  {
    categoria: 'Primeiros Passos',
    perguntas: [
      {
        pergunta: 'Como cadastrar meu estabelecimento?',
        resposta: 'Acesse Configuracoes no menu lateral e preencha os dados do seu estabelecimento como nome, CNPJ, endereco, telefone e redes sociais. Nao esqueca de salvar as alteracoes.'
      },
      {
        pergunta: 'Como adicionar produtos ao cardapio?',
        resposta: 'Va em Cardapio > Produtos e clique em "+ Novo Produto". Preencha nome, preco, categoria e descricao. Voce tambem pode adicionar imagens e grupos de complementos.'
      },
      {
        pergunta: 'Como configurar as mesas do meu restaurante?',
        resposta: 'Acesse a pagina Mesas/Comandas e clique em "+ Nova Mesa". Informe o numero e a capacidade. As mesas apareceram no mapa para gerenciamento em tempo real.'
      }
    ]
  },
  {
    categoria: 'Pedidos e Delivery',
    perguntas: [
      {
        pergunta: 'Como gerenciar pedidos de delivery?',
        resposta: 'Na pagina Delivery voce visualiza todos os pedidos em tempo real organizados por status: Novo, Em Preparo, Saiu para Entrega e Entregue. Clique em cada pedido para ver detalhes e atualizar o status.'
      },
      {
        pergunta: 'O que e o KDS (Kitchen Display System)?',
        resposta: 'O KDS e uma tela para a cozinha que exibe os pedidos em tempo real. Acesse pelo menu KDS e use em qualquer dispositivo (tablet, TV ou monitor). Os pedidos aparecem automaticamente sem precisar recarregar a pagina.'
      },
      {
        pergunta: 'Como funciona o rastreamento de pedidos?',
        resposta: 'Cada pedido tem uma pagina publica de rastreamento acessivel pelo cliente. O link e gerado automaticamente e pode ser enviado via WhatsApp. O cliente ve o status do pedido em tempo real.'
      }
    ]
  },
  {
    categoria: 'Financeiro e Caixa',
    perguntas: [
      {
        pergunta: 'Como abrir e fechar o caixa?',
        resposta: 'Va em Caixa e clique em "Abrir Caixa". Informe o valor inicial em dinheiro. Para fechar, clique em "Fechar Caixa" e confira o resumo com todas as entradas e saidas do dia.'
      },
      {
        pergunta: 'Como registrar lancamentos financeiros?',
        resposta: 'Na pagina Financeiro voce pode registrar entradas (receitas) e saidas (despesas) manualmente. Os graficos mostram o fluxo de caixa mensal e o resultado liquido do periodo.'
      },
      {
        pergunta: 'Como funciona o Pix Online?',
        resposta: 'Configure sua chave Pix em Configuracoes > Pagamentos. Os clientes poderao pagar via Pix no cardapio digital. As transacoes aparecem automaticamente na pagina Pix Online.'
      }
    ]
  },
  {
    categoria: 'Cardapio Digital',
    perguntas: [
      {
        pergunta: 'Como compartilhar meu cardapio digital?',
        resposta: 'Acesse Meus Links no menu lateral. La voce encontra o link do seu cardapio digital que pode ser compartilhado por WhatsApp, Instagram ou qualquer rede social. O cardapio e atualizado automaticamente.'
      },
      {
        pergunta: 'Posso personalizar as cores do cardapio?',
        resposta: 'Sim! Em Configuracoes > Aparencia voce pode escolher a cor principal do seu cardapio digital. A mudanca e aplicada instantaneamente para todos os clientes.'
      },
      {
        pergunta: 'Como ativar ou desativar produtos?',
        resposta: 'Em Cardapio > Produtos clique no produto desejado e use o botao de ativar/desativar. Produtos inativos nao aparecem no cardapio digital mas ficam salvos no sistema.'
      }
    ]
  },
  {
    categoria: 'Conta e Planos',
    perguntas: [
      {
        pergunta: 'Como alterar minha senha?',
        resposta: 'Acesse Configuracoes > Conta e clique em "Alterar Senha". Voce recebera um email com as instrucoes para redefinir sua senha com seguranca.'
      },
      {
        pergunta: 'O VigorePro funciona em celular?',
        resposta: 'Sim! O VigorePro e totalmente responsivo e funciona em smartphones, tablets e computadores. Para PDV e KDS recomendamos tablets ou monitores maiores para melhor experiencia.'
      }
    ]
  }
]

const statusSistema = [
  { nome: 'API Principal', status: 'operacional', uptime: '99.9%' },
  { nome: 'Banco de Dados', status: 'operacional', uptime: '99.8%' },
  { nome: 'Cardapio Digital', status: 'operacional', uptime: '100%' },
  { nome: 'Notificacoes', status: 'operacional', uptime: '99.7%' },
  { nome: 'Pix Online', status: 'operacional', uptime: '99.5%' },
]

export default function SuportePage() {
  const [abertos, setAbertos] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviado, setEnviado] = useState(false)

  const toggle = (id: string) => {
    setAbertos(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const faqsFiltradas = faqs.map(cat => ({
    ...cat,
    perguntas: cat.perguntas.filter(p =>
      p.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
      p.resposta.toLowerCase().includes(busca.toLowerCase())
    )
  })).filter(cat => cat.perguntas.length > 0)

  const enviarMensagem = () => {
    if (!assunto || !mensagem) return
    setEnviado(true)
    setAssunto('')
    setMensagem('')
    setTimeout(() => setEnviado(false), 4000)
  }

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', backgroundColor: '#111', minHeight: '100vh', color: '#fff', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={20} color="#ef4239" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Central de Suporte</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Tire suas duvidas ou entre em contato com nossa equipe</p>
          </div>
        </div>
      </div>

      {/* Cards de Contato Rapido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        <a
          href="https://wa.me/5511999999999?text=Ola,%20preciso%20de%20suporte%20no%20VigorePro"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color 0.2s' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} color="#22c55e" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>WhatsApp</p>
            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Resposta em minutos</p>
          </div>
          <ExternalLink size={14} color="#555" style={{ marginLeft: 'auto' }} />
        </a>

        <a
          href="mailto:suporte@vigorepro.com.br"
          style={{ textDecoration: 'none', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#1a1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} color="#6366f1" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>E-mail</p>
            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>suporte@vigorepro.com.br</p>
          </div>
          <ExternalLink size={14} color="#555" style={{ marginLeft: 'auto' }} />
        </a>

        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#2e1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#ef4239" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Horario</p>
            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Seg-Sex 08h-22h | Sab 08h-18h</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#1a2e20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#f59e0b" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>Tempo Medio</p>
            <p style={{ margin: 0, fontSize: 11, color: '#888' }}>Resposta em ate 2 horas</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* FAQ */}
        <div>
          {/* Busca */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={16} color="#555" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar em perguntas frequentes..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 36px', backgroundColor: '#1a1a1a',
                border: '1px solid #292929', borderRadius: 8, color: '#fff', fontSize: 14,
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#ef4239" />
            Perguntas Frequentes
          </h2>

          {faqsFiltradas.length === 0 ? (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 40, textAlign: 'center' }}>
              <HelpCircle size={32} color="#444" style={{ marginBottom: 12 }} />
              <p style={{ color: '#888', margin: 0 }}>Nenhuma pergunta encontrada para "{busca}"</p>
            </div>
          ) : (
            faqsFiltradas.map(cat => (
              <div key={cat.categoria} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4239', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  {cat.categoria}
                </p>
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden' }}>
                  {cat.perguntas.map((faq, idx) => {
                    const id = `${cat.categoria}-${idx}`
                    const aberto = abertos.includes(id)
                    return (
                      <div key={idx} style={{ borderBottom: idx < cat.perguntas.length - 1 ? '1px solid #292929' : 'none' }}>
                        <button
                          onClick={() => toggle(id)}
                          style={{
                            width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 12
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'left' }}>{faq.pergunta}</span>
                          {aberto ? <ChevronUp size={16} color="#ef4239" /> : <ChevronDown size={16} color="#666" />}
                        </button>
                        {aberto && (
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #222' }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{faq.resposta}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Coluna Direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Status do Sistema */}
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} color="#ef4239" />
              Status do Sistema
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {statusSistema.map(s => (
                <div key={s.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                    <span style={{ fontSize: 13, color: '#ccc' }}>{s.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>{s.uptime}</span>
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Operacional</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #292929', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} color="#22c55e" />
              <span style={{ fontSize: 12, color: '#22c55e' }}>Todos os servicos operacionais</span>
            </div>
          </div>

          {/* Formulario de Contato */}
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} color="#ef4239" />
              Enviar Mensagem
            </h3>

            {enviado ? (
              <div style={{ backgroundColor: '#1a2e1a', border: '1px solid #22c55e', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <CheckCircle size={28} color="#22c55e" style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Mensagem enviada!</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>Nossa equipe retornara em breve.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Assunto</label>
                  <input
                    type="text"
                    value={assunto}
                    onChange={e => setAssunto(e.target.value)}
                    placeholder="Ex: Problema no cardapio"
                    style={{
                      width: '100%', padding: '9px 12px', backgroundColor: '#111',
                      border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13,
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Mensagem</label>
                  <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    placeholder="Descreva sua duvida ou problema..."
                    rows={5}
                    style={{
                      width: '100%', padding: '9px 12px', backgroundColor: '#111',
                      border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif'
                    }}
                  />
                </div>
                <button
                  onClick={enviarMensagem}
                  disabled={!assunto || !mensagem}
                  style={{
                    padding: '10px 16px', backgroundColor: assunto && mensagem ? '#ef4239' : '#333',
                    border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: assunto && mensagem ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <Send size={14} />
                  Enviar Mensagem
                </button>
              </div>
            )}
          </div>

          {/* Links Uteis */}
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} color="#ef4239" />
              Links Uteis
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Manual do Usuario', icon: BookOpen, href: '/dashboard/manual' },
                { label: 'Tutorial em Video', icon: Video, href: '#' },
                { label: 'Novidades da Plataforma', icon: Zap, href: '#' },
              ].map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    backgroundColor: '#111', border: '1px solid #292929', borderRadius: 6,
                    textDecoration: 'none', color: '#ccc', fontSize: 13, transition: 'border-color 0.2s'
                  }}
                >
                  <Icon size={14} color="#ef4239" />
                  {label}
                  <ExternalLink size={12} color="#444" style={{ marginLeft: 'auto' }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
