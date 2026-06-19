'use client'

import { Suspense, useState } from 'react'
import {
  FileText, Download, Calendar, ChevronDown, Plus,
  CheckCircle2, AlertCircle, Clock, Search, MoreHorizontal,
  Shield, Printer, ExternalLink, Filter
} from 'lucide-react'

function FiscalContent() {
  const [activeTab, setActiveTab] = useState('nfe')
  const [periodo, setPeriodo] = useState('Este mes')

  const tabs = [
    { id: 'nfe', label: 'NF-e' },
    { id: 'nfce', label: 'NFC-e' },
    { id: 'sat', label: 'SAT / MFE' },
    { id: 'configuracoes', label: 'Configuracoes Fiscais' },
  ]

  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    autorizada: { bg: '#22c55e20', color: '#22c55e', border: '#22c55e33' },
    cancelada: { bg: '#ef444420', color: '#ef4444', border: '#ef444433' },
    pendente: { bg: '#f9731620', color: '#f97316', border: '#f9731633' },
  }

  const notas = [
    { numero: '000001', serie: '1', data: '18/06/2026', cliente: 'Consumidor Final', valor: 'R$ 0,00', status: 'autorizada' },
    { numero: '000002', serie: '1', data: '18/06/2026', cliente: 'Consumidor Final', valor: 'R$ 0,00', status: 'pendente' },
  ]

  const configItems = [
    { label: 'Certificado Digital', desc: 'Gerencie seu certificado A1 ou A3 para emissao de notas', icon: Shield, status: 'Nao configurado' },
    { label: 'Dados da Empresa', desc: 'CNPJ, razao social, endereco fiscal e regime tributario', icon: FileText, status: 'Pendente' },
    { label: 'Regime Tributario', desc: 'Simples Nacional, Lucro Presumido ou Lucro Real', icon: CheckCircle2, status: 'Pendente' },
    { label: 'Ambiente de Emissao', desc: 'Homologacao (testes) ou Producao (notas reais)', icon: ExternalLink, status: 'Homologacao' },
  ]

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Fiscal</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Emissao e gestao de documentos fiscais eletronicos</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#ef4239', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          <Plus size={15} />
          Emitir Nota
        </button>
      </div>

      {/* Alert */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#f9731610', border: '1px solid #f9731633',
        borderRadius: '10px', padding: '12px 16px', marginBottom: '20px'
      }}>
        <AlertCircle size={16} style={{ color: '#f97316', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: '#f97316' }}>
          Configure seu certificado digital e dados fiscais para comecar a emitir notas fiscais.
        </span>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Notas Autorizadas', value: '0', icon: CheckCircle2, color: '#22c55e' },
          { label: 'Notas Canceladas', value: '0', icon: AlertCircle, color: '#ef4444' },
          { label: 'Notas Pendentes', value: '0', icon: Clock, color: '#f97316' },
          { label: 'Valor Total', value: 'R$ 0,00', icon: FileText, color: '#3b82f6' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={i} style={{
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '10px', padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icon size={14} style={{ color: kpi.color }} />
                <span style={{ fontSize: '12px', color: '#888' }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{kpi.value}</div>
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

      {/* NF-e / NFC-e / SAT */}
      {(activeTab === 'nfe' || activeTab === 'nfce' || activeTab === 'sat') && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e6e6e6'
            }}>
              <Calendar size={13} />
              Este mes
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e6e6e6'
            }}>
              <Filter size={13} />
              Todos os status
              <ChevronDown size={13} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#888',
              flex: 1, maxWidth: '240px'
            }}>
              <Search size={13} />
              Buscar numero ou cliente...
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
                color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                <Download size={13} /> Exportar
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Numero', 'Serie', 'Data', 'Cliente/Destinatario', 'Valor', 'Status', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notas.map((nota, i) => {
                  const st = statusColors[nota.status] || statusColors['pendente']
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }}>
                      <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '500', fontFamily: 'monospace' }}>{nota.numero}</td>
                      <td style={{ padding: '12px 14px', color: '#888' }}>{nota.serie}</td>
                      <td style={{ padding: '12px 14px', color: '#888' }}>{nota.data}</td>
                      <td style={{ padding: '12px 14px', color: '#e6e6e6' }}>{nota.cliente}</td>
                      <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '600' }}>{nota.valor}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px',
                          background: st.bg, color: st.color, border: '1px solid ' + st.border,
                          textTransform: 'capitalize'
                        }}>{nota.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', display: 'flex', gap: '6px' }}>
                        <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                          <Printer size={14} />
                        </button>
                        <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                          <Download size={14} />
                        </button>
                        <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '10px' }}>
            Mostrando {notas.length} nota(s) fiscal(is)
          </div>
        </div>
      )}

      {/* CONFIGURACOES */}
      {activeTab === 'configuracoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {configItems.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} style={{
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '10px', padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px',
                  background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Icon size={18} style={{ color: '#888' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{item.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#555' }}>{item.status}</span>
                  <button style={{
                    background: '#292929', border: '1px solid #333',
                    borderRadius: '7px', padding: '6px 14px', fontSize: '12px',
                    color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                  }}>
                    Configurar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function FiscalPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FiscalContent />
    </Suspense>
  )
}
