'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, Copy, QrCode, RefreshCw, TrendingUp, Clock, Check, ArrowDownLeft, Plus, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Transacao = {
  id: string
  estabelecimento_id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string
  status: 'concluido' | 'pendente' | 'falhou' | 'estornado'
  pagador_nome: string | null
  pagador_chave: string | null
  pedido_id: string | null
  numero_pedido: number | null
  created_at: string
}

type ConfigPix = {
  chave: string
  tipo_chave: string
  nome_titular: string
}

function PixContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [config, setConfig] = useState<ConfigPix>({ chave: '', tipo_chave: 'email', nome_titular: '' })
  const [showSaldo, setShowSaldo] = useState(true)
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | 'mes'>('hoje')
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configForm, setConfigForm] = useState({ chave: '', tipo_chave: 'email', nome_titular: '' })
  const [showQR, setShowQR] = useState(false)
  const [valorQR, setValorQR] = useState('')

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id, nome, pix_chave, pix_tipo_chave, pix_titular').eq('slug', slug).single()
    if (data) {
      setEstabelecimentoId(data.id)
      setConfig({
        chave: data.pix_chave || '',
        tipo_chave: data.pix_tipo_chave || 'email',
        nome_titular: data.pix_titular || data.nome || ''
      })
      setConfigForm({
        chave: data.pix_chave || '',
        tipo_chave: data.pix_tipo_chave || 'email',
        nome_titular: data.pix_titular || data.nome || ''
      })
    }
  }, [slug])

  const fetchTransacoes = useCallback(async (estId: string) => {
    const now = new Date()
    let inicio = new Date()
    if (periodo === 'hoje') { inicio.setHours(0,0,0,0) }
    else if (periodo === '7dias') { inicio.setDate(now.getDate()-7) }
    else { inicio.setDate(1); inicio.setHours(0,0,0,0) }

    const { data } = await supabase
      .from('transacoes_pix')
      .select('*')
      .eq('estabelecimento_id', estId)
      .gte('created_at', inicio.toISOString())
      .order('created_at', { ascending: false })
    setTransacoes(data || [])
  }, [periodo])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => { setLoading(true); await fetchTransacoes(estabelecimentoId); setLoading(false) }
    load()
  }, [estabelecimentoId, fetchTransacoes])

  const entradas = transacoes.filter(t => t.tipo === 'entrada' && t.status === 'concluido')
  const totalEntradas = entradas.reduce((acc, t) => acc + Number(t.valor), 0)
  const pendentes = transacoes.filter(t => t.status === 'pendente')
  const totalPendente = pendentes.reduce((acc, t) => acc + Number(t.valor), 0)
  const taxaMedia = entradas.length > 0 ? totalEntradas / entradas.length : 0

  const copiarChave = async () => {
    if (!config.chave) return
    await navigator.clipboard.writeText(config.chave)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const salvarConfig = async () => {
    if (!configForm.chave || !estabelecimentoId) return
    setSaving(true)
    await supabase.from('estabelecimentos').update({
      pix_chave: configForm.chave,
      pix_tipo_chave: configForm.tipo_chave,
      pix_titular: configForm.nome_titular
    }).eq('id', estabelecimentoId)
    setConfig(configForm)
    setSaving(false)
    setShowConfigForm(false)
    await fetchEstabelecimento()
  }

  const getStatusColor = (s: string) => s === 'concluido' ? '#22c55e' : s === 'pendente' ? '#f59e0b' : s === 'falhou' ? '#ef4239' : '#666'
  const getStatusLabel = (s: string) => s === 'concluido' ? 'Concluido' : s === 'pendente' ? 'Pendente' : s === 'falhou' ? 'Falhou' : 'Estornado'

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={22} color="#ef4239" />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Pix Online</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Recebimentos e chave Pix do estabelecimento</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fetchTransacoes(estabelecimentoId)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => setShowConfigForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <QrCode size={14} /> Configurar Chave
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Saldo */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a, #111)', border: '1px solid #292929', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', background: '#111', borderRadius: '8px', padding: '4px' }}>
              {(['hoje', '7dias', 'mes'] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  style={{ padding: '4px 10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Mulish, sans-serif',
                    background: periodo === p ? '#ef4239' : 'transparent', color: periodo === p ? '#fff' : '#666' }}>
                  {p === 'hoje' ? 'Hoje' : p === '7dias' ? '7 dias' : 'Mes'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSaldo(!showSaldo)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              {showSaldo ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '6px' }}>Saldo Disponivel</div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#22c55e', marginBottom: '16px' }}>
            {showSaldo ? 'R$ ' + totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'R$ ••••••'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Recebido ' + (periodo === 'hoje' ? 'Hoje' : periodo === '7dias' ? '7 dias' : 'Mes'), value: 'R$ ' + totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
              { label: periodo === 'hoje' ? 'Transacoes Hoje' : 'Total Transacoes', value: entradas.length },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chave Pix */}
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <QrCode size={16} color="#ef4239" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Minha Chave Pix</span>
          </div>
          {config.chave ? (
            <>
              <div style={{ background: '#111', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid #222' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Chave ({config.tipo_chave.toUpperCase()})</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#ef4239' }}>{config.chave}</div>
                {config.nome_titular && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{config.nome_titular}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={copiarChave}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: copied ? 'rgba(34,197,94,0.15)' : '#111', border: '1px solid ' + (copied ? 'rgba(34,197,94,0.4)' : '#333'), borderRadius: '8px', color: copied ? '#22c55e' : '#e6e6e6', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado!' : 'Copiar Chave'}
                </button>
                <button onClick={() => setShowQR(!showQR)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: showQR ? '#ef423922' : '#111', border: showQR ? '1px solid #ef4239' : '1px solid #333', borderRadius: '8px', color: showQR ? '#ef4239' : '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
                  <QrCode size={14} /> {showQR ? 'Fechar QR' : 'QR Code'}
                </button>
                {/* QR Code Modal Inline */}
                {showQR && (
                  <div style={{ marginTop: 12, backgroundColor: '#0a0a0a', border: '1px solid #292929', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                    {config.chave ? (
                      <>
                        <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#fff' }}>QR Code para Receber Pix</p>
                        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, display: 'inline-block', marginBottom: 14 }}>
                          <img
                            src={'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(config.chave + (valorQR ? ' R$ ' + valorQR : ''))}
                            alt="QR Code Pix"
                            style={{ width: 180, height: 180, display: 'block' }}
                          />
                        </div>
                        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#fff' }}>{config.nome_titular}</p>
                        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>{config.chave}</p>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
                          <input
                            type="number"
                            value={valorQR}
                            onChange={e => setValorQR(e.target.value)}
                            placeholder="Valor (opcional)"
                            style={{ padding: '7px 12px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, width: 150, outline: 'none' }}
                          />
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(config.chave); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                          style={{ padding: '8px 16px', backgroundColor: copied ? '#22c55e22' : '#1a1a1a', border: copied ? '1px solid #22c55e' : '1px solid #333', borderRadius: 6, color: copied ? '#22c55e' : '#fff', fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? 'Copiado!' : 'Copiar Chave Pix'}
                        </button>
                      </>
                    ) : (
                      <div style={{ padding: 20 }}>
                        <QrCode size={32} color="#444" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                        <p style={{ color: '#888', margin: 0, fontSize: 13 }}>Configure sua chave Pix para gerar o QR Code</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#111', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Pendentes</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b' }}>{pendentes.length}</div>
                </div>
                <div style={{ background: '#111', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>A Receber</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>R$ {totalPendente.toFixed(0)}</div>
                </div>
                <div style={{ background: '#111', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Ticket Medio</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>R$ {taxaMedia.toFixed(0)}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <QrCode size={40} color="#333" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>Nenhuma chave Pix configurada ainda</p>
              <button onClick={() => setShowConfigForm(true)}
                style={{ padding: '10px 20px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
                Configurar Agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal configurar chave */}
      {showConfigForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Configurar Chave Pix</span>
              <button onClick={() => setShowConfigForm(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Tipo de Chave</label>
                <select value={configForm.tipo_chave} onChange={e => setConfigForm(p => ({ ...p, tipo_chave: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatoria</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Chave Pix</label>
                <input value={configForm.chave} onChange={e => setConfigForm(p => ({ ...p, chave: e.target.value }))} placeholder="Digite sua chave pix"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Nome do Titular</label>
                <input value={configForm.nome_titular} onChange={e => setConfigForm(p => ({ ...p, nome_titular: e.target.value }))} placeholder="Nome completo ou razao social"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfigForm(false)} style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
              <button onClick={salvarConfig} disabled={saving}
                style={{ padding: '8px 18px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extrato */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #292929', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6e6e6' }}>Extrato de Recebimentos</span>
          <button onClick={() => fetchTransacoes(estabelecimentoId)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #292929', borderRadius: '6px', padding: '5px 10px', color: '#999', cursor: 'pointer', fontSize: '12px' }}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando transacoes...</div>
        ) : transacoes.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ArrowDownLeft size={40} color="#333" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Nenhuma transacao Pix no periodo.</p>
            <p style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>As transacoes aparecerao aqui conforme os pedidos forem pagos via Pix.</p>
          </div>
        ) : transacoes.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid #1f1f1f' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.tipo === 'entrada' ? 'rgba(34,197,94,0.15)' : 'rgba(239,66,57,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowDownLeft size={16} color={t.tipo === 'entrada' ? '#22c55e' : '#ef4239'} style={{ transform: t.tipo === 'saida' ? 'rotate(180deg)' : 'none' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6e6e6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.pagador_nome || t.descricao || 'Transferencia Pix'}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {t.pagador_chave && <span>{t.pagador_chave} · </span>}
                {t.numero_pedido && <span>Pedido #{t.numero_pedido} · </span>}
                {new Date(t.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: t.tipo === 'entrada' ? '#22c55e' : '#ef4239' }}>
                {t.tipo === 'entrada' ? '+' : '-'}R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: getStatusColor(t.status) }}>
                {getStatusLabel(t.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PixPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <PixContent />
    </Suspense>
  )
}