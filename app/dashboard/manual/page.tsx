'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpenText, Search, ChevronRight, ChevronDown, Play, ExternalLink, BookOpen, Video, FileText, Star } from 'lucide-react'

const CAPITULOS = [
  {
    id: 1, titulo: 'Primeiros Passos', icone: '🚀',
    artigos: [
      { id: 1, titulo: 'Como configurar seu estabelecimento', tempo: '5 min', tipo: 'artigo', popular: true },
      { id: 2, titulo: 'Adicionando produtos ao cardápio', tempo: '8 min', tipo: 'video', popular: true },
      { id: 3, titulo: 'Configurando horários de atendimento', tempo: '3 min', tipo: 'artigo', popular: false },
    ]
  },
  {
    id: 2, titulo: 'Cardápio Digital', icone: '🌐',
    artigos: [
      { id: 4, titulo: 'Personalizando cores e aparência', tempo: '4 min', tipo: 'artigo', popular: false },
      { id: 5, titulo: 'Configurando área de entrega', tempo: '6 min', tipo: 'video', popular: true },
      { id: 6, titulo: 'Criando cupons de desconto', tempo: '5 min', tipo: 'artigo', popular: false },
    ]
  },
  {
    id: 3, titulo: 'Gestão de Pedidos', icone: '📦',
    artigos: [
      { id: 7, titulo: 'Como funciona o PDV', tempo: '10 min', tipo: 'video', popular: true },
      { id: 8, titulo: 'Gerenciando mesas e comandas', tempo: '7 min', tipo: 'artigo', popular: false },
      { id: 9, titulo: 'KDS - Kitchen Display System', tempo: '5 min', tipo: 'video', popular: false },
    ]
  },
  {
    id: 4, titulo: 'Financeiro e Relatórios', icone: '💰',
    artigos: [
      { id: 10, titulo: 'Entendendo o Histórico de Vendas', tempo: '6 min', tipo: 'artigo', popular: false },
      { id: 11, titulo: 'Pix Online e recebimentos', tempo: '4 min', tipo: 'artigo', popular: false },
      { id: 12, titulo: 'Analisando o Desempenho', tempo: '8 min', tipo: 'video', popular: true },
    ]
  },
  {
    id: 5, titulo: 'Integrações', icone: '🔗',
    artigos: [
      { id: 13, titulo: 'Integrando com iFood', tempo: '10 min', tipo: 'video', popular: true },
      { id: 14, titulo: 'Configurando WhatsApp Business', tempo: '6 min', tipo: 'artigo', popular: false },
      { id: 15, titulo: 'Mercado Pago e pagamentos', tempo: '5 min', tipo: 'artigo', popular: false },
    ]
  },
]

function ManualContent() {
  const searchParams = useSearchParams()
  const [abertos, setAbertos] = useState<Set<number>>(new Set([1]))
  const [busca, setBusca] = useState('')
  const [artigoAtivo, setArtigoAtivo] = useState<{id:number;titulo:string;tempo:string;tipo:string} | null>(null)

  const toggleCap = (id: number) => {
    const novo = new Set(abertos)
    novo.has(id) ? novo.delete(id) : novo.add(id)
    setAbertos(novo)
  }

  const todosArtigos = CAPITULOS.flatMap(c => c.artigos)
  const populares = todosArtigos.filter(a => a.popular)

  const capsFiltrados = busca
    ? CAPITULOS.map(c => ({ ...c, artigos: c.artigos.filter(a => a.titulo.toLowerCase().includes(busca.toLowerCase())) })).filter(c => c.artigos.length > 0)
    : CAPITULOS

  const cardStyle: React.CSSProperties = { backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BookOpenText size={26} color='#ef4239' />
        <div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Manual do Sistema</h1>
          <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Guias e tutoriais para usar o VigorePro</p>
        </div>
      </div>

      {/* Artigo aberto */}
      {artigoAtivo ? (
        <div style={cardStyle}>
          <div style={{ padding: '20px', borderBottom: '1px solid #292929', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setArtigoAtivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Mulish, sans-serif' }}>
              ← Voltar
            </button>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>{artigoAtivo.titulo}</h2>
            <span style={{ marginLeft: 'auto', color: '#888', fontSize: '12px' }}>⏱ {artigoAtivo.tempo} de leitura</span>
          </div>
          <div style={{ padding: '24px' }}>
            {artigoAtivo.tipo === 'video' ? (
              <div style={{ backgroundColor: '#000', borderRadius: '10px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid #292929' }}>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ef423920', border: '2px solid #ef4239', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Play size={28} color='#ef4239' fill='#ef4239' />
                  </div>
                  <p style={{ color: '#888', fontSize: '14px' }}>Clique para reproduzir o vídeo tutorial</p>
                </div>
              </div>
            ) : null}
            <div style={{ color: '#e6e6e6', fontSize: '15px', lineHeight: '1.8' }}>
              <p>Este guia mostra passo a passo como <strong style={{ color: '#fff' }}>{artigoAtivo.titulo.toLowerCase()}</strong> no VigorePro.</p>
              <h3 style={{ color: '#fff', fontSize: '16px', marginTop: '20px' }}>1. Acesso ao módulo</h3>
              <p style={{ color: '#888' }}>Navegue pelo menu lateral até encontrar a opção correspondente. Clique para acessar o módulo desejado.</p>
              <h3 style={{ color: '#fff', fontSize: '16px', marginTop: '20px' }}>2. Configuração inicial</h3>
              <p style={{ color: '#888' }}>Preencha as informações solicitadas e clique em Salvar para confirmar as alterações. As mudanças são aplicadas imediatamente.</p>
              <h3 style={{ color: '#fff', fontSize: '16px', marginTop: '20px' }}>3. Dicas importantes</h3>
              <p style={{ color: '#888' }}>Em caso de dúvidas, acesse o módulo Suporte ou entre em contato via WhatsApp com nossa equipe.</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div>
            {/* Busca */}
            <div style={{ position: 'relative' as const, marginBottom: '20px' }}>
              <Search size={15} style={{ position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder='Buscar artigos e tutoriais...'
                style={{ width: '100%', padding: '12px 12px 12px 36px', backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' as const }} />
            </div>

            {/* Capitulos */}
            {capsFiltrados.map(cap => (
              <div key={cap.id} style={cardStyle}>
                <button onClick={() => toggleCap(cap.id)} style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' as const, fontFamily: 'Mulish, sans-serif' }}>
                  <span style={{ fontSize: '20px' }}>{cap.icone}</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>{cap.titulo}</span>
                  <span style={{ color: '#555', fontSize: '12px', marginRight: '8px' }}>{cap.artigos.length} artigos</span>
                  {abertos.has(cap.id) ? <ChevronDown size={16} color='#888' /> : <ChevronRight size={16} color='#888' />}
                </button>
                {abertos.has(cap.id) && (
                  <div style={{ borderTop: '1px solid #222' }}>
                    {cap.artigos.map(art => (
                      <button key={art.id} onClick={() => setArtigoAtivo(art)} style={{ width: '100%', padding: '13px 20px 13px 52px', background: 'none', border: 'none', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' as const, fontFamily: 'Mulish, sans-serif' }}>
                        {art.tipo === 'video' ? <Play size={14} color='#ef4239' fill='#ef4239' /> : <FileText size={14} color='#888' />}
                        <span style={{ color: '#e6e6e6', fontSize: '14px', flex: 1 }}>{art.titulo}</span>
                        {art.popular && <Star size={12} color='#f59e0b' fill='#f59e0b' />}
                        <span style={{ color: '#555', fontSize: '12px' }}>{art.tempo}</span>
                        <ChevronRight size={14} color='#444' />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar direita */}
          <div>
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={14} color='#f59e0b' fill='#f59e0b' />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Mais Populares</span>
                </div>
              </div>
              {populares.map(art => (
                <button key={art.id} onClick={() => setArtigoAtivo(art)} style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' as const, fontFamily: 'Mulish, sans-serif' }}>
                  {art.tipo === 'video' ? <Play size={13} color='#ef4239' fill='#ef4239' /> : <BookOpen size={13} color='#888' />}
                  <span style={{ color: '#e6e6e6', fontSize: '13px', flex: 1 }}>{art.titulo}</span>
                  <span style={{ color: '#555', fontSize: '11px', flexShrink: 0 }}>{art.tempo}</span>
                </button>
              ))}
            </div>
            <a href='https://wa.me/5511945678900' target='_blank' rel='noopener noreferrer' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', backgroundColor: '#25d36620', border: '1px solid #25d36640', color: '#25d366', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              Não achou? Fale conosco <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ManualPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <ManualContent />
    </Suspense>
  )
}
