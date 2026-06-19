'use client'

import { Suspense, useState } from 'react'
import { 
  DollarSign, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle2, Clock, Plus, Filter, Calendar,
  Building2, CreditCard, FileText, BarChart2,
  ChevronDown, Search, Download, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt
} from 'lucide-react'

function FinanceiroContent() {
  const [activeTab, setActiveTab] = useState('lancamentos')
  const [lancamentoTab, setLancamentoTab] = useState('pagar')

  const tabs = [
    { id: 'lancamentos', label: 'Lancamentos', icon: Receipt },
    { id: 'dre', label: 'DRE', icon: BarChart2 },
    { id: 'recebimentos', label: 'Recebimentos', icon: ArrowUpRight },
    { id: 'pagamentos', label: 'Pagamentos', icon: ArrowDownRight },
    { id: 'fornecedores', label: 'Fornecedores', icon: Building2 },
  ]

  const summaryCards = [
    { label: 'Vencidos', value: 'R$ 0,00', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    { label: 'Vencem hoje', value: 'R$ 0,00', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
    { label: 'A vencer', value: 'R$ 0,00', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    { label: 'Pagos', value: 'R$ 0,00', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  ]

  const dreRows = [
    { label: 'Receita Operacional Bruta', indent: 0, type: 'header', icon: '+', iconColor: '#22c55e' },
    { label: 'Receita de Pedidos', indent: 1, type: 'sub' },
    { label: 'Outras Receitas', indent: 1, type: 'sub' },
    { label: 'Impostos e Devolucoes', indent: 0, type: 'minus', icon: '-', iconColor: '#ef4444' },
    { label: 'Receita Operacional Liquida', indent: 0, type: 'result', icon: '=', iconColor: '#3b82f6' },
    { label: 'Custos', indent: 0, type: 'minus', icon: '-', iconColor: '#ef4444' },
    { label: 'Custo Vendas', indent: 1, type: 'sub' },
    { label: 'Lucro Bruto', indent: 0, type: 'result', icon: '=', iconColor: '#3b82f6' },
    { label: 'Margem Bruta (%)', indent: 0, type: 'pct' },
    { label: 'Despesas Operacionais', indent: 0, type: 'minus', icon: '-', iconColor: '#ef4444' },
    { label: 'Resultado Operacional (EBITDA)', indent: 0, type: 'result', icon: '=', iconColor: '#3b82f6' },
    { label: 'Margem EBITDA (%)', indent: 0, type: 'pct' },
    { label: 'Depreciacao e Amortizacao', indent: 1, type: 'sub' },
    { label: 'EBIT', indent: 0, type: 'result', icon: '=', iconColor: '#3b82f6' },
    { label: 'Resultado Financeiro', indent: 0, type: 'minus', icon: '-', iconColor: '#ef4444' },
    { label: 'Lucro Liquido', indent: 0, type: 'result', icon: '=', iconColor: '#22c55e' },
    { label: 'Margem Liquida (%)', indent: 0, type: 'pct' },
  ]

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  const fornecedores = [
    { nome: 'Distribuidora ABC', categoria: 'Ingredientes', contato: '(11) 9999-9999', email: 'abc@dist.com', saldo: 'R$ 0,00' },
    { nome: 'Embalagens XYZ', categoria: 'Embalagens', contato: '(11) 8888-8888', email: 'xyz@emb.com', saldo: 'R$ 0,00' },
  ]

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Financeiro</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Controle financeiro completo do seu negocio</p>
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

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #292929', marginBottom: '24px' }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px', fontSize: '13px', fontWeight: active ? '600' : '400',
                color: active ? '#ef4239' : '#888',
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid #ef4239' : '2px solid transparent',
                marginBottom: '-1px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'lancamentos' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { id: 'pagar', label: 'Contas a pagar', color: '#ef4239' },
              { id: 'receber', label: 'Contas a receber', color: '#22c55e' },
              { id: 'todos', label: 'Todos lancamentos', color: '#888' },
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setLancamentoTab(st.id)}
                style={{
                  padding: '6px 16px', borderRadius: '6px', fontSize: '13px',
                  fontWeight: lancamentoTab === st.id ? '600' : '400',
                  color: lancamentoTab === st.id ? '#fff' : '#888',
                  background: lancamentoTab === st.id ? st.color : 'transparent',
                  border: lancamentoTab === st.id ? 'none' : '1px solid #292929',
                  cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e6e6e6'
            }}>
              <Filter size={13} />
              Todas as categorias
              <ChevronDown size={13} />
            </div>
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
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#888', flex: 1, maxWidth: '240px'
            }}>
              <Search size={13} />
              Pesquisar...
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {summaryCards.map(card => (
              <div key={card.label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: card.bg, border: '1px solid ' + card.border,
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px'
              }}>
                <span style={{ color: '#888' }}>{card.label}</span>
                <span style={{ color: card.color, fontWeight: '700' }}>{card.value}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px'
            }}>
              <span style={{ color: '#888' }}>Total do periodo</span>
              <span style={{ color: '#a78bfa', fontWeight: '700' }}>R$ 0,00</span>
            </div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500', width: '32px' }}>
                    <input type="checkbox" style={{ accentColor: '#ef4239' }} />
                  </th>
                  {['Data', 'Status', 'Descricao', 'Forma Pgto', 'Categoria', 'Conta', 'Valor', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={9} style={{ padding: '60px 14px', textAlign: 'center', color: '#555' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Receipt size={32} style={{ color: '#333' }} />
                      <span>Nenhum lancamento encontrado</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '10px', padding: '0 4px' }}>
            por pagina: 25 — Mostrando 1-0 de 0
          </div>
        </div>
      )}

      {activeTab === 'dre' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
            }}>
              Ano: <strong>2026</strong> <ChevronDown size={13} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#e6e6e6'
            }}>
              Cardapio: <strong>Todos os cardapios</strong> <ChevronDown size={13} />
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#1a1a1a', border: '1px solid #292929',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
                color: '#e6e6e6', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                <Download size={13} />
                Excel
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #292929', marginBottom: '0' }}>
            <button style={{
              padding: '10px 18px', fontSize: '13px', fontWeight: '600',
              color: '#ef4239', background: 'none', border: 'none',
              borderBottom: '2px solid #ef4239', marginBottom: '-1px', cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif'
            }}>
              DRE - Demonstracao do resultado do exercicio
            </button>
            <button style={{
              padding: '10px 18px', fontSize: '13px', fontWeight: '400',
              color: '#888', background: 'none', border: 'none',
              borderBottom: '2px solid transparent', marginBottom: '-1px', cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif'
            }}>
              Dados utilizados para gerar o relatorio
            </button>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflowX: 'auto', marginTop: '0', borderTopLeftRadius: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500', width: '280px' }}>DRE</th>
                  {months.map(m => (
                    <th key={m} style={{ padding: '12px 10px', textAlign: 'right', color: '#888', fontWeight: '500', width: '80px' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dreRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <td style={{
                      padding: '10px 14px',
                      paddingLeft: row.indent === 1 ? '32px' : '14px',
                      color: row.type === 'pct' ? '#555' : row.type === 'result' ? '#fff' : row.type === 'header' ? '#fff' : '#aaa',
                      fontWeight: (row.type === 'result' || row.type === 'header') ? '600' : '400',
                      fontStyle: row.type === 'pct' ? 'italic' : 'normal',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {row.icon && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '16px', height: '16px', borderRadius: '3px',
                            background: row.iconColor + '22', color: row.iconColor,
                            fontSize: '12px', fontWeight: '700', flexShrink: 0
                          }}>
                            {row.icon}
                          </span>
                        )}
                        {!row.icon && <span style={{ width: '16px', flexShrink: 0 }} />}
                        {row.label}
                      </div>
                    </td>
                    {months.map(m => (
                      <td key={m} style={{
                        padding: '10px 10px', textAlign: 'right',
                        color: row.type === 'pct' ? '#555' : row.type === 'result' ? '#e6e6e6' : '#666',
                        fontStyle: row.type === 'pct' ? 'italic' : 'normal',
                        fontWeight: row.type === 'result' ? '600' : '400'
                      }}>
                        {row.type === 'pct' ? '0,00%' : '0,00'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '12px' }}>
            Em caso de duvidas clique sobre o botao de informacao ao lado de cada item
          </p>
        </div>
      )}

      {activeTab === 'recebimentos' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total recebido', value: 'R$ 0,00', icon: CheckCircle2, color: '#22c55e' },
              { label: 'Pendente', value: 'R$ 0,00', icon: Clock, color: '#f97316' },
              { label: 'Em atraso', value: 'R$ 0,00', icon: AlertCircle, color: '#ef4444' },
            ].map(kpi => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} style={{
                  flex: 1, background: '#1a1a1a', border: '1px solid #292929',
                  borderRadius: '10px', padding: '16px 18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Icon size={15} style={{ color: kpi.color }} />
                    <span style={{ fontSize: '12px', color: '#888' }}>{kpi.label}</span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>{kpi.value}</div>
                </div>
              )
            })}
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#555' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={32} style={{ color: '#333' }} />
              <span>Nenhum recebimento registrado</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pagamentos' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total pago', value: 'R$ 0,00', icon: CheckCircle2, color: '#22c55e' },
              { label: 'Pendente', value: 'R$ 0,00', icon: Clock, color: '#f97316' },
              { label: 'Em atraso', value: 'R$ 0,00', icon: AlertCircle, color: '#ef4444' },
            ].map(kpi => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} style={{
                  flex: 1, background: '#1a1a1a', border: '1px solid #292929',
                  borderRadius: '10px', padding: '16px 18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Icon size={15} style={{ color: kpi.color }} />
                    <span style={{ fontSize: '12px', color: '#888' }}>{kpi.label}</span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>{kpi.value}</div>
                </div>
              )
            })}
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#555' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <TrendingDown size={32} style={{ color: '#333' }} />
              <span>Nenhum pagamento registrado</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fornecedores' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#1a1a1a', border: '1px solid #292929',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#888'
            }}>
              <Search size={13} />
              Pesquisar fornecedor...
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#ef4239', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
            }}>
              <Plus size={14} />
              Novo Fornecedor
            </button>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #292929' }}>
                  {['Nome', 'Categoria', 'Contato', 'E-mail', 'Saldo devedor', 'Acoes'].map(col => (
                    <th key={col} style={{ padding: '12px 14px', textAlign: 'left', color: '#888', fontWeight: '500' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: '#292929', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Building2 size={15} style={{ color: '#888' }} />
                        </div>
                        {f.nome}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888' }}>{f.categoria}</td>
                    <td style={{ padding: '12px 14px', color: '#888' }}>{f.contato}</td>
                    <td style={{ padding: '12px 14px', color: '#888' }}>{f.email}</td>
                    <td style={{ padding: '12px 14px', color: '#e6e6e6', fontWeight: '600' }}>{f.saldo}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
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
    </div>
  )
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FinanceiroContent />
    </Suspense>
  )
}
