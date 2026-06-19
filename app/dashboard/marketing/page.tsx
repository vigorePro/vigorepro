'use client'

import { Suspense, useState } from 'react'
import {
  BarChart2, Send, Users, MessageCircle, Smartphone,
  ExternalLink, Play, Eye, Zap, RefreshCw, Download,
  ChevronDown, Plus, Star, RotateCcw, Gift, Crown,
  TrendingUp, ShoppingCart, DollarSign, Target, Sparkles
} from 'lucide-react'

function MarketingContent() {
  const [activeTab, setActiveTab] = useState('pixel')
  const [wppTab, setWppTab] = useState('indicadores')

  const tabs = [
    { id: 'pixel', label: 'Pixel Analytics', icon: BarChart2, badge: 'NOVO' },
    { id: 'campanhas_wpp', label: 'Campanhas WhatsApp', icon: MessageCircle },
    { id: 'segmentacao', label: 'Segmentacao', icon: Users, badge: 'NOVO' },
    { id: 'sms', label: 'Campanhas SMS', icon: Smartphone, badge: 'NOVO' },
    { id: 'api_wpp', label: 'API WhatsApp', icon: ExternalLink, badge: 'EM BREVE' },
  ]

  const segModelos = [
    { tag: 'Reconquista', tagColor: '#f97316', title: 'Clientes sumidos (reconquista)', desc: 'Ja compraram mais de uma vez, mas nao voltam ha mais de 30 dias.' },
    { tag: 'Reconquista', tagColor: '#f97316', title: 'Inativos ha mais de 90 dias', desc: 'Clientes que nao compram ha mais de 3 meses.' },
    { tag: 'Fidelizacao', tagColor: '#8b5cf6', title: 'Incentivar a 2a compra', desc: 'Clientes que compraram so uma vez nos ultimos 30 dias.' },
    { tag: 'Fidelizacao', tagColor: '#8b5cf6', title: 'Clientes VIP (alto valor)', desc: 'Compram com frequencia e gastam bem (RFV alto).' },
    { tag: 'Reconquista', tagColor: '#f97316', title: 'Cashback parado (traga de volta)', desc: 'Clientes com saldo de cashback que nao foi usado.' },
    { tag: 'Fidelizacao', tagColor: '#8b5cf6', title: 'Aniversariantes do mes', desc: 'Clientes que fazem aniversario este mes.' },
  ]

  const funnelSteps = ['Acessos', 'Sacola', 'Checkout', 'Pagamento', 'Pedidos']

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Food Marketing</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Campanhas, segmentacao e analytics para seu negocio</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#ef4239', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          <Plus size={15} />
          Nova Campanha
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #292929', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 14px', fontSize: '13px', fontWeight: active ? '600' : '400',
              color: active ? '#ef4239' : '#888',
              background: 'none', border: 'none',
              borderBottom: active ? '2px solid #ef4239' : '2px solid transparent',
              marginBottom: '-1px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              <Icon size={14} />
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px',
                  background: tab.badge === 'EM BREVE' ? '#292929' : tab.badge === 'NOVO' ? '#22c55e22' : '#22c55e22',
                  color: tab.badge === 'EM BREVE' ? '#888' : '#22c55e',
                  border: tab.badge === 'EM BREVE' ? '1px solid #333' : '1px solid #22c55e44'
                }}>{tab.badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* PIXEL ANALYTICS */}
      {activeTab === 'pixel' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>Pixel Analytics</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: '12px', color: '#22c55e' }}>Ao vivo</span>
                  <span style={{ fontSize: '12px', color: '#555' }}>· Atualizando em tempo real</span>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Site Analytics do cardapio digital com funil, tempos, visitantes e performance.</p>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
            }}>
              Ultimos 7 dias <RefreshCw size={13} style={{ color: '#888' }} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
            }}>
              Contexto: <strong>Delivery</strong> <ChevronDown size={13} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
            }}>
              Origem: <strong>Todas</strong> <ChevronDown size={13} />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                <Download size={13} /> Exportar Excel
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                Saiba como funciona
              </button>
            </div>
          </div>

          {/* Empty State */}
          <div style={{
            background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px',
            padding: '80px 40px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#555' }}>Sem dados no periodo selecionado.</div>
            <div style={{ fontSize: '12px', color: '#333', marginTop: '8px' }}>
              Instale o Pixel no seu cardapio digital para comecar a rastrear visitantes
            </div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#ef4239', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 18px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif', marginTop: '16px'
            }}>
              <Zap size={14} /> Instalar Pixel
            </button>
          </div>
        </div>
      )}

      {/* CAMPANHAS WHATSAPP */}
      {activeTab === 'campanhas_wpp' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #292929', marginBottom: '24px' }}>
            {[
              { id: 'indicadores', label: 'Indicadores', badge: 'NOVO' },
              { id: 'campanhas', label: 'Campanhas' },
              { id: 'automacao', label: 'Automacao', badge: 'EM BREVE' },
            ].map(st => (
              <button key={st.id} onClick={() => setWppTab(st.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 14px', fontSize: '13px', fontWeight: wppTab === st.id ? '600' : '400',
                color: wppTab === st.id ? '#ef4239' : '#888',
                background: 'none', border: 'none',
                borderBottom: wppTab === st.id ? '2px solid #ef4239' : '2px solid transparent',
                marginBottom: '-1px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                {st.label}
                {st.badge && (
                  <span style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px',
                    background: st.badge === 'EM BREVE' ? '#292929' : '#22c55e22',
                    color: st.badge === 'EM BREVE' ? '#888' : '#22c55e',
                    border: st.badge === 'EM BREVE' ? '1px solid #333' : '1px solid #22c55e44'
                  }}>{st.badge}</span>
                )}
              </button>
            ))}
          </div>

          {wppTab === 'indicadores' && (
            <div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#1a1a1a', border: '1px solid #292929',
                  borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
                }}>
                  Ultimos 7 dias <RefreshCw size={13} />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#1a1a1a', border: '1px solid #292929',
                  borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
                }}>
                  Canal: <strong>Todos</strong> <ChevronDown size={13} />
                </div>
              </div>

              {/* Empty/info state */}
              <div style={{
                background: '#1a1a1a', border: '1px dashed #292929', borderRadius: '12px',
                padding: '40px', marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '12px',
                    background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <MessageCircle size={28} style={{ color: '#555' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                      Sem acessos de WhatsApp ou BeeBot no periodo
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6' }}>
                      Quando alguem clicar em um link do BeeBot ou de uma campanha de WhatsApp, voce vera aqui o funil completo (acessos, sacola, pedidos), receita gerada e conversao por campanha.
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                      <div>• Verifique se o intervalo selecionado tem disparos recentes</div>
                      <div>• Confira na aba <strong style={{ color: '#e6e6e6' }}>Campanhas</strong> se ha campanhas enviadas</div>
                      <div>• O rastreio e por sessao do clique</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              {['BeeBot', 'Campanhas WhatsApp'].map(section => (
                <div key={section} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <MessageCircle size={15} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#e6e6e6' }}>{section}</span>
                    <span style={{ fontSize: '11px', color: '#555', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px', border: '1px solid #292929' }}>PREVIA</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { label: 'Acessos', icon: TrendingUp, color: '#3b82f6' },
                      { label: 'Pedidos', icon: ShoppingCart, color: '#22c55e' },
                      { label: 'Receita', icon: DollarSign, color: '#f59e0b' },
                      { label: 'Conversao', icon: Target, color: '#8b5cf6' },
                    ].map(kpi => {
                      const Icon = kpi.icon
                      return (
                        <div key={kpi.label} style={{
                          flex: 1, background: '#1a1a1a', border: '1px solid #292929',
                          borderRadius: '10px', padding: '14px 16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Icon size={13} style={{ color: kpi.color }} />
                            <span style={{ fontSize: '12px', color: '#888' }}>{kpi.label}</span>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#555' }}>—</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Funnel */}
              <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>Funil por canal (previa)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {funnelSteps.map((step, i) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{
                        flex: 1, background: '#111', border: '1px solid #292929', borderRadius: '8px',
                        padding: '10px', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '11px', color: '#555' }}>{step}</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginTop: '4px' }}>—</div>
                      </div>
                      {i < funnelSteps.length - 1 && (
                        <div style={{ color: '#333', fontSize: '16px' }}>→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wppTab === 'campanhas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: '#888' }}>Nenhuma campanha enviada ainda</span>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#ef4239', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                }}>
                  <Send size={13} /> Nova Campanha
                </button>
              </div>
              <div style={{
                background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px',
                padding: '80px', textAlign: 'center', color: '#555'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Send size={32} style={{ color: '#333' }} />
                  <span>Nenhuma campanha encontrada</span>
                  <span style={{ fontSize: '12px', color: '#333' }}>Crie sua primeira campanha de WhatsApp para alcancar seus clientes</span>
                </div>
              </div>
            </div>
          )}

          {wppTab === 'automacao' && (
            <div style={{
              background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px',
              padding: '60px', textAlign: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Zap size={24} style={{ color: '#555' }} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#888' }}>Automacao em breve</div>
                <div style={{ fontSize: '13px', color: '#555' }}>Configure disparos automaticos baseados no comportamento dos clientes</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEGMENTACAO */}
      {activeTab === 'segmentacao' && (
        <div>
          {/* Onboarding */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
            border: '1px solid #292929', borderRadius: '12px', padding: '24px', marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sparkles size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Comece em 3 passos</span>
            </div>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>
              Voce ainda nao criou nenhuma segmentacao. Use os modelos prontos como ponto de partida, teste o tamanho da audiencia antes de aplicar e depois personalize do seu jeito.
            </p>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#ef4239', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 18px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              <Plus size={14} /> Criar do zero
            </button>
          </div>

          {/* 3 Steps */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            {[
              {
                num: '1', title: 'Escolha um modelo', icon: Target,
                desc: 'Publicos prontos curados, como clientes sumidos, aniversariantes e VIPs.'
              },
              {
                num: '2', title: 'Teste antes de usar', icon: Eye,
                desc: 'Pre-visualize quantos clientes a segmentacao alcanca hoje sem salvar nada.'
              },
              {
                num: '3', title: 'Personalize e salve', icon: Sparkles,
                desc: 'Duplique o modelo e ajuste as regras conforme sua estrategia de campanha.'
              },
            ].map(step => {
              const Icon = step.icon
              return (
                <div key={step.num} style={{
                  flex: 1, background: '#1a1a1a', border: '1px solid #292929',
                  borderRadius: '10px', padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      background: '#ef423920', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={13} style={{ color: '#ef4239' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{step.num}. {step.title}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#888', margin: 0, lineHeight: '1.5' }}>{step.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Models */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#e6e6e6' }}>Modelos prontos ({segModelos.length})</span>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', color: '#ef4239',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              Ver em detalhe →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {segModelos.map((modelo, i) => (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '12px', padding: '18px'
              }}>
                <div style={{
                  display: 'inline-block', fontSize: '11px', fontWeight: '700',
                  color: modelo.tagColor, background: modelo.tagColor + '15',
                  border: '1px solid ' + modelo.tagColor + '33',
                  borderRadius: '4px', padding: '2px 8px', marginBottom: '10px'
                }}>
                  {modelo.tag}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>{modelo.title}</div>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.5', marginBottom: '14px' }}>{modelo.desc}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'transparent', border: '1px solid #292929',
                    borderRadius: '7px', padding: '6px 12px', fontSize: '12px',
                    color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                  }}>
                    <Eye size={12} /> Testar
                  </button>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#ef4239', border: 'none',
                    borderRadius: '7px', padding: '6px 12px', fontSize: '12px',
                    color: '#fff', cursor: 'pointer', fontFamily: 'Mulish, sans-serif', fontWeight: '600'
                  }}>
                    <Sparkles size={12} /> Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SMS */}
      {activeTab === 'sms' && (
        <div style={{
          background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px',
          padding: '60px', textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Smartphone size={24} style={{ color: '#555' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Campanhas SMS</div>
              <span style={{
                fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px',
                background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44'
              }}>NOVO</span>
            </div>
            <div style={{ fontSize: '13px', color: '#555' }}>Envie mensagens SMS para seus clientes com ofertas e promocoes</div>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#ef4239', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 18px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif', marginTop: '8px'
            }}>
              <Plus size={14} /> Criar Campanha SMS
            </button>
          </div>
        </div>
      )}

      {/* API WHATSAPP */}
      {activeTab === 'api_wpp' && (
        <div style={{
          background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px',
          padding: '60px', textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageCircle size={24} style={{ color: '#555' }} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#888' }}>API Oficial WhatsApp — Em breve</div>
            <div style={{ fontSize: '13px', color: '#555', maxWidth: '360px' }}>
              Integre a API oficial do WhatsApp Business para envios em escala, templates aprovados e automacoes avancadas.
            </div>
            <div style={{
              display: 'inline-block', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '6px',
              background: '#292929', color: '#888', border: '1px solid #333', marginTop: '8px'
            }}>
              EM BREVE
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <MarketingContent />
    </Suspense>
  )
}
