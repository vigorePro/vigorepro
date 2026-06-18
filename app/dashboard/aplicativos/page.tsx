'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Smartphone, ExternalLink, Check, AlertCircle, Clock, Zap, Link2, Settings } from 'lucide-react'

type App = {
  id: string
  nome: string
  descricao: string
  categoria: string
  conectado: boolean
  status: 'ativo' | 'inativo' | 'pendente'
  logo: string
  cor: string
  url?: string
}

const APPS: App[] = [
  {
    id: 'ifood', nome: 'iFood', descricao: 'Integração com pedidos do iFood automaticamente no sistema',
    categoria: 'Delivery', conectado: false, status: 'inativo', logo: 'iF', cor: '#ea1d2c', url: 'https://portal.ifood.com.br'
  },
  {
    id: 'rappi', nome: 'Rappi', descricao: 'Sincronize pedidos da Rappi em tempo real',
    categoria: 'Delivery', conectado: false, status: 'inativo', logo: 'Ra', cor: '#ff441f', url: 'https://merchants.rappi.com'
  },
  {
    id: 'whatsapp', nome: 'WhatsApp Business', descricao: 'Receba pedidos e notifique clientes via WhatsApp',
    categoria: 'Comunicação', conectado: true, status: 'ativo', logo: 'WA', cor: '#25d366'
  },
  {
    id: 'mercadopago', nome: 'Mercado Pago', descricao: 'Processe pagamentos via Pix e cartão com taxa zero',
    categoria: 'Pagamento', conectado: true, status: 'ativo', logo: 'MP', cor: '#009ee3'
  },
  {
    id: 'google', nome: 'Google Meu Negócio', descricao: 'Sincronize horários e cardápio com o Google',
    categoria: 'Marketing', conectado: false, status: 'pendente', logo: 'G', cor: '#4285f4'
  },
  {
    id: 'instagram', nome: 'Instagram Shopping', descricao: 'Venda pelo Instagram direto no seu cardápio',
    categoria: 'Marketing', conectado: false, status: 'inativo', logo: 'In', cor: '#e1306c'
  },
  {
    id: 'uber', nome: 'Uber Eats', descricao: 'Integração com pedidos do Uber Eats',
    categoria: 'Delivery', conectado: false, status: 'inativo', logo: 'UE', cor: '#06c167'
  },
  {
    id: 'pagarme', nome: 'Pagar.me', descricao: 'Gateway de pagamentos online completo',
    categoria: 'Pagamento', conectado: false, status: 'inativo', logo: 'Pg', cor: '#65d234'
  },
]

const CATEGORIAS = ['Todos', 'Delivery', 'Pagamento', 'Comunicação', 'Marketing']

function AplicativosContent() {
  const searchParams = useSearchParams()
  const [apps, setApps] = useState<App[]>(APPS)
  const [catFiltro, setCatFiltro] = useState('Todos')

  const filtrados = catFiltro === 'Todos' ? apps : apps.filter(a => a.categoria === catFiltro)
  const conectados = apps.filter(a => a.conectado).length

  const toggleApp = (id: string) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, conectado: !a.conectado, status: !a.conectado ? 'ativo' : 'inativo' } : a))
  }

  const statusInfo = (status: App['status']) => {
    if (status === 'ativo') return { cor: '#22c55e', label: 'Ativo', icon: Check }
    if (status === 'pendente') return { cor: '#f59e0b', label: 'Pendente', icon: Clock }
    return { cor: '#444', label: 'Inativo', icon: AlertCircle }
  }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Smartphone size={26} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Aplicativos</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Integrações e conectores do seu negócio</p>
          </div>
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: '8px', backgroundColor: '#1a1a1a',
          border: '1px solid #292929', color: '#e6e6e6', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Zap size={14} color='#22c55e' />
          <span>{conectados} de {apps.length} conectados</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Conectados', value: conectados, color: '#22c55e' },
          { label: 'Pendentes', value: apps.filter(a => a.status === 'pendente').length, color: '#f59e0b' },
          { label: 'Disponíveis', value: apps.filter(a => !a.conectado).length, color: '#6b7280' },
          { label: 'Total', value: apps.length, color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '14px 16px', borderTop: `2px solid ${s.color}` }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: '26px', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros de categoria */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {CATEGORIAS.map(cat => (
          <button key={cat} onClick={() => setCatFiltro(cat)} style={{
            padding: '6px 14px', borderRadius: '999px', border: '1px solid',
            borderColor: catFiltro === cat ? '#ef4239' : '#292929',
            backgroundColor: catFiltro === cat ? '#ef423920' : 'transparent',
            color: catFiltro === cat ? '#ef4239' : '#888',
            fontSize: '13px', fontWeight: catFiltro === cat ? 600 : 400,
            cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
          }}>{cat}</button>
        ))}
      </div>

      {/* Grid de apps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filtrados.map(app => {
          const info = statusInfo(app.status)
          const StatusIcon = info.icon
          return (
            <div key={app.id} style={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${app.conectado ? '#ef423940' : '#292929'}`,
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '16px',
              transition: 'border-color 0.2s',
            }}>
              {/* App header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: app.cor + '20', border: `1px solid ${app.cor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: app.cor, fontWeight: 700, fontSize: '14px', flexShrink: 0
                  }}>
                    {app.logo}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{app.nome}</div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', borderRadius: '999px', fontSize: '11px',
                      backgroundColor: info.cor + '20', color: info.cor
                    }}>
                      <StatusIcon size={10} />
                      {info.label}
                    </span>
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '11px',
                  backgroundColor: '#222', color: '#888'
                }}>{app.categoria}</span>
              </div>

              {/* Descricao */}
              <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{app.descricao}</p>

              {/* Acoes */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button onClick={() => toggleApp(app.id)} style={{
                  flex: 1, padding: '9px 0', borderRadius: '8px', border: 'none',
                  backgroundColor: app.conectado ? '#ef423920' : '#ef4239',
                  color: app.conectado ? '#ef4239' : '#fff',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  fontFamily: 'Mulish, sans-serif',
                  border: app.conectado ? '1px solid #ef4239' : 'none',
                } as React.CSSProperties}>
                  {app.conectado ? 'Desconectar' : 'Conectar'}
                </button>
                {app.url && (
                  <a href={app.url} target='_blank' rel='noopener noreferrer' style={{
                    padding: '9px 14px', borderRadius: '8px',
                    border: '1px solid #292929', backgroundColor: '#111',
                    color: '#888', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '13px', textDecoration: 'none'
                  }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AplicativosPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <AplicativosContent />
    </Suspense>
  )
}
