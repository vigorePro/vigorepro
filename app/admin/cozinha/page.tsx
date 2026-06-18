'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ChefHat, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type KDSOrder = {
  id: string
  numero: number
  status: 'pendente' | 'em_preparo' | 'pronto'
  itens: { nome: string; quantidade: number; obs?: string }[]
  criado_em: string
  tipo: 'delivery' | 'mesa' | 'balcao'
  mesa?: string
}

function getElapsed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function TimerBadge({ createdAt, status }: { createdAt: string; status: string }) {
  const [elapsed, setElapsed] = useState(getElapsed(createdAt))

  useEffect(() => {
    if (status === 'pronto') return
    const interval = setInterval(() => {
      setElapsed(getElapsed(createdAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt, status])

  const isAlert = elapsed > 600 // 10 minutos
  const isWarning = elapsed > 300 // 5 minutos

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '999px',
      backgroundColor: isAlert ? '#3d1515' : isWarning ? '#2d2000' : '#1a1a1a',
      color: isAlert ? '#ef4239' : isWarning ? '#f59e0b' : '#888',
    }}>
      {isAlert ? <AlertTriangle size={12} /> : <Clock size={12} />}
      {formatTime(elapsed)}
    </span>
  )
}

function OrderCard({ order, onUpdateStatus }: { order: KDSOrder; onUpdateStatus: (id: string, status: KDSOrder['status']) => void }) {
  const typeColors: Record<string, string> = {
    delivery: '#3b82f6',
    mesa: '#8b5cf6',
    balcao: '#f59e0b'
  }

  const typeLabels: Record<string, string> = {
    delivery: 'Delivery',
    mesa: `Mesa ${order.mesa || ''}`,
    balcao: 'Balcão'
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      border: '1px solid #292929',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      borderTop: `3px solid ${typeColors[order.tipo] || '#444'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>#{order.numero}</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: `${typeColors[order.tipo]}22`,
              color: typeColors[order.tipo],
              border: `1px solid ${typeColors[order.tipo]}44`
            }}>
              {typeLabels[order.tipo]}
            </span>
          </div>
        </div>
        {order.status !== 'pronto' && <TimerBadge createdAt={order.criado_em} status={order.status} />}
        {order.status === 'pronto' && (
          <span style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Pronto
          </span>
        )}
      </div>

      <div style={{ borderTop: '1px solid #292929', paddingTop: '12px', marginBottom: '12px' }}>
        {order.itens.map((item, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
              <span style={{
                backgroundColor: '#ef423920',
                color: '#ef4239',
                fontWeight: 700,
                fontSize: '13px',
                padding: '0 6px',
                borderRadius: '4px',
                flexShrink: 0
              }}>
                {item.quantidade}x
              </span>
              <span style={{ color: '#e6e6e6', fontSize: '14px', fontWeight: 500 }}>{item.nome}</span>
            </div>
            {item.obs && (
              <div style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '32px', marginTop: '2px' }}>
                ⚠ {item.obs}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {order.status === 'pendente' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'em_preparo')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4239',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif'
            }}
          >
            Iniciar Preparo
          </button>
        )}
        {order.status === 'em_preparo' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'pronto')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#22c55e',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif'
            }}
          >
            Marcar como Pronto
          </button>
        )}
      </div>
    </div>
  )
}

export default function CozinhaPage() {
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const loadOrders = useCallback(async () => {
    // Dados de demonstração para o KDS
    const mockOrders: KDSOrder[] = [
      {
        id: '1',
        numero: 1042,
        status: 'pendente',
        tipo: 'delivery',
        criado_em: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        itens: [
          { nome: 'X-Burguer Especial', quantidade: 2 },
          { nome: 'Fritas Grande', quantidade: 2, obs: 'Sem sal' },
          { nome: 'Coca-Cola 600ml', quantidade: 1 }
        ]
      },
      {
        id: '2',
        numero: 1041,
        status: 'em_preparo',
        tipo: 'mesa',
        mesa: '5',
        criado_em: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        itens: [
          { nome: 'Pizza Margherita', quantidade: 1, obs: 'Borda recheada' },
          { nome: 'Suco de Laranja', quantidade: 2 }
        ]
      },
      {
        id: '3',
        numero: 1040,
        status: 'pronto',
        tipo: 'balcao',
        criado_em: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        itens: [
          { nome: 'Coxinha', quantidade: 4 },
          { nome: 'Café Expresso', quantidade: 1 }
        ]
      }
    ]
    setOrders(mockOrders)
    setLoading(false)
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [loadOrders])

  const updateStatus = async (id: string, newStatus: KDSOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
  }

  const pendente = orders.filter(o => o.status === 'pendente')
  const em_preparo = orders.filter(o => o.status === 'em_preparo')
  const pronto = orders.filter(o => o.status === 'pronto')

  const columnStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const
  }

  const columnHeaderStyle = (color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: `2px solid ${color}`,
    marginBottom: '16px'
  })

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#111',
        color: '#888',
        fontFamily: 'Mulish, sans-serif'
      }}>
        <RefreshCw size={24} style={{ marginRight: '12px', animation: 'spin 1s linear infinite' }} />
        Carregando pedidos...
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#111',
      minHeight: '100vh',
      fontFamily: 'Mulish, sans-serif',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChefHat size={28} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0 }}>
              KDS — Cozinha
            </h1>
            <p style={{ color: '#888', fontSize: '13px', margin: '2px 0 0' }}>
              Kitchen Display System
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </span>
          <button
            onClick={loadOrders}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #292929',
              backgroundColor: '#1a1a1a',
              color: '#e6e6e6',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Mulish, sans-serif'
            }}
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Aguardando', count: pendente.length, color: '#ef4239' },
          { label: 'Em Preparo', count: em_preparo.length, color: '#f59e0b' },
          { label: 'Prontos', count: pronto.length, color: '#22c55e' },
          { label: 'Total Hoje', count: orders.length, color: '#6b7280' }
        ].map(stat => (
          <div key={stat.label} style={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            border: '1px solid #292929',
            borderRadius: '10px',
            padding: '14px 16px',
            borderTop: `2px solid ${stat.color}`
          }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: '28px', fontWeight: 700 }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Pendentes */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle('#ef4239')}>
            <AlertTriangle size={16} color='#ef4239' />
            <span style={{ color: '#ef4239', fontWeight: 700, fontSize: '14px' }}>
              Aguardando ({pendente.length})
            </span>
          </div>
          {pendente.length === 0 ? (
            <div style={{ color: '#444', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Nenhum pedido aguardando
            </div>
          ) : (
            pendente.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />)
          )}
        </div>

        {/* Em Preparo */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle('#f59e0b')}>
            <ChefHat size={16} color='#f59e0b' />
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '14px' }}>
              Em Preparo ({em_preparo.length})
            </span>
          </div>
          {em_preparo.length === 0 ? (
            <div style={{ color: '#444', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Nenhum pedido em preparo
            </div>
          ) : (
            em_preparo.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />)
          )}
        </div>

        {/* Prontos */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle('#22c55e')}>
            <CheckCircle2 size={16} color='#22c55e' />
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px' }}>
              Prontos ({pronto.length})
            </span>
          </div>
          {pronto.length === 0 ? (
            <div style={{ color: '#444', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Nenhum pedido pronto
            </div>
          ) : (
            pronto.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />)
          )}
        </div>
      </div>
    </div>
  )
}
