'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Estabelecimento, Categoria, Produto } from '@/lib/supabase'

type CarrinhoItem = Produto & { quantidade: number }

export default function Cardapio() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (slug) carregarDados()
  }, [slug])

  async function carregarDados() {
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!est) { setCarregando(false); return }
    setEstabelecimento(est)

    const { data: cats } = await supabase
      .from('categorias')
