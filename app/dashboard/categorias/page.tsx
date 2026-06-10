'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Categoria } from '@/lib/supabase'

function CategoriasContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (!slug) return
    buscarCategorias()
  }, [slug])

  async function buscarCategorias() {
    const { data: est } = await supabase
      .from('estabelecimentos')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!est) return
    const { data: cats } = await supabase
      .from('categorias')
      .select('*')
      .eq('estabelecimento_id', est.id)
      .order('ordem')
    if (cats) setCategorias(cats as Categoria[])
  }

  function iniciarEdicao(cat: Categoria) {
    setEditando(cat.id)
    setBannerUrl(cat.banner_url || '')
    setMensagem('')
  }

  function cancelarEdicao() {
    setEditando(null)
    setBannerUrl('')
    setMensagem('')
  }

  async function salvarBanner(catId: string) {
    setSalvando(true)
    setMensagem('')
    const { error } = await supabase
      .from('categorias')
      .update({ banner_url: bannerUrl || null })
      .eq('id', catId)
    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      setMensagem('Banner salvo!')
      setEditando(null)
      buscarCategorias()
    }
    setSalvando(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={slug ? '/dashboard?slug=' + slug : '/dashboard'}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-white text-sm font-bold"
        >
          {'<'}
        </Link>
        <h1 className="text-xl font-bold">Banners das Categorias</h1>
      </div>

      {mensagem && (
        <div className={'mb-4 p-3 rounded-lg text-sm ' + (mensagem.startsWith('Erro') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200')}>
          {mensagem}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {categorias.map(cat => (
          <div key={cat.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">{cat.nome}</h2>
              {editando !== cat.id && (
                <button
                  onClick={() => iniciarEdicao(cat)}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-bold rounded-lg transition-colors"
                >
                  Editar Banner
                </button>
              )}
            </div>

            {cat.banner_url && editando !== cat.id && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img src={cat.banner_url} alt={'Banner ' + cat.nome} className="w-full h-32 object-cover" />
              </div>
            )}

            {!cat.banner_url && editando !== cat.id && (
              <p className="text-gray-500 text-sm">Sem banner</p>
            )}

            {editando === cat.id && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">URL da imagem do banner</label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={e => setBannerUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cole a URL de uma imagem. Deixe vazio para remover o banner.</p>
                </div>
                {bannerUrl && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={bannerUrl} alt="Preview" className="w-full h-32 object-cover" onError={() => setMensagem('URL de imagem invalida')} />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => salvarBanner(cat.id)}
                    disabled={salvando}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={cancelarEdicao}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CategoriasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Carregando...</div>}>
      <CategoriasContent />
    </Suspense>
  )
}
