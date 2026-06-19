'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Globe, Settings, Clock, MapPin, CreditCard, Tag, QrCode,
  Copy, Check, Bike, ShoppingBag, UtensilsCrossed, Plus,
  Trash2, CheckCircle, RefreshCw, Save, ExternalLink, X
} from 'lucide-react'

const TABS = [
  { id: 'configuracoes', label: 'Configuracoes', icon: Settings },
  { id: 'horario', label: 'Horario', icon: Clock },
  { id: 'entrega', label: 'Entrega', icon: MapPin },
  { id: 'pagamento', label: 'Pagamentos', icon: CreditCard },
  { id: 'cupons', label: 'Cupons', icon: Tag },
]

const DIAS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo']
const DIAS_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']

const FORMAS_PADRAO = [
  { id: 'dinheiro', label: 'Dinheiro', ativo: true },
  { id: 'cartao_debito', label: 'Cartao de Debito', ativo: true },
  { id: 'cartao_credito', label: 'Cartao de Credito', ativo: true },
  { id: 'pix', label: 'Pix', ativo: true },
  { id: 'vale_refeicao', label: 'Vale Refeicao', ativo: false },
]

type Cupom = {
  id?: string
  codigo: string
  desconto_tipo: 'percentual' | 'fixo'
  desconto_valor: number
  usos_maximos: number | null
  ativo: boolean
}

function CardapioDigitalContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [activeTab, setActiveTab] = useState('configuracoes')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [loading, setLoading] = useState(true)

  // Config states
  const [deliveryAtivo, setDeliveryAtivo] = useState(true)
  const [retiradaAtivo, setRetiradaAtivo] = useState(true)
  const [consumoLocalAtivo, setConsumoLocalAtivo] = useState(false)
  const [pedidoMinimo, setPedidoMinimo] = useState('0')
  const [taxaEntrega, setTaxaEntrega] = useState('0')
  const [temaCor, setTemaCor] = useState('#ef4239')
  const [nomeCardapio, setNomeCardapio] = useState('')
  const [descricaoCardapio, setDescricaoCardapio] = useState('')
  const [horarios, setHorarios] = useState(
    DIAS_KEYS.map(() => ({ aberto: true, abre: '08:00', fecha: '23:00' }))
  )
  const [formasPag, setFormasPag] = useState(FORMAS_PADRAO)
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [novoCupom, setNovoCupom] = useState({ codigo: '', desconto_tipo: 'percentual', desconto_valor: '10', usos_maximos: '' })
  const [showNovoCupom, setShowNovoCupom] = useState(false)

  const cardapioUrl = slug ? `https://cardapio.vigorepro.com.br/${slug}` : ''

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      .then(({ data }) => {
        if (data) {
          setEstabelecimentoId(data.id)
          setNomeCardapio(data.nome || '')
          setDescricaoCardapio(data.descricao || '')
          setTemaCor(data.cor_tema || '#ef4239')
          setDeliveryAtivo(data.delivery_ativo !== false)
          setRetiradaAtivo(data.retirada_ativo !== false)
          setConsumoLocalAtivo(data.consumo_local_ativo === true)
          setPedidoMinimo(data.pedido_minimo?.toString() || '0')
          setTaxaEntrega(data.taxa_entrega?.toString() || '0')
          if (data.horarios) setHorarios(data.horarios)
          if (data.formas_pagamento) setFormasPag(data.formas_pagamento)
          // Load cupons
          supabase.from('cupons').select('*').eq('estabelecimento_id', data.id).then(({ data: c }) => {
            if (c) setCupons(c.map(cp => ({ id: cp.id, codigo: cp.codigo, desconto_tipo: cp.desconto_tipo, desconto_valor: cp.desconto_valor, usos_maximos: cp.usos_maximos, ativo: cp.ativo })))
          })
        }
        setLoading(false)
      })
  }, [slug])

  const salvarConfig = async () => {
    if (!estabelecimentoId) return
    setSaving(true)
    await supabase.from('estabelecimentos').update({
      nome: nomeCardapio,
      descricao: descricaoCardapio,
      cor_tema: temaCor,
      delivery_ativo: deliveryAtivo,
      retirada_ativo: retiradaAtivo,
      consumo_local_ativo: consumoLocalAtivo,
      pedido_minimo: parseFloat(pedidoMinimo) || 0,
      taxa_entrega: parseFloat(taxaEntrega) || 0,
      horarios: horarios,
      formas_pagamento: formasPag,
    }).eq('id', estabelecimentoId)
    setSaving(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
  }

  const adicionarCupom = async () => {
    if (!novoCupom.codigo || !estabelecimentoId) return
    const newC = {
      estabelecimento_id: estabelecimentoId,
      codigo: novoCupom.codigo.toUpperCase(),
      desconto_tipo: novoCupom.desconto_tipo,
      desconto_valor: parseFloat(novoCupom.desconto_valor) || 0,
      usos_maximos: novoCupom.usos_maximos ? parseInt(novoCupom.usos_maximos) : null,
      ativo: true, usos_atuais: 0
    }
    const { data } = await supabase.from('cupons').insert(newC).select().single()
    if (data) setCupons(prev => [...prev, { id: data.id, codigo: data.codigo, desconto_tipo: data.desconto_tipo, desconto_valor: data.desconto_valor, usos_maximos: data.usos_maximos, ativo: true }])
    setNovoCupom({ codigo: '', desconto_tipo: 'percentual', desconto_valor: '10', usos_maximos: '' })
    setShowNovoCupom(false)
  }

  const removerCupom = async (id?: string, codigo?: string) => {
    if (id) {
      await supabase.from('cupons').delete().eq('id', id)
      setCupons(prev => prev.filter(c => c.id !== id))
    } else {
      setCupons(prev => prev.filter(c => c.codigo !== codigo))
    }
  }

  const copiar = () => {
    navigator.clipboard.writeText(cardapioUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = (extra?: object) => ({ fontFamily: 'Mulish, sans-serif', ...extra })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#888', ...s() }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', color: '#fff', ...s() }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #292929', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="#ef4239" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cardapio Digital</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Configure seu cardapio online</p>
          </div>
        </div>
        {/* Link publico */}
        {slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 8, padding: '8px 12px' }}>
            <Globe size={13} color="#888" />
            <span style={{ fontSize: 12, color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardapioUrl}</span>
            <button onClick={copiar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#22c55e' : '#888', padding: 0, display: 'flex' }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <a href={cardapioUrl} target="_blank" rel="noreferrer" style={{ color: '#888', display: 'flex', textDecoration: 'none' }}>
              <ExternalLink size={13} />
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #292929', paddingLeft: 16, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent',
            color: activeTab === tab.id ? '#ef4239' : '#888', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'Mulish, sans-serif', whiteSpace: 'nowrap', marginBottom: -1
          }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800 }}>

        {/* CONFIGURACOES */}
        {activeTab === 'configuracoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff' }}>Informacoes do Cardapio</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Nome do Estabelecimento</label>
                  <input value={nomeCardapio} onChange={e => setNomeCardapio(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Descricao</label>
                  <textarea value={descricaoCardapio} onChange={e => setDescricaoCardapio(e.target.value)} rows={3} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'Mulish, sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Cor Principal</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={temaCor} onChange={e => setTemaCor(e.target.value)} style={{ width: 48, height: 36, borderRadius: 6, border: '1px solid #333', cursor: 'pointer', backgroundColor: 'transparent' }} />
                    <input value={temaCor} onChange={e => setTemaCor(e.target.value)} placeholder="#ef4239" style={{ width: 120, padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} />
                    <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: temaCor }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff' }}>Tipos de Pedido</p>
              {[
                { label: 'Delivery', desc: 'Pedidos para entrega em domicilio', icon: Bike, val: deliveryAtivo, set: setDeliveryAtivo },
                { label: 'Retirada', desc: 'Cliente retira no estabelecimento', icon: ShoppingBag, val: retiradaAtivo, set: setRetiradaAtivo },
                { label: 'Consumo Local', desc: 'Pedido na mesa pelo cardapio digital', icon: UtensilsCrossed, val: consumoLocalAtivo, set: setConsumoLocalAtivo },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <item.icon size={18} color={item.val ? '#ef4239' : '#555'} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: item.val ? '#fff' : '#888' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#666' }}>{item.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => item.set(!item.val)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', backgroundColor: item.val ? '#ef4239' : '#333', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: item.val ? 22 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Pedido Minimo (R$)</label>
                <input type="number" value={pedidoMinimo} onChange={e => setPedidoMinimo(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 16 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>Taxa de Entrega (R$)</label>
                <input type="number" value={taxaEntrega} onChange={e => setTaxaEntrega(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>
        )}

        {/* HORARIO */}
        {activeTab === 'horario' && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #292929' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Horario de Funcionamento</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>Define quando seu cardapio fica disponivel para pedidos</p>
            </div>
            {DIAS.map((dia, idx) => (
              <div key={dia} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderBottom: idx < 6 ? '1px solid #1f1f1f' : 'none' }}>
                <button onClick={() => {
                  const h = [...horarios]; h[idx] = { ...h[idx], aberto: !h[idx].aberto }; setHorarios(h)
                }} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', backgroundColor: horarios[idx]?.aberto ? '#ef4239' : '#333', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 3, left: horarios[idx]?.aberto ? 22 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff' }} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: horarios[idx]?.aberto ? '#fff' : '#555', width: 70 }}>{dia}</span>
                {horarios[idx]?.aberto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="time" value={horarios[idx]?.abre || '08:00'} onChange={e => { const h = [...horarios]; h[idx] = { ...h[idx], abre: e.target.value }; setHorarios(h) }}
                      style={{ padding: '5px 10px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none' }} />
                    <span style={{ color: '#555' }}>ate</span>
                    <input type="time" value={horarios[idx]?.fecha || '23:00'} onChange={e => { const h = [...horarios]; h[idx] = { ...h[idx], fecha: e.target.value }; setHorarios(h) }}
                      style={{ padding: '5px 10px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#555' }}>Fechado</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ENTREGA */}
        {activeTab === 'entrega' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Area de Entrega</p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>Configure os bairros e taxas de entrega</p>
              <div style={{ backgroundColor: '#111', border: '1px dashed #333', borderRadius: 8, padding: 40, textAlign: 'center' }}>
                <MapPin size={32} color="#444" style={{ marginBottom: 12 }} />
                <p style={{ color: '#666', fontSize: 14, margin: '0 0 4px' }}>Mapa de area de entrega</p>
                <p style={{ color: '#555', fontSize: 12, margin: 0 }}>Configuracao de bairros em breve</p>
              </div>
            </div>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Taxas por Distancia</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Taxa Padrao (R$)</label>
                  <input type="number" value={taxaEntrega} onChange={e => setTaxaEntrega(e.target.value)} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Gratis acima de (R$)</label>
                  <input type="number" placeholder="Ex: 50" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGAMENTOS */}
        {activeTab === 'pagamento' && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #292929' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Formas de Pagamento</p>
            </div>
            {formasPag.map((forma, idx) => (
              <div key={forma.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: idx < formasPag.length - 1 ? '1px solid #1f1f1f' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CreditCard size={16} color={forma.ativo ? '#ef4239' : '#555'} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: forma.ativo ? '#fff' : '#888' }}>{forma.label}</span>
                </div>
                <button onClick={() => { const f = [...formasPag]; f[idx] = { ...f[idx], ativo: !f[idx].ativo }; setFormasPag(f) }}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', backgroundColor: forma.ativo ? '#ef4239' : '#333', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 3, left: forma.ativo ? 22 : 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CUPONS */}
        {activeTab === 'cupons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNovoCupom(!showNovoCupom)} style={{ padding: '8px 16px', backgroundColor: '#ef4239', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif' }}>
                <Plus size={14} /> Novo Cupom
              </button>
            </div>

            {showNovoCupom && (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 20 }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Novo Cupom</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Codigo</label>
                    <input value={novoCupom.codigo} onChange={e => setNovoCupom(p => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="DESCONTO10" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'monospace', letterSpacing: 1, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={novoCupom.desconto_tipo} onChange={e => setNovoCupom(p => ({ ...p, desconto_tipo: e.target.value }))} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none' }}>
                      <option value="percentual">Percentual (%)</option>
                      <option value="fixo">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Desconto</label>
                    <input type="number" value={novoCupom.desconto_valor} onChange={e => setNovoCupom(p => ({ ...p, desconto_valor: e.target.value }))} style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Usos Maximos</label>
                    <input type="number" value={novoCupom.usos_maximos} onChange={e => setNovoCupom(p => ({ ...p, usos_maximos: e.target.value }))} placeholder="Ilimitado" style={{ width: '100%', padding: '9px 12px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={adicionarCupom} disabled={!novoCupom.codigo} style={{ flex: 1, padding: '10px', backgroundColor: novoCupom.codigo ? '#ef4239' : '#333', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: novoCupom.codigo ? 'pointer' : 'not-allowed', fontFamily: 'Mulish, sans-serif' }}>Adicionar</button>
                  <button onClick={() => setShowNovoCupom(false)} style={{ padding: '10px 16px', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, color: '#888', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>Cancelar</button>
                </div>
              </div>
            )}

            {cupons.length === 0 ? (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 40, textAlign: 'center' }}>
                <Tag size={32} color="#333" style={{ marginBottom: 12 }} />
                <p style={{ color: '#888', margin: 0 }}>Nenhum cupom cadastrado</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cupons.map(c => (
                  <div key={c.id || c.codigo} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1, fontFamily: 'monospace' }}>{c.codigo}</span>
                      <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 700, color: '#ef4239' }}>
                        {c.desconto_tipo === 'percentual' ? `${c.desconto_valor}% OFF` : `R$ ${c.desconto_valor} OFF`}
                      </span>
                    </div>
                    <button onClick={() => removerCupom(c.id, c.codigo)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botao Salvar (exceto cupons) */}
        {activeTab !== 'cupons' && (
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={salvarConfig} disabled={saving} style={{
              padding: '10px 24px', backgroundColor: savedOk ? '#22c55e' : '#ef4239', border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Mulish, sans-serif', transition: 'background 0.3s'
            }}>
              {savedOk ? <CheckCircle size={16} /> : saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {savedOk ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        )}
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

export default function CardapioDigitalPage() {
  return <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}><CardapioDigitalContent /></Suspense>
}
