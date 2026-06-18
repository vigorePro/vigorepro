'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  Globe, Settings, Clock, MapPin, CreditCard, Tag, QrCode,
  Copy, ExternalLink, Check, ToggleLeft, ToggleRight,
  ChevronRight, Bike, ShoppingBag, UtensilsCrossed, Plus, Trash2
} from 'lucide-react'

const TABS = [
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'horario', label: 'Horário', icon: Clock },
  { id: 'entrega', label: 'Área de Entrega', icon: MapPin },
  { id: 'pagamento', label: 'Formas de Pagamento', icon: CreditCard },
  { id: 'cupons', label: 'Cupons', icon: Tag },
]

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function CardapioDigitalContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [activeTab, setActiveTab] = useState('configuracoes')
  const [deliveryAtivo, setDeliveryAtivo] = useState(true)
  const [retiradaAtivo, setRetiradaAtivo] = useState(true)
  const [consumoLocalAtivo, setConsumoLocalAtivo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pedidoMinimo, setPedidoMinimo] = useState('0,00')
  const [temaCor, setTemaCor] = useState('#ef4239')

  const publicLink = `https://cardapio.vigorepro.com.br/${slug}`

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [horarios, setHorarios] = useState(
    DIAS.map((dia, i) => ({
      dia,
      ativo: i < 5,
      abertura: '08:00',
      fechamento: '22:00'
    }))
  )

  const [formasPag, setFormasPag] = useState([
    { id: 1, nome: 'Dinheiro', ativo: true },
    { id: 2, nome: 'Cartão de Crédito', ativo: true },
    { id: 3, nome: 'Cartão de Débito', ativo: true },
    { id: 4, nome: 'Pix', ativo: true },
    { id: 5, nome: 'Vale Refeição', ativo: false },
  ])

  const [cupons, setCupons] = useState([
    { id: 1, codigo: 'BEMVINDO10', desconto: 10, tipo: '%', usos: 0, limite: 100, ativo: true },
    { id: 2, codigo: 'FRETE0', desconto: 0, tipo: 'frete', usos: 5, limite: 50, ativo: false },
  ])

  const [areas, setAreas] = useState([
    { id: 1, bairro: 'Centro', taxa: 0, tempo: '30-45 min' },
    { id: 2, bairro: 'Zona Norte', taxa: 5, tempo: '45-60 min' },
  ])

  const s = (obj: Record<string, string | number | boolean>) =>
    Object.entries(obj).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}) as React.CSSProperties

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderBottom: active ? '2px solid #ef4239' : '2px solid transparent',
    color: active ? '#ef4239' : '#888',
    fontWeight: active ? 600 : 400,
    fontSize: '13px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #ef4239' : '2px solid transparent',
    whiteSpace: 'nowrap',
    fontFamily: 'Mulish, sans-serif',
  })

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #292929',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  }

  const labelStyle: React.CSSProperties = {
    color: '#888',
    fontSize: '12px',
    marginBottom: '6px',
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#111',
    border: '1px solid #292929',
    borderRadius: '8px',
    color: '#e6e6e6',
    fontSize: '14px',
    fontFamily: 'Mulish, sans-serif',
    boxSizing: 'border-box',
  }

  const toggleStyle = (ativo: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: ativo ? '#ef423920' : '#1a1a1a',
    border: `1px solid ${ativo ? '#ef4239' : '#292929'}`,
    color: ativo ? '#ef4239' : '#888',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Mulish, sans-serif',
  })

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 0',
        borderBottom: '1px solid #292929',
        backgroundColor: '#111',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Globe size={22} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Cardápio Digital</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Configure seu cardápio online</p>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '900px' }}>

        {/* ====== ABA CONFIGURACOES ====== */}
        {activeTab === 'configuracoes' && (
          <>
            {/* Preview + Link */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Globe size={18} color='#ef4239' />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Link do Cardápio Público</span>
              </div>

              {/* Preview card */}
              <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)',
                border: '1px solid #292929',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                borderTop: `4px solid ${temaCor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    backgroundColor: temaCor, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>VP</span>
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Dolce & Dolce</div>
                    <div style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                      Aberto agora
                    </div>
                  </div>
                </div>
                <div style={{ color: '#888', fontSize: '12px' }}>Cardápio digital com delivery e retirada</div>
              </div>

              {/* Link */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  readOnly
                  value={publicLink}
                  style={{ ...inputStyle, flex: 1, color: '#ef4239', cursor: 'text' }}
                />
                <button onClick={copyLink} style={{
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid #292929',
                  backgroundColor: copied ? '#22c55e20' : '#1a1a1a',
                  color: copied ? '#22c55e' : '#e6e6e6',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', fontFamily: 'Mulish, sans-serif', flexShrink: 0
                }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <a href={publicLink} target='_blank' rel='noopener noreferrer' style={{
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid #292929',
                  backgroundColor: '#1a1a1a', color: '#e6e6e6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                  textDecoration: 'none', flexShrink: 0
                }}>
                  <ExternalLink size={14} />
                  Abrir
                </a>
              </div>
            </div>

            {/* Cor do tema */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Aparência</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Cor Principal do Tema</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type='color'
                      value={temaCor}
                      onChange={e => setTemaCor(e.target.value)}
                      style={{ width: '48px', height: '40px', border: '1px solid #292929', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#111', padding: '2px' }}
                    />
                    <input
                      type='text'
                      value={temaCor}
                      onChange={e => setTemaCor(e.target.value)}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome do Estabelecimento</label>
                  <input type='text' defaultValue='Dolce & Dolce' style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Categoria</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option>Restaurante</option>
                    <option>Lanchonete</option>
                    <option>Pizzaria</option>
                    <option>Padaria</option>
                    <option>Hamburgueria</option>
                    <option>Cafeteria</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tipos de pedido */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Tipos de Pedido</div>
                  <div style={{ color: '#888', fontSize: '12px' }}>Configure entrega, retirada e consumo no local</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                {[
                  { label: 'Delivery', icon: Bike, ativo: deliveryAtivo, set: setDeliveryAtivo },
                  { label: 'Retirada', icon: ShoppingBag, ativo: retiradaAtivo, set: setRetiradaAtivo },
                  { label: 'Consumo no Local', icon: UtensilsCrossed, ativo: consumoLocalAtivo, set: setConsumoLocalAtivo },
                ].map(({ label, icon: Icon, ativo, set }) => (
                  <div key={label} style={{
                    flex: 1, minWidth: '180px',
                    padding: '16px',
                    borderRadius: '10px',
                    border: `1px solid ${ativo ? '#ef4239' : '#292929'}`,
                    backgroundColor: ativo ? '#281615' : '#111',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={16} color={ativo ? '#ef4239' : '#888'} />
                        <span style={{ color: ativo ? '#ef4239' : '#888', fontWeight: 600, fontSize: '14px' }}>{label}</span>
                      </div>
                      <button onClick={() => set(!ativo)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: ativo ? '#22c55e' : '#444', padding: 0
                      }}>
                        {ativo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                    {label === 'Delivery' && ativo && (
                      <div>
                        <label style={labelStyle}>Pedido Mínimo</label>
                        <input
                          type='text'
                          value={`R$ ${pedidoMinimo}`}
                          onChange={e => setPedidoMinimo(e.target.value.replace('R$ ', ''))}
                          style={{ ...inputStyle, fontSize: '13px' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Botao salvar */}
            <button style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4239',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif',
            }}>
              Salvar Configurações
            </button>
          </>
        )}

        {/* ====== ABA HORARIO ====== */}
        {activeTab === 'horario' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Clock size={18} color='#ef4239' />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Horário de Atendimento</span>
            </div>
            {horarios.map((h, i) => (
              <div key={h.dia} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '12px 0',
                borderBottom: i < horarios.length - 1 ? '1px solid #222' : 'none'
              }}>
                <div style={{ width: '90px', color: h.ativo ? '#e6e6e6' : '#444', fontSize: '14px', fontWeight: 500 }}>{h.dia}</div>
                <button onClick={() => {
                  const updated = [...horarios]
                  updated[i].ativo = !updated[i].ativo
                  setHorarios(updated)
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: h.ativo ? '#22c55e' : '#444', padding: 0 }}>
                  {h.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
                {h.ativo ? (
                  <>
                    <input
                      type='time'
                      value={h.abertura}
                      onChange={e => {
                        const updated = [...horarios]
                        updated[i].abertura = e.target.value
                        setHorarios(updated)
                      }}
                      style={{ ...inputStyle, width: '120px', colorScheme: 'dark' }}
                    />
                    <span style={{ color: '#888' }}>até</span>
                    <input
                      type='time'
                      value={h.fechamento}
                      onChange={e => {
                        const updated = [...horarios]
                        updated[i].fechamento = e.target.value
                        setHorarios(updated)
                      }}
                      style={{ ...inputStyle, width: '120px', colorScheme: 'dark' }}
                    />
                  </>
                ) : (
                  <span style={{ color: '#444', fontSize: '13px' }}>Fechado</span>
                )}
              </div>
            ))}
            <button style={{
              marginTop: '20px',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4239',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif',
            }}>
              Salvar Horários
            </button>
          </div>
        )}

        {/* ====== ABA AREA DE ENTREGA ====== */}
        {activeTab === 'entrega' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color='#ef4239' />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Áreas de Entrega</span>
              </div>
              <button
                onClick={() => setAreas([...areas, { id: Date.now(), bairro: '', taxa: 0, tempo: '30-45 min' }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  border: 'none', backgroundColor: '#ef4239',
                  color: '#fff', fontWeight: 600, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'Mulish, sans-serif',
                }}>
                <Plus size={14} />
                Adicionar Área
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: '#888', fontSize: '12px', marginBottom: '8px', padding: '0 4px' }}>
              <span style={{ flex: 2 }}>Bairro / Região</span>
              <span style={{ flex: 1 }}>Taxa de Entrega</span>
              <span style={{ flex: 1 }}>Tempo Estimado</span>
              <span style={{ width: '40px' }}></span>
            </div>
            {areas.map((area, i) => (
              <div key={area.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input
                  type='text'
                  value={area.bairro}
                  placeholder='Ex: Centro'
                  onChange={e => {
                    const updated = [...areas]
                    updated[i].bairro = e.target.value
                    setAreas(updated)
                  }}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <div style={{ flex: 1, position: 'relative' as const }}>
                  <span style={{ position: 'absolute' as const, left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '13px' }}>R$</span>
                  <input
                    type='number'
                    value={area.taxa}
                    onChange={e => {
                      const updated = [...areas]
                      updated[i].taxa = Number(e.target.value)
                      setAreas(updated)
                    }}
                    style={{ ...inputStyle, paddingLeft: '28px' }}
                  />
                </div>
                <input
                  type='text'
                  value={area.tempo}
                  placeholder='30-45 min'
                  onChange={e => {
                    const updated = [...areas]
                    updated[i].tempo = e.target.value
                    setAreas(updated)
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => setAreas(areas.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4239', padding: '8px', flexShrink: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button style={{
              marginTop: '16px',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4239',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif',
            }}>
              Salvar Áreas
            </button>
          </div>
        )}

        {/* ====== ABA PAGAMENTO ====== */}
        {activeTab === 'pagamento' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <CreditCard size={18} color='#ef4239' />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Formas de Pagamento</span>
            </div>
            {formasPag.map((forma, i) => (
              <div key={forma.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0',
                borderBottom: i < formasPag.length - 1 ? '1px solid #222' : 'none'
              }}>
                <span style={{ color: forma.ativo ? '#e6e6e6' : '#555', fontSize: '14px' }}>{forma.nome}</span>
                <button onClick={() => {
                  const updated = [...formasPag]
                  updated[i].ativo = !updated[i].ativo
                  setFormasPag(updated)
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: forma.ativo ? '#22c55e' : '#444', padding: 0 }}>
                  {forma.ativo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
            <button style={{
              marginTop: '20px',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4239',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif',
            }}>
              Salvar
            </button>
          </div>
        )}

        {/* ====== ABA CUPONS ====== */}
        {activeTab === 'cupons' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={18} color='#ef4239' />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Cupons de Desconto</span>
                </div>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  border: 'none', backgroundColor: '#ef4239',
                  color: '#fff', fontWeight: 600, fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'Mulish, sans-serif',
                }}>
                  <Plus size={14} />
                  Novo Cupom
                </button>
              </div>
              {cupons.map((cupom, i) => (
                <div key={cupom.id} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${cupom.ativo ? '#ef423940' : '#222'}`,
                  backgroundColor: cupom.ativo ? '#281615' : '#111',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ef423920',
                    color: '#ef4239',
                    fontWeight: 700,
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}>
                    {cupom.codigo}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e6e6e6', fontSize: '14px' }}>
                      {cupom.tipo === 'frete' ? 'Frete Grátis' : `${cupom.desconto}% de desconto`}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px' }}>{cupom.usos}/{cupom.limite} usos</div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: cupom.ativo ? '#22c55e20' : '#333',
                    color: cupom.ativo ? '#22c55e' : '#555',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {cupom.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                  <button onClick={() => {
                    const updated = [...cupons]
                    updated[i].ativo = !updated[i].ativo
                    setCupons(updated)
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cupom.ativo ? '#22c55e' : '#444', padding: 0 }}>
                    {cupom.ativo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function CardapioDigitalPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <CardapioDigitalContent />
    </Suspense>
  )
}
