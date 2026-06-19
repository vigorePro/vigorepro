'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreditCard, QrCode, Copy, Check, TrendingUp, Clock, ArrowDownLeft, RefreshCw, Eye, EyeOff } from 'lucide-react'

const TRANSACOES = [
  { id: 1, tipo: 'recebido', valor: 89.00, de: 'João Silva', chave: '(11) 99999-1111', hora: '20:45', status: 'concluido', pedido: '#1042' },
  { id: 2, tipo: 'recebido', valor: 156.50, de: 'Maria Santos', chave: 'maria@email.com', hora: '20:30', status: 'concluido', pedido: '#1041' },
  { id: 3, tipo: 'recebido', valor: 45.00, de: 'Pedro Costa', chave: '123.456.789-00', hora: '20:00', status: 'pendente', pedido: '#1040' },
  { id: 4, tipo: 'recebido', valor: 212.00, de: 'Ana Lima', chave: '(11) 98888-2222', hora: '19:30', status: 'concluido', pedido: '#1039' },
  { id: 5, tipo: 'recebido', valor: 67.90, de: 'Carlos Mendes', chave: 'carlos@email.com', hora: '19:00', status: 'concluido', pedido: '#1038' },
]

function PixContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [copiado, setCopiado] = useState(false)
  const [verSaldo, setVerSaldo] = useState(true)
  const chavePix = 'financeiro@dolcedolce.com.br'
  const saldo = 4521.75

  const copiar = () => {
    navigator.clipboard.writeText(chavePix)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const statusColor = (s: string) => s === 'concluido' ? '#22c55e' : '#f59e0b'
  const statusLabel = (s: string) => s === 'concluido' ? 'Concluído' : 'Pendente'

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <CreditCard size={26} color='#ef4239' />
        <div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Pix Online</h1>
          <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Recebimentos e chave Pix do estabelecimento</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Saldo */}
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '24px', borderTop: '2px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#888', fontSize: '13px' }}>Saldo Disponível</span>
            <button onClick={() => setVerSaldo(!verSaldo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
              {verSaldo ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <div style={{ color: '#22c55e', fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
            {verSaldo ? `R$ ${saldo.toFixed(2).replace('.', ',')}` : 'R$ ••••••'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ label: 'Hoje', val: 'R$ 570,40' }, { label: '7 dias', val: 'R$ 2.840,00' }].map(s => (
              <div key={s.label} style={{ flex: 1, backgroundColor: '#111', borderRadius: '8px', padding: '8px 12px', border: '1px solid #292929' }}>
                <div style={{ color: '#555', fontSize: '11px' }}>{s.label}</div>
                <div style={{ color: '#e6e6e6', fontSize: '14px', fontWeight: 600 }}>{verSaldo ? s.val : '••••'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chave Pix + QR */}
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <QrCode size={16} color='#ef4239' />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Minha Chave Pix</span>
          </div>
          <div style={{ backgroundColor: '#111', border: '1px solid #292929', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>Chave (E-mail)</div>
            <div style={{ color: '#ef4239', fontSize: '14px', fontWeight: 500 }}>{chavePix}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={copiar} style={{
              flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #292929',
              backgroundColor: copiado ? '#22c55e20' : '#111', color: copiado ? '#22c55e' : '#e6e6e6',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', fontSize: '13px', fontFamily: 'Mulish, sans-serif'
            }}>
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado!' : 'Copiar Chave'}
            </button>
            <button style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #292929', backgroundColor: '#111', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }}>
              <QrCode size={14} /> QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Recebido Hoje', value: 'R$ 570,40', color: '#22c55e', icon: ArrowDownLeft },
          { label: 'Transações Hoje', value: '8', color: '#6366f1', icon: TrendingUp },
          { label: 'Pendentes', value: '1', color: '#f59e0b', icon: Clock },
          { label: 'Taxa Média', value: 'R$ 0,00', color: '#888', icon: CreditCard },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{ flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', padding: '14px 16px', borderTop: `2px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#888', fontSize: '12px' }}>{s.label}</span>
                <Icon size={14} color={s.color} />
              </div>
              <div style={{ color: s.color, fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      {/* Extrato */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Extrato de Recebimentos</span>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #292929', backgroundColor: '#111', color: '#888', cursor: 'pointer', fontSize: '12px', fontFamily: 'Mulish, sans-serif' }}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
        {TRANSACOES.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: i < TRANSACOES.length-1 ? '1px solid #222' : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowDownLeft size={16} color='#22c55e' />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#e6e6e6', fontSize: '14px', fontWeight: 500 }}>{t.de}</span>
                <span style={{ color: '#22c55e', fontSize: '15px', fontWeight: 700 }}>+R$ {t.valor.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: '12px' }}>{t.chave} · {t.pedido}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#555', fontSize: '11px' }}>{t.hora}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, backgroundColor: statusColor(t.status) + '20', color: statusColor(t.status) }}>{statusLabel(t.status)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PixPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <PixContent />
    </Suspense>
  )
}
