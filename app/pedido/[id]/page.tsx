'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Clock, Package, Truck, Star, MapPin, Phone, ChefHat, RefreshCw } from 'lucide-react'

const ETAPAS = [
  { status: 'pendente', label: 'Pedido Recebido', icon: CheckCircle, desc: 'Seu pedido foi recebido pelo restaurante' },
  { status: 'em_preparo', label: 'Em Preparo', icon: ChefHat, desc: 'A equipe está preparando seu pedido' },
  { status: 'pronto', label: 'Pronto', icon: Package, desc: 'Seu pedido está pronto' },
  { status: 'entregue', label: 'Entregue', icon: Star, desc: 'Pedido entregue com sucesso!' },
]

const STATUS_INDEX: Record<string, number> = { pendente: 0, em_preparo: 1, pronto: 2, entregue: 3 }

export default function PedidoRastreamento({ params }: { params: { id: string } }) {
  const [pedido, setPedido] = useState<any>(null)
  const [estab, setEstab] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  const fetchPedido = useCallback(async () => {
    const { data } = await supabase.from('pedidos').select('*').eq('id', params.id).single()
    if (data) {
      setPedido(data)
      const { data: e } = await supabase.from('estabelecimentos').select('nome,logo_url,telefone,cor_primaria').eq('id', data.estabelecimento_id).single()
      if (e) setEstab(e)
    }
    setCarregando(false)
  }, [params.id])

  useEffect(() => { fetchPedido(); const i = setInterval(fetchPedido, 20000); return () => clearInterval(i) }, [fetchPedido])

  if (carregando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Mulish, sans-serif' }}>
      <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#ef4239' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!pedido) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Mulish, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>❓</p>
        <h2 style={{ margin: '0 0 8px' }}>Pedido não encontrado</h2>
        <p>Verifique o link enviado pelo restaurante</p>
      </div>
    </div>
  )

  const cor = estab?.cor_primaria || '#ef4239'
  const etapaAtual = STATUS_INDEX[pedido.status] ?? 0
  const itens = Array.isArray(pedido.itens) ? pedido.itens : []
  const cancelado = pedido.status === 'cancelado'

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: cor, color: '#fff', padding: '20px 16px', textAlign: 'center' }}>
        {estab?.logo_url && <img src={estab.logo_url} alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', marginBottom: 10, border: '3px solid rgba(255,255,255,0.3)' }} />}
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{estab?.nome || 'Restaurante'}</h1>
        <p style={{ margin: 0, fontSize: 15, opacity: 0.85 }}>Pedido #{pedido.numero || params.id.substring(0, 8)}</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {/* Status cancelado */}
        {cancelado && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 24 }}>❌</p>
            <h2 style={{ margin: '0 0 6px', color: '#dc2626', fontSize: 18, fontWeight: 700 }}>Pedido Cancelado</h2>
            <p style={{ margin: 0, color: '#ef4444', fontSize: 14 }}>Entre em contato com o restaurante para mais informações</p>
          </div>
        )}

        {/* Timeline de status */}
        {!cancelado && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 17, fontWeight: 700, color: '#111' }}>Acompanhe seu pedido</h2>
            <div style={{ position: 'relative' }}>
              {ETAPAS.map((etapa, idx) => {
                const concluido = idx <= etapaAtual
                const atual = idx === etapaAtual
                const Icon = etapa.icon
                return (
                  <div key={idx} style={{ display: 'flex', gap: 16, marginBottom: idx < ETAPAS.length - 1 ? 28 : 0, position: 'relative' }}>
                    {/* Linha vertical */}
                    {idx < ETAPAS.length - 1 && (
                      <div style={{ position: 'absolute', left: 20, top: 44, width: 2, height: 24, background: concluido && idx < etapaAtual ? cor : '#e0e0e0' }} />
                    )}
                    {/* Ícone */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: concluido ? cor : '#f0f0f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: atual ? '0 0 0 4px ' + cor + '33' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      <Icon size={20} color={concluido ? '#fff' : '#aaa'} />
                    </div>
                    {/* Texto */}
                    <div style={{ flex: 1, paddingTop: 8 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: atual ? 700 : 600, fontSize: 15, color: concluido ? '#111' : '#aaa' }}>{etapa.label}</p>
                      {atual && <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{etapa.desc}</p>}
                    </div>
                    {/* Check atual */}
                    {atual && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: cor + '11', padding: '3px 10px', borderRadius: 10 }}>AGORA</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Itens do pedido */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111' }}>Itens do pedido</h2>
          {itens.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx < itens.length - 1 ? 12 : 0, paddingBottom: idx < itens.length - 1 ? 12 : 0, borderBottom: idx < itens.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: cor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{item.quantidade || 1}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{item.nome}</p>
                  {item.observacao && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#f59e0b', fontStyle: 'italic' }}>⚠ {item.observacao}</p>}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>R$ {((item.preco || 0) * (item.quantidade || 1)).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #f0f0f0', marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: cor }}>R$ {(pedido.total || 0).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Info entrega */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#111' }}>Detalhes</h2>
          {[
            { icon: <Package size={16} color="#888" />, label: 'Tipo', valor: pedido.tipo || 'Balcão' },
            pedido.endereco && { icon: <MapPin size={16} color="#888" />, label: 'Endereço', valor: pedido.endereco },
            { icon: <Star size={16} color="#888" />, label: 'Pagamento', valor: pedido.forma_pagamento || '—' },
          ].filter(Boolean).map((row: any, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {row.icon}
              <span style={{ fontSize: 13, color: '#888', minWidth: 80 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#333', textTransform: 'capitalize' }}>{row.valor}</span>
            </div>
          ))}
        </div>

        {/* Contato restaurante */}
        {estab?.telefone && (
          <a href={`tel:${estab.telefone}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: cor, color: '#fff', padding: '14px 0', borderRadius: 12, textDecoration: 'none',
            fontWeight: 700, fontSize: 15
          }}>
            <Phone size={18} /> Falar com o restaurante
          </a>
        )}

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 20 }}>Atualizado automaticamente a cada 20s</p>
      </div>
    </div>
  )
}
