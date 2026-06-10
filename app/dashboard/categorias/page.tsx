'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Categoria } from '@/lib/supabase'

type UploadType = 'desktop' | 'mobile'

function CategoriasContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [desktopUrl, setDesktopUrl] = useState('')
  const [mobileUrl, setMobileUrl] = useState('')
  const [uploading, setUploading] = useState<UploadType | null>(null)
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
    setDesktopUrl(cat.banner_desktop_url || cat.banner_url || '')
    setMobileUrl(cat.banner_mobile_url || cat.banner_url || '')
    setMensagem('')
  }

  function cancelarEdicao() {
    setEditando(null)
    setDesktopUrl('')
    setMobileUrl('')
    setMensagem('')
  }

  async function uploadImagem(file: File, tipo: UploadType, catId: string) {
    setUploading(tipo)
    setMensagem('')
    const ext = file.name.split('.').pop() || 'jpg'
    const path = slug + '/' + catId + '-' + tipo + '-' + Date.now() + '.' + ext
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      setMensagem('Erro no upload: ' + error.message)
      setUploading(null)
      return
    }
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
    if (tipo === 'desktop') {
      setDesktopUrl(urlData.publicUrl)
    } else {
      setMobileUrl(urlData.publicUrl)
    }
    setUploading(null)
  }

  async function salvarBanners(catId: string) {
    setSalvando(true)
    setMensagem('')
    const { error } = await supabase
      .from('categorias')
      .update({
        banner_desktop_url: desktopUrl || null,
        banner_mobile_url: mobileUrl || null,
        banner_url: desktopUrl || mobileUrl || null,
      })
      .eq('id', catId)
    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
    } else {
      setMensagem('Banners salvos com sucesso!')
      setEditando(null)
      buscarCategorias()
    }
    setSalvando(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-3xl mx-auto">
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
                  Editar Banners
                </button>
              )}
            </div>

            {editando !== cat.id && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Desktop (1200x300px)</p>
                  {cat.banner_desktop_url ? (
                    <img src={cat.banner_desktop_url} alt="Desktop" className="w-full h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs">Sem banner desktop</div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Mobile (600x300px)</p>
                  {cat.banner_mobile_url ? (
                    <img src={cat.banner_mobile_url} alt="Mobile" className="w-full h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs">Sem banner mobile</div>
                  )}
                </div>
              </div>
            )}

            {editando === cat.id && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                    <p className="text-sm font-semibold text-yellow-400 mb-1">Desktop</p>
                    <p className="text-xs text-gray-400 mb-2">Tamanho recomendado: 1200 x 300 px</p>
                    <label className="block w-full cursor-pointer">
                      <div className={'w-full py-3 px-4 rounded-lg border-2 border-dashed text-center text-sm transition-colors ' + (uploading === 'desktop' ? 'border-yellow-500 text-yellow-400' : 'border-gray-500 text-gray-400 hover:border-yellow-500 hover:text-yellow-400')}>
                        {uploading === 'desktop' ? 'Enviando...' : 'Clique para enviar imagem'}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={e => { if (e.target.files?.[0]) uploadImagem(e.target.files[0], 'desktop', cat.id) }}
                      />
                    </label>
                    {desktopUrl && (
                      <div className="mt-2">
                        <img src={desktopUrl} alt="Preview desktop" className="w-full h-24 object-cover rounded-lg" />
                        <button onClick={() => setDesktopUrl('')} className="mt-1 text-xs text-red-400 hover:text-red-300">Remover</button>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                    <p className="text-sm font-semibold text-blue-400 mb-1">Mobile</p>
                    <p className="text-xs text-gray-400 mb-2">Tamanho recomendado: 600 x 300 px</p>
                    <label className="block w-full cursor-pointer">
                      <div className={'w-full py-3 px-4 rounded-lg border-2 border-dashed text-center text-sm transition-colors ' + (uploading === 'mobile' ? 'border-blue-500 text-blue-400' : 'border-gray-500 text-gray-400 hover:border-blue-500 hover:text-blue-400')}>
                        {uploading === 'mobile' ? 'Enviando...' : 'Clique para enviar imagem'}
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={e => { if (e.target.files?.[0]) uploadImagem(e.target.files[0], 'mobile', cat.id) }}
                      />
                    </label>
                    {mobileUrl && (
                      <div className="mt-2">
                        <img src={mobileUrl} alt="Preview mobile" className="w-full h-24 object-cover rounded-lg" />
                        <button onClick={() => setMobileUrl('')} className="mt-1 text-xs text-red-400 hover:text-red-300">Remover</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => salvarBanners(cat.id)}
                    disabled={salvando || uploading !== null}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Banners'}
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
