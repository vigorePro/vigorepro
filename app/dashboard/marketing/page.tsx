'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Megaphone, Users, MessageCircle, BarChart3, Plus, Search, Filter, RefreshCw, CheckCircle2, Clock, XCircle, Send, Trash2, Eye, TrendingUp, TrendingDown, Target } from 'lucide-react'

type Campanha = {
  id: string
  nome: string
  tipo: 'whatsapp' | 'sms' | 'email' | 'push'
  status: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'cancelada'
  mensagem: string
  segmentacao_id?: string
  total_contatos: number
  enviados: number
  lidos: number
  clicados: number
  criado_em: string
  agendado_para?: string
  estabelecimento_id: string
}

type Segmentacao = {
  id: string
  nome: string
  descricao?: string
  criterios: any
  total_clientes: number
  criado_em: string
  estabelecimento_id: string
}

function MarketingContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'campanhas' | 'segmentacao'>('campanhas')
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [segmentacoes, setSegmentacoes] = useState<Segmentacao[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [totalClientes, setTotalClientes] = useState(0)

  // KPIs calculados
  const totalCampanhas = campanhas.length
  const campanhasAtivas = campanhas.filter(c => c.status === 'enviando' || c.status === 'agendada').length
  const totalEnviados = campanhas.reduce((a, c) => a + (c.enviados || 0), 0)
  const totalLidos = campanhas.reduce((a, c) => a + (c.lidos || 0), 0)
  const taxaLeitura = totalEnviados > 0 ? Math.round((totalLidos / totalEnviados) * 100) : 0

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchDados = useCallback(async () => {
    if (!estabelecimentoId) return
    setCarregando(true)
    const [campRes, segRes, cliRes] = await Promise.all([
      supabase.from('campanhas').select('*').eq('estabelecimento_id', estabelecimentoId).order('criado_em', { ascending: false }),
      supabase.from('segmentacoes').select('*').eq('estabelecimento_id', estabelecimentoId).order('criado_em', { ascending: false }),
      supabase.from('clientes').select('id', { count: 'exact' }).eq('estabelecimento_id', estabelecimentoId)
    ])
    if (campRes.data) setCampanhas(campRes.data)
    if (segRes.data) setSegmentacoes(segRes.data)
    if (cliRes.count) setTotalClientes(cliRes.count)
    setCarregando(false)
  }, [estabelecimentoId])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])
  useEffect(() => { if (estabelecimentoId) fetchDados() }, [estabelecimentoId, fetchDados])

  const criarCampanha = async (dados: Partial<Campanha>) => {
    if (!estabelecimentoId) return
    const { error } = await supabase.from('campanhas').insert({
      ...dados,
      estabelecimento_id: estabelecimentoId,
      status: 'rascunho',
      total_contatos: 0,
      enviados: 0,
      lidos: 0,
      clicados: 0
    })
    if (!error) { fetchDados(); setModalAberto(false) }
  }

  const excluirCampanha = async (id: string) => {
    await supabase.from('campanhas').delete().eq('id', id)
    setCampanhas(prev => prev.filter(c => c.id !== id))
  }

  const campanhasFiltradas = campanhas.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.tipo?.toLowerCase().includes(busca.toLowerCase())
  )

  const statusCor: Record<string, string> = {
    rascunho: '#6b7280', agendada: '#f59e0b', enviando: '#3b82f6',
    concluida: '#22c55e', cancelada: '#ef4444'
  }
  const statusLabel: Record<string, string> = {
    rascunho: 'Rascunho', agendada: 'Agendada', enviando: 'Enviando',
    concluida: 'Concluída', cancelada: 'Cancelada'
  }
  const tipoCor: Record<string, string> = {
    whatsapp: '#25d366', sms: '#f59e0b', email: '#3b82f6', push: '#8b5cf6'
  }

  const s = { fontFamily: 'Mulish, sans-serif' }

  return (
    <div style={{ ...s, padding: 24, color: '#e6e6e6', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Food Marketing</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>Campanhas, segmentacao e analytics para seu negocio</p>
        </div>
        <button onClick={() => setModalAberto(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: '#ef4239', border: 'none', borderRadius: 8, color: '#fff',
          fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          <Plus size={16} /> Nova Campanha
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Campanhas', valor: totalCampanhas, icon: <Megaphone size={20} />, cor: '#ef4239', sub: campanhasAtivas + ' ativas' },
          { label: 'Base de Clientes', valor: totalClientes, icon: <Users size={20} />, cor: '#3b82f6', sub: segmentacoes.length + ' segmentacoes' },
          { label: 'Mensagens Enviadas', valor: totalEnviados.toLocaleString(), icon: <Send size={20} />, cor: '#22c55e', sub: 'total acumulado' },
          { label: 'Taxa de Leitura', valor: taxaLeitura + '%', icon: <Eye size={20} />, cor: '#f59e0b', sub: totalLidos + ' leituras' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
          }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888' }}>{kpi.label}</p>
              <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#fff' }}>{kpi.valor}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{kpi.sub}</p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: kpi.cor + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.cor
            }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #292929' }}>
        {[
          { id: 'campanhas', label: 'Campanhas WhatsApp', icon: <MessageCircle size={14} /> },
          { id: 'segmentacao', label: 'Segmentacao', icon: <Target size={14} /> },
        ].map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'none', border: 'none', borderBottom: abaAtiva === aba.id ? '2px solid #ef4239' : '2px solid transparent',
            color: abaAtiva === aba.id ? '#ef4239' : '#888', fontWeight: abaAtiva === aba.id ? 600 : 400,
            fontSize: 14, cursor: 'pointer', marginBottom: -1, fontFamily: 'Mulish, sans-serif'
          }}>
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* Barra busca */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="#666" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder={abaAtiva === 'campanhas' ? 'Buscar campanhas...' : 'Buscar segmentacoes...'}
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8,
              border: '1px solid #292929', background: '#1a1a1a', color: '#e6e6e6',
              fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif'
            }}
          />
        </div>
        <button onClick={fetchDados} style={{
          padding: '9px 14px', borderRadius: 8, border: '1px solid #292929',
          background: '#1a1a1a', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ABA CAMPANHAS */}
      {abaAtiva === 'campanhas' && (
        <div>
          {carregando ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <p>Carregando campanhas...</p>
            </div>
          ) : campanhasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
              <Megaphone size={48} color="#333" style={{ marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', color: '#555' }}>Nenhuma campanha criada</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14 }}>Crie sua primeira campanha para comecar a engajar seus clientes</p>
              <button onClick={() => setModalAberto(true)} style={{
                padding: '10px 24px', background: '#ef4239', border: 'none', borderRadius: 8,
                color: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>+ Nova Campanha</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campanhasFiltradas.map(camp => (
                <div key={camp.id} style={{
                  background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: (tipoCor[camp.tipo] || '#666') + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: tipoCor[camp.tipo] || '#666'
                      }}>
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#fff' }}>{camp.nome}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{camp.tipo}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: (statusCor[camp.status] || '#666') + '22',
                        color: statusCor[camp.status] || '#666'
                      }}>{statusLabel[camp.status] || camp.status}</span>
                      <button onClick={() => excluirCampanha(camp.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {camp.mensagem && (
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#aaa', background: '#111', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #333' }}>
                      {camp.mensagem.length > 100 ? camp.mensagem.substring(0, 100) + '...' : camp.mensagem}
                    </p>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Contatos', val: camp.total_contatos || 0 },
                      { label: 'Enviados', val: camp.enviados || 0 },
                      { label: 'Lidos', val: camp.lidos || 0 },
                      { label: 'Clicados', val: camp.clicados || 0 },
                    ].map((m, i) => (
                      <div key={i} style={{ background: '#111', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{m.val}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: '#555' }}>
                    Criada em: {new Date(camp.criado_em).toLocaleDateString('pt-BR')}
                    {camp.agendado_para && ' · Agendada para: ' + new Date(camp.agendado_para).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA SEGMENTACAO */}
      {abaAtiva === 'segmentacao' && (
        <div>
          {carregando ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Carregando...</div>
          ) : segmentacoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
              <Users size={48} color="#333" style={{ marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', color: '#555' }}>Nenhuma segmentacao criada</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Segmente seus clientes para campanhas mais eficientes</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {segmentacoes.filter(s => s.nome?.toLowerCase().includes(busca.toLowerCase())).map(seg => (
                <div key={seg.id} style={{
                  background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#3b82f622', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <Target size={18} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#fff' }}>{seg.nome}</p>
                      {seg.descricao && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{seg.descricao}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ background: '#111', borderRadius: 6, padding: '6px 14px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{seg.total_clientes || 0}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#666' }}>clientes</p>
                    </div>
                    <span style={{ fontSize: 12, color: '#555' }}>
                      {new Date(seg.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVA CAMPANHA */}
      {modalAberto && (
        <ModalNovaCampanha
          onClose={() => setModalAberto(false)}
          onSalvar={criarCampanha}
          segmentacoes={segmentacoes}
        />
      )}
    </div>
  )
}

function ModalNovaCampanha({ onClose, onSalvar, segmentacoes }: {
  onClose: () => void
  onSalvar: (d: any) => void
  segmentacoes: Segmentacao[]
}) {
  const [form, setForm] = useState({ nome: '', tipo: 'whatsapp', mensagem: '', segmentacao_id: '', agendado_para: '' })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000a', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif'
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12,
        width: 500, maxHeight: '90vh', overflowY: 'auto', padding: 28
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Nova Campanha</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {[
          { label: 'Nome da Campanha', key: 'nome', type: 'text', placeholder: 'Ex: Promoção de Sexta' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>{field.label}</label>
            <input value={(form as any)[field.key]} onChange={e => set(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333',
                background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif'
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Tipo</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333',
            background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', fontFamily: 'Mulish, sans-serif'
          }}>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">E-mail</option>
            <option value="push">Push</option>
          </select>
        </div>

        {segmentacoes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Segmentacao (opcional)</label>
            <select value={form.segmentacao_id} onChange={e => set('segmentacao_id', e.target.value)} style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333',
              background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', fontFamily: 'Mulish, sans-serif'
            }}>
              <option value="">Todos os clientes</option>
              {segmentacoes.map(s => <option key={s.id} value={s.id}>{s.nome} ({s.total_clientes} clientes)</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Mensagem</label>
          <textarea value={form.mensagem} onChange={e => set('mensagem', e.target.value)}
            placeholder="Olá {nome}! Confira nossa promoção especial..."
            rows={4}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333',
              background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', resize: 'vertical',
              boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif'
            }}
          />
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>Use {'{nome}'} para personalizar com o nome do cliente</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Agendar para (opcional)</label>
          <input type="datetime-local" value={form.agendado_para} onChange={e => set('agendado_para', e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #333',
              background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none',
              boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #333',
            background: 'none', color: '#aaa', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
          }}>Cancelar</button>
          <button onClick={() => onSalvar({ ...form, agendado_para: form.agendado_para || null, segmentacao_id: form.segmentacao_id || null })}
            disabled={!form.nome} style={{
            flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
            background: form.nome ? '#ef4239' : '#555', color: '#fff',
            fontWeight: 700, cursor: form.nome ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif'
          }}>Criar Campanha</button>
        </div>
      </div>
    </div>
  )
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <MarketingContent />
    </Suspense>
  )
}
