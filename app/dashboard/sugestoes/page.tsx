'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lightbulb, Plus, ThumbsUp, Clock, CheckCircle, X, RefreshCw, Tag, Search } from 'lucide-react'

type Sugestao = {
  id: string
  titulo: string
  descricao: string
  categoria: string
  status: 'pendente' | 'em_analise' | 'planejado' | 'concluido' | 'recusado'
  votos: number
  votou: boolean
  criado_em: string
  estabelecimento_id: string
}

const STATUS_INFO: Record<string, {label: string, cor: string}> = {
  pendente: { label: 'Pendente', cor: '#6b7280' },
  em_analise: { label: 'Em Análise', cor: '#f59e0b' },
  planejado: { label: 'Planejado', cor: '#3b82f6' },
  concluido: { label: 'Concluído', cor: '#22c55e' },
  recusado: { label: 'Recusado', cor: '#ef4444' },
}

const CATEGORIAS = ['Pedidos', 'Cardápio', 'Relatórios', 'Delivery', 'Notificações', 'Financeiro', 'Marketing', 'Outro']

// Sugestoes globais fixas da plataforma
const SUGESTOES_GLOBAIS: Sugestao[] = [
  { id: 'g1', titulo: 'Agendamento de pedidos', descricao: 'Poder agendar pedidos para horários específicos, como almoço do dia seguinte.', categoria: 'Pedidos', status: 'em_analise', votos: 24, votou: false, criado_em: '2026-06-15', estabelecimento_id: '' },
  { id: 'g2', titulo: 'Relatório de produtos mais vendidos', descricao: 'Um relatório semanal automático enviado por email com os produtos mais vendidos e horários de pico.', categoria: 'Relatórios', status: 'planejado', votos: 18, votou: false, criado_em: '2026-06-10', estabelecimento_id: '' },
  { id: 'g3', titulo: 'Notificação sonora para novos pedidos', descricao: 'Um som de alerta quando chega um novo pedido, especialmente útil em horários de pico.', categoria: 'Notificações', status: 'concluido', votos: 31, votou: false, criado_em: '2026-06-05', estabelecimento_id: '' },
  { id: 'g4', titulo: 'Integração com Google Maps para delivery', descricao: 'Calcular automaticamente o frete com base na distância via Google Maps.', categoria: 'Delivery', status: 'em_analise', votos: 15, votou: false, criado_em: '2026-06-01', estabelecimento_id: '' },
  { id: 'g5', titulo: 'App mobile para garçons', descricao: 'Um app para o garçom lançar pedidos pelo celular diretamente na comanda.', categoria: 'Pedidos', status: 'planejado', votos: 42, votou: false, criado_em: '2026-05-28', estabelecimento_id: '' },
]

function SugestoesContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [minhasSugestoes, setMinhasSugestoes] = useState<Sugestao[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas')
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', categoria: 'Pedidos' })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [votos, setVotos] = useState<Record<string, boolean>>({})

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchMinhasSugestoes = useCallback(async () => {
    if (!estabelecimentoId) return
    const { data } = await supabase.from('sugestoes')
      .select('*').eq('estabelecimento_id', estabelecimentoId)
      .order('criado_em', { ascending: false })
    if (data) setMinhasSugestoes(data)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => { if (estabelecimentoId) fetchMinhasSugestoes() }, [estabelecimentoId, fetchMinhasSugestoes])

  const enviarSugestao = async () => {
    if (!form.titulo || !estabelecimentoId) return
    setEnviando(true)
    const { error } = await supabase.from('sugestoes').insert({
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      status: 'pendente',
      votos: 0,
      estabelecimento_id: estabelecimentoId
    })
    setEnviando(false)
    if (!error) {
      setForm({ titulo: '', descricao: '', categoria: 'Pedidos' })
      setModalAberto(false)
      setEnviado(true)
      setTimeout(() => setEnviado(false), 3000)
      fetchMinhasSugestoes()
    }
  }

  const votar = (id: string) => setVotos(prev => ({ ...prev, [id]: !prev[id] }))

  const todasSugestoes = [
    ...SUGESTOES_GLOBAIS.map(s => ({ ...s, votou: votos[s.id] || false, votos: s.votos + (votos[s.id] ? 1 : 0) })),
    ...minhasSugestoes.map(s => ({ ...s, votou: votos[s.id] || false }))
  ]
  
  const filtradas = todasSugestoes.filter(s => {
    const buscaOk = !busca || s.titulo.toLowerCase().includes(busca.toLowerCase()) || s.descricao.toLowerCase().includes(busca.toLowerCase())
    const catOk = categoriaFiltro === 'Todas' || s.categoria === categoriaFiltro
    return buscaOk && catOk
  })

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', padding: 24, color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={20} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Sugestões</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Vote e envie ideias para melhorar o VigorePro</p>
          </div>
        </div>
        <button onClick={() => setModalAberto(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          borderRadius: 8, border: 'none', background: '#ef4239', color: '#fff',
          fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}><Plus size={16} /> Nova Sugestão</button>
      </div>

      {enviado && (
        <div style={{ background: '#0f2e1a', border: '1px solid #16a34a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color="#22c55e" />
          <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>Sugestão enviada com sucesso! Nossa equipe irá analisar em breve.</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="#555" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar sugestões..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todas', ...CATEGORIAS].slice(0, 6).map(cat => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)} style={{
              padding: '6px 12px', borderRadius: 16, border: categoriaFiltro === cat ? '1px solid #ef4239' : '1px solid #292929',
              background: categoriaFiltro === cat ? '#ef423922' : 'transparent',
              color: categoriaFiltro === cat ? '#ef4239' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Lista de sugestões */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtradas.map(sug => {
          const status = STATUS_INFO[sug.status] || STATUS_INFO.pendente
          return (
            <div key={sug.id} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20, display: 'flex', gap: 16 }}>
              {/* Votos */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                <button onClick={() => votar(sug.id)} style={{
                  width: 40, height: 40, borderRadius: 8, border: sug.votou ? '1px solid #ef4239' : '1px solid #292929',
                  background: sug.votou ? '#281615' : '#111', color: sug.votou ? '#ef4239' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ThumbsUp size={16} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: sug.votou ? '#ef4239' : '#aaa' }}>{sug.votos}</span>
              </div>
              {/* Conteudo */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>{sug.titulo}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: status.cor + '22', color: status.cor }}>
                    {status.label}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888', lineHeight: 1.5 }}>{sug.descricao}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555' }}>
                    <Tag size={11} /> {sug.categoria}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555' }}>
                    <Clock size={11} /> {new Date(sug.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        {filtradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <Lightbulb size={48} color="#333" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p>Nenhuma sugestão encontrada</p>
          </div>
        )}
      </div>

      {/* MODAL NOVA SUGESTAO */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 28, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Nova Sugestão</h2>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Título *</label>
              <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Descreva sua ideia em uma frase"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', fontFamily: 'Mulish, sans-serif' }}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={4}
                placeholder="Descreva sua sugestão com mais detalhes..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #333', background: 'none', color: '#aaa', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Cancelar</button>
              <button onClick={enviarSugestao} disabled={!form.titulo || enviando} style={{
                flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                background: form.titulo ? '#ef4239' : '#555', color: '#fff',
                fontWeight: 700, cursor: form.titulo ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif'
              }}>{enviando ? 'Enviando...' : 'Enviar Sugestão'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SugestoesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <SugestoesContent />
    </Suspense>
  )
}
