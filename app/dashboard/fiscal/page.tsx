'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, Receipt, Settings, AlertTriangle, CheckCircle, Clock, RefreshCw, Download, Eye, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type NotaFiscal = {
  id: string
  estabelecimento_id: string
  numero: string
  serie: string
  tipo: 'nfe' | 'nfce' | 'sat'
  status: 'autorizada' | 'cancelada' | 'denegada' | 'pendente'
  chave_acesso: string | null
  valor_total: number
  cliente_nome: string | null
  cliente_cpf_cnpj: string | null
  data_emissao: string
  xml_url: string | null
  pdf_url: string | null
  created_at: string
}

type ConfigFiscal = {
  id: string
  estabelecimento_id: string
  cnpj: string
  razao_social: string
  regime_tributario: string
  ambiente: 'producao' | 'homologacao'
  serie_nfe: string
  serie_nfce: string
  ultimo_numero_nfe: number
  ultimo_numero_nfce: number
  certificado_validade: string | null
  ativo: boolean
}

function FiscalContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [notas, setNotas] = useState<NotaFiscal[]>([])
  const [config, setConfig] = useState<ConfigFiscal | null>(null)
  const [loading, setLoading] = useState(true)
  const [estabelecimentoId, setEstabelecimentoId] = useState('')
  const [activeTab, setActiveTab] = useState<'nfe' | 'nfce' | 'sat' | 'config'>('nfe')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configForm, setConfigForm] = useState({
    cnpj: '', razao_social: '', regime_tributario: 'simples',
    ambiente: 'homologacao' as 'producao' | 'homologacao',
    serie_nfe: '1', serie_nfce: '1'
  })

  const fetchEstabelecimento = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (data) setEstabelecimentoId(data.id)
  }, [slug])

  const fetchData = useCallback(async (estId: string) => {
    const [notasRes, configRes] = await Promise.all([
      supabase.from('notas_fiscais').select('*').eq('estabelecimento_id', estId).order('created_at', { ascending: false }).limit(100),
      supabase.from('config_fiscal').select('*').eq('estabelecimento_id', estId).single()
    ])
    setNotas(notasRes.data || [])
    setConfig(configRes.data || null)
    if (!configRes.data) setShowConfigForm(true)
  }, [])

  useEffect(() => { fetchEstabelecimento() }, [fetchEstabelecimento])

  useEffect(() => {
    if (!estabelecimentoId) return
    const load = async () => {
      setLoading(true)
      await fetchData(estabelecimentoId)
      setLoading(false)
    }
    load()
  }, [estabelecimentoId, fetchData])

  const notasFiltradas = notas.filter(n => {
    const matchSearch = n.numero?.includes(searchTerm) ||
      n.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.chave_acesso?.includes(searchTerm)
    const matchStatus = statusFiltro === 'todos' || n.status === statusFiltro
    const matchTipo = n.tipo === activeTab
    return matchSearch && matchStatus && matchTipo && activeTab !== 'config'
  })

  const nfe = notas.filter(n => n.tipo === 'nfe')
  const nfce = notas.filter(n => n.tipo === 'nfce')
  const sat = notas.filter(n => n.tipo === 'sat')
  const autorizadas = notas.filter(n => n.status === 'autorizada').length
  const canceladas = notas.filter(n => n.status === 'cancelada').length
  const valorTotal = notas.filter(n => n.status === 'autorizada').reduce((acc, n) => acc + Number(n.valor_total), 0)

  const handleSaveConfig = async () => {
    if (!configForm.cnpj || !configForm.razao_social || !estabelecimentoId) return
    setSavingConfig(true)
    if (config) {
      await supabase.from('config_fiscal').update({
        cnpj: configForm.cnpj, razao_social: configForm.razao_social,
        regime_tributario: configForm.regime_tributario, ambiente: configForm.ambiente,
        serie_nfe: configForm.serie_nfe, serie_nfce: configForm.serie_nfce
      }).eq('id', config.id)
    } else {
      await supabase.from('config_fiscal').insert({
        estabelecimento_id: estabelecimentoId, cnpj: configForm.cnpj,
        razao_social: configForm.razao_social, regime_tributario: configForm.regime_tributario,
        ambiente: configForm.ambiente, serie_nfe: configForm.serie_nfe,
        serie_nfce: configForm.serie_nfce, ultimo_numero_nfe: 0,
        ultimo_numero_nfce: 0, ativo: true
      })
    }
    await fetchData(estabelecimentoId)
    setSavingConfig(false)
    setShowConfigForm(false)
  }

  const getStatusColor = (s: string) => s === 'autorizada' ? '#22c55e' : s === 'cancelada' ? '#ef4239' : s === 'denegada' ? '#f59e0b' : '#666'
  const getStatusLabel = (s: string) => s === 'autorizada' ? 'Autorizada' : s === 'cancelada' ? 'Cancelada' : s === 'denegada' ? 'Denegada' : 'Pendente'

  return (
    <div style={{ padding: '24px', fontFamily: 'Mulish, sans-serif', color: '#e6e6e6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Receipt size={22} color="#ef4239" />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Fiscal</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fetchData(estabelecimentoId)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => { setShowConfigForm(true); if (config) setConfigForm({ cnpj: config.cnpj, razao_social: config.razao_social, regime_tributario: config.regime_tributario, ambiente: config.ambiente, serie_nfe: config.serie_nfe, serie_nfce: config.serie_nfce }) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '13px' }}>
            <Settings size={14} /> Configurar
          </button>
        </div>
      </div>

      {/* Alerta sem config */}
      {!config && !loading && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b' }}>Configuracao Fiscal necessaria</div>
            <div style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>Configure seu CNPJ e parametros fiscais para emitir notas.</div>
          </div>
        </div>
      )}

      {/* Config badge */}
      {config && (
        <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <CheckCircle size={16} color="#22c55e" />
          <span style={{ fontSize: '13px', color: '#e6e6e6', fontWeight: 600 }}>{config.razao_social}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>CNPJ: {config.cnpj}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>{config.regime_tributario}</span>
          <span style={{ background: config.ambiente === 'producao' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: config.ambiente === 'producao' ? '#22c55e' : '#f59e0b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            {config.ambiente === 'producao' ? 'Producao' : 'Homologacao'}
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'NF-e Emitidas', value: nfe.length, icon: <FileText size={18} color="#ef4239" /> },
          { label: 'NFC-e Emitidas', value: nfce.length, icon: <Receipt size={18} color="#f59e0b" /> },
          { label: 'Autorizadas', value: autorizadas, icon: <CheckCircle size={18} color="#22c55e" /> },
          { label: 'Valor Total', value: 'R$ ' + valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), icon: <FileText size={18} color="#22c55e" /> },
        ].map((card, i) => (
          <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {card.icon}
              <span style={{ fontSize: '13px', color: '#999' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '20px', borderBottom: '1px solid #292929' }}>
        {[
          { id: 'nfe', label: 'NF-e (' + nfe.length + ')' },
          { id: 'nfce', label: 'NFC-e (' + nfce.length + ')' },
          { id: 'sat', label: 'SAT (' + sat.length + ')' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #ef4239' : '2px solid transparent', color: activeTab === tab.id ? '#ef4239' : '#999', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400, fontFamily: 'Mulish, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modal Config */}
      {showConfigForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '28px', width: '520px', maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Configuracao Fiscal</span>
              {config && <button onClick={() => setShowConfigForm(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}><X size={18} /></button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>CNPJ</label>
                <input value={configForm.cnpj} onChange={e => setConfigForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Regime Tributario</label>
                <select value={configForm.regime_tributario} onChange={e => setConfigForm(p => ({ ...p, regime_tributario: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }}>
                  <option value="simples">Simples Nacional</option>
                  <option value="presumido">Lucro Presumido</option>
                  <option value="real">Lucro Real</option>
                  <option value="mei">MEI</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Razao Social</label>
                <input value={configForm.razao_social} onChange={e => setConfigForm(p => ({ ...p, razao_social: e.target.value }))} placeholder="Nome completo da empresa"
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Serie NF-e</label>
                <input value={configForm.serie_nfe} onChange={e => setConfigForm(p => ({ ...p, serie_nfe: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '4px' }}>Serie NFC-e</label>
                <input value={configForm.serie_nfce} onChange={e => setConfigForm(p => ({ ...p, serie_nfce: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '14px', fontFamily: 'Mulish, sans-serif' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '8px' }}>Ambiente</label>
                <div style={{ display: 'flex', gap: 0, background: '#111', borderRadius: '8px', padding: '4px' }}>
                  {(['homologacao', 'producao'] as const).map(amb => (
                    <button key={amb} onClick={() => setConfigForm(p => ({ ...p, ambiente: amb }))}
                      style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Mulish, sans-serif',
                        background: configForm.ambiente === amb ? (amb === 'producao' ? '#22c55e' : '#f59e0b') : 'transparent',
                        color: configForm.ambiente === amb ? '#fff' : '#666' }}>
                      {amb === 'producao' ? 'Producao' : 'Homologacao (Teste)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              {config && <button onClick={() => setShowConfigForm(false)} style={{ padding: '8px 18px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e6e6e6', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>}
              <button onClick={handleSaveConfig} disabled={savingConfig}
                style={{ padding: '8px 18px', background: '#ef4239', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: savingConfig ? 0.7 : 1 }}>
                {savingConfig ? 'Salvando...' : 'Salvar Configuracao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={'Buscar ' + activeTab.toUpperCase() + ' por numero, cliente ou chave...'}
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }} />
        </div>
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '8px', padding: '8px 12px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
          <option value="todos">Todos os status</option>
          <option value="autorizada">Autorizada</option>
          <option value="cancelada">Cancelada</option>
          <option value="denegada">Denegada</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {/* Tabela Notas */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #292929' }}>
              {['Numero', 'Serie', 'Emissao', 'Cliente', 'Chave de Acesso', 'Valor', 'Status', 'Acoes'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#666', fontWeight: 600, fontFamily: 'Mulish, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando notas fiscais...</td></tr>
            ) : notasFiltradas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                {notas.filter(n => n.tipo === activeTab).length === 0
                  ? 'Nenhuma ' + activeTab.toUpperCase() + ' emitida ainda. As notas aparecerao aqui quando emitidas.'
                  : 'Nenhum resultado encontrado.'}
              </td></tr>
            ) : notasFiltradas.map(nota => (
              <tr key={nota.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>{nota.numero || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#999' }}>{nota.serie || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#999' }}>{nota.data_emissao ? new Date(nota.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#e6e6e6' }}>{nota.cliente_nome || 'Consumidor Final'}</td>
                <td style={{ padding: '12px 16px', fontSize: '11px', color: '#666', maxWidth: '160px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nota.chave_acesso || '-'}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#e6e6e6' }}>R$ {Number(nota.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: nota.status === 'autorizada' ? 'rgba(34,197,94,0.15)' : nota.status === 'cancelada' ? 'rgba(239,66,57,0.15)' : nota.status === 'denegada' ? 'rgba(245,158,11,0.15)' : 'rgba(102,102,102,0.15)', color: getStatusColor(nota.status), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                    {getStatusLabel(nota.status)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {nota.xml_url && (
                      <a href={nota.xml_url} target="_blank" rel="noreferrer"
                        style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#999', padding: '5px', display: 'flex', textDecoration: 'none' }}>
                        <Download size={13} />
                      </a>
                    )}
                    {nota.pdf_url && (
                      <a href={nota.pdf_url} target="_blank" rel="noreferrer"
                        style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', color: '#999', padding: '5px', display: 'flex', textDecoration: 'none' }}>
                        <Eye size={13} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FiscalPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#999', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <FiscalContent />
    </Suspense>
  )
}