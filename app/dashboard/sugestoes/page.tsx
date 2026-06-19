'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lightbulb, ThumbsUp, ThumbsDown, MessageSquare, Plus, Send, Check } from 'lucide-react'

const SUGESTOES_MOCK = [
  { id: 1, titulo: 'Adicionar opção de agendamento de pedidos', descricao: 'Seria ótimo poder agendar pedidos para horários específicos, como almoço do dia seguinte.', votos: 24, status: 'em_analise', categoria: 'Pedidos', data: '15/06/2026' },
  { id: 2, titulo: 'Relatório de produtos mais vendidos', descricao: 'Um relatório semanal automático enviado por email com os produtos mais vendidos e horários de pico.', votos: 18, status: 'planejado', categoria: 'Relatórios', data: '10/06/2026' },
  { id: 3, titulo: 'Notificação sonora para novos pedidos', descricao: 'Um som de alerta quando chega um novo pedido, especialmente útil em horários de pico.', votos: 31, status: 'concluido', categoria: 'Notificações', data: '05/06/2026' },
  { id: 4, titulo: 'Integração com Google Maps para delivery', descricao: 'Calcular automaticamente o frete com base na distância via Google Maps.', votos: 15, status: 'em_analise', categoria: 'Delivery', data: '01/06/2026' },
]

const STATUS_INFO: Record<string, { label: string; cor: string }> = {
  em_analise: { label: 'Em Análise', cor: '#f59e0b' },
  planejado: { label: 'Planejado', cor: '#6366f1' },
  concluido: { label: 'Concluído', cor: '#22c55e' },
  recusado: { label: 'Recusado', cor: '#ef4239' },
}

function SugestoesContent() {
  const [sugestoes, setSugestoes] = useState(SUGESTOES_MOCK)
  const [votos, setVotos] = useState<Set<number>>(new Set())
  const [nova, setNova] = useState(false)
  const [novaForm, setNovaForm] = useState({ titulo: '', descricao: '', categoria: 'Pedidos' })
  const [enviado, setEnviado] = useState(false)

  const votar = (id: number) => {
    if (votos.has(id)) return
    setVotos(new Set([...votos, id]))
    setSugestoes(s => s.map(x => x.id === id ? { ...x, votos: x.votos + 1 } : x))
  }

  const enviarSugestao = () => {
    if (!novaForm.titulo.trim()) return
    setSugestoes([{ id: Date.now(), ...novaForm, votos: 0, status: 'em_analise', data: new Date().toLocaleDateString('pt-BR') }, ...sugestoes])
    setNova(false)
    setEnviado(true)
    setNovaForm({ titulo: '', descricao: '', categoria: 'Pedidos' })
    setTimeout(() => setEnviado(false), 3000)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', backgroundColor: '#111', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' as const }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lightbulb size={26} color='#f59e0b' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Sugestões</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Vote e envie ideias para melhorar o VigorePro</p>
          </div>
        </div>
        <button onClick={() => setNova(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
          <Plus size={16} /> Nova Sugestão
        </button>
      </div>

      {enviado && (
        <div style={{ backgroundColor: '#22c55e20', border: '1px solid #22c55e40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}>
          <Check size={16} /> Sugestão enviada com sucesso! Obrigado pelo feedback.
        </div>
      )}

      {nova && (
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4239', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 16px' }}>Nova Sugestão</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Título *</label>
            <input value={novaForm.titulo} onChange={e => setNovaForm({...novaForm, titulo: e.target.value})} placeholder='Descreva sua ideia brevemente...' style={inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Descrição</label>
            <textarea value={novaForm.descricao} onChange={e => setNovaForm({...novaForm, descricao: e.target.value})} placeholder='Explique com mais detalhes...' rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={enviarSugestao} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
              <Send size={14} /> Enviar
            </button>
            <button onClick={() => setNova(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #292929', backgroundColor: 'transparent', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {sugestoes.map(s => {
        const si = STATUS_INFO[s.status]
        const jáVotou = votos.has(s.id)
        return (
          <div key={s.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '12px', display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => votar(s.id)} style={{ background: 'none', border: 'none', cursor: jáVotou ? 'default' : 'pointer', color: jáVotou ? '#ef4239' : '#555', padding: '4px' }}>
                <ThumbsUp size={18} fill={jáVotou ? '#ef4239' : 'none'} />
              </button>
              <span style={{ color: jáVotou ? '#ef4239' : '#888', fontWeight: 700, fontSize: '16px' }}>{s.votos}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{s.titulo}</h3>
                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, backgroundColor: si.cor + '20', color: si.cor, flexShrink: 0, marginLeft: '8px' }}>{si.label}</span>
              </div>
              <p style={{ color: '#888', fontSize: '13px', margin: '0 0 10px', lineHeight: '1.5' }}>{s.descricao}</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: '#222', color: '#888', fontSize: '12px' }}>{s.categoria}</span>
                <span style={{ color: '#555', fontSize: '12px' }}>{s.data}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SugestoesPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <SugestoesContent />
    </Suspense>
  )
}
