'use client'

import { Suspense, useState } from 'react'
import {
  AlertCircle, Users, Clock, TrendingUp, TrendingDown,
  Plus, Search, Calendar, Download, MoreHorizontal, Receipt
} from 'lucide-react'

function FiadoContent() {
  const [activeTab, setActiveTab] = useState('visao')

  const tabs = [
    { id: 'visao', label: 'Visao Geral' },
    { id: 'dividas', label: 'Controle de Dividas' },
    { id: 'sem_pagamento', label: 'Vendas sem Pagamento' },
  ]

  const clientes = [
    { nome: 'Maria Silva', telefone: '(11) 99999-0001', divida: 'R$ 0,00', ultima: '—', status: 'em_dia' },
    { nome: 'Joao Souza', telefone: '(11) 99999-0002', divida: 'R$ 0,00', ultima: '—', status: 'em_dia' },
  ]

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Fiado</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Controle de vendas a prazo e dividas de clientes</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#ef4239', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          <Plus size={15} />
          Novo Lancamento
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'em dividas no fiado', value: 'R$ 0,00', icon: Receipt, iconBg: '#ef423920', iconColor: '#ef4239' },
          { label: 'clientes com divida', value: '0', icon: Users, iconBg: '#3b82f620', iconColor: '#3b82f6' },
          { label: 'sem pagamento ha + 30 dias', value: 'R$ 0,00', icon: AlertCircle, iconBg: '#f9731620', iconColor: '#f97316' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={i} style={{
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon size={22} style={{ color: kpi.iconColor }} />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>{kpi.value}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{kpi.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #292929', marginBottom: '24px' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 16px', fontSize: '13px', fontWeight: active ? '600' : '400',
              color: active ? '#ef4239' : '#888',
              background: 'none', border: 'none',
              borderBottom: active ? '2px solid #ef4239' : '2px solid transparent',
              marginBottom: '-1px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* VISAO GERAL */}
      {activeTab === 'visao' && (
        <div>
          {/* Chart placeholder */}
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#e6e6e6' }}>Vendas e recebimentos no periodo</div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>-R$ 0,00</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>R$ 0,00</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '11px', color: '#888' }}>Vendas no fiado</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: '11px', color: '#888' }}>Recebimentos do fiado</span>
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#111', border: '1px solid #292929',
                borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#e6e6e6'
              }}>
                <Calendar size={13} />
                Ultimos 31 dias
              </div>
            </div>
            {/* Chart area */}
            <div style={{
              height: '120px', background: '#111', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#333', fontSize: '13px'
            }}>
              Sem dados no periodo
            </div>
          </div>

          {/* History table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#e6e6e6' }}>Historico das operacoes do periodo</span>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '7px', padding: '6px 12px', fontSize: '12px',
              color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              <Download size={12} /> Excel
            </button>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Data', 'Cliente', 'Tipo', 'Valor', 'Saldo', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#555' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Receipt size={28} style={{ color: '#333' }} />
                      <span>Nenhuma operacao no periodo</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTROLE DE DIVIDAS */}
      {activeTab === 'dividas' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#888',
              flex: 1, maxWidth: '280px'
            }}>
              <Search size={13} />
              Pesquisar cliente...
            </div>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Cliente', 'Telefone', 'Divida Total', 'Ultima Compra', 'Status', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', color: '#888', fontWeight: '600'
                        }}>{c.nome[0]}</div>
                        {c.nome}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888' }}>{c.telefone}</td>
                    <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '600' }}>{c.divida}</td>
                    <td style={{ padding: '12px 14px', color: '#555' }}>{c.ultima}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px',
                        background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e33'
                      }}>Em dia</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDAS SEM PAGAMENTO */}
      {activeTab === 'sem_pagamento' && (
        <div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Data', 'Pedido', 'Cliente', 'Valor', 'Dias em aberto', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: '#555' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Clock size={28} style={{ color: '#333' }} />
                      <span>Nenhuma venda sem pagamento</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FiadoPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FiadoContent />
    </Suspense>
  )
}
