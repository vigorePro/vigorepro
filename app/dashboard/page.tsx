'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Pedido, Estabelecimento } from '@/lib/supabase'

const STATUS_LABELS: Record<string, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Novo', cor: '#EF4444', bg: '#FEF2F2' },
  confirmado: { label: 'Confirmado', cor: '#F59E0B', bg: '#FFFBEB' },
  em_preparo: { label: 'Em Preparo', cor: '#3B82F6', bg: '#EFF6FF' },
  pronto: { label: 'Pronto', cor: '#10B981', bg: '#F0FDF4' },
  entregue: { label: 'Entregue', cor: '#6B7280', bg: '#F9FAFB' },
  cancelado: { label: 'Cancelado', cor: '#EF4444', bg: '#FEF2F2' },
}

export default function Dashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'producao' | 'entrega' | 'historico'>('producao')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (slug) iniciar()
    else verificarAuth()
  }, [slug])

  async function verificarAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin'); return }
    // load establishment from user metadata or first establishment
  }
