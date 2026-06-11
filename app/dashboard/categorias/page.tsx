'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const TOTAL_BANNERS = 7

function BannersCarrosselContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [banners, setBanners] = useState<(string | null)[]>(Array(TOTAL_BANNERS).fill(null))
  const [uploading, setUploading] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (slug) carregarBanners()
  }, [slug])

  async function carregarBanners() {
    const urls: (string | null)[] = []
    for (let n = 1; n <= TOTAL_BANNERS; n++) {
      const path = slug + '/promo-banner-' + n + '.jpg'
      const { data } = supabase.storage.from('banners').getPublicUrl(path)
      // Try to verify the file exists
      const res = await fetch(data.publicUrl, { method: 'HEAD' })
      urls.push(res.ok ? data.publicUrl + '?t=' + Date.now() : null)
    }
    setBanners(urls)
  }

  async function uploadBanner(file: File, slot: number) {
    setUploading(slot)
    setMensagem('')
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = slug + '/promo-banner-' + slot + '.jpg'
    // Convert to jpg name regardless of extension
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      setMensagem('Erro no upload: ' + error.message)
      setUploading(null)
      return
    }
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
    const newBanners = [...banners]
    newBanners[slot - 1] = urlData.publicUrl + '?t=' + Date.now()
    setBanners(newBanners)
    setMensagem('Banner ' + slot + ' salvo com sucesso!')
    setUploading(null)
  }

  async function removerBanner(slot: number) {
    setUploading(slot)
    setMensagem('')
    const path = slug + '/promo-banner-' + slot + '.jpg'
    await supabase.storage.from('banners').remove([path])
    const newBanners = [...banners]
    newBanners[slot - 1] = null
    setBanners(newBanners)
    setMensagem('Banner ' + slot + ' removido.')
    setUploading(null)
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
        <h1 className="text-xl font-bold">Carrossel de Banners</h1>
        <span className="text-gray-400 text-sm ml-auto">{TOTAL_BANNERS} slots</span>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Faça upload de até {TOTAL_BANNERS} banners promocionais. Eles aparecem em carrossel automático no cardápio.
        Tamanho recomendado: <strong className="text-yellow-400">1200 x 400px</strong>
      </p>

      {mensagem && (
        <div className={'mb-4 p-3 rounded-lg text-sm ' + (mensagem.startsWith('Erro') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200')}>
          {mensagem}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {Array.from({ length: TOTAL_BANNERS }, (_, i) => i + 1).map(slot => (
          <div key={slot} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg text-yellow-400">Banner {slot}</h2>
              {banners[slot - 1] && uploading !== slot && (
                <button
                  onClick={() => removerBanner(slot)}
                  className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Remover
                </button>
              )}
            </div>

            {banners[slot - 1] ? (
              <div className="mb-3">
                <img
                  src={banners[slot - 1]!}
                  alt={'Banner ' + slot}
                  className="w-full h-28 object-cover rounded-lg border border-gray-600"
                />
              </div>
            ) : (
              <div className="w-full h-28 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-sm mb-3 border-2 border-dashed border-gray-600">
                Sem banner
              </div>
            )}

            <label className="block w-full cursor-pointer">
              <div className={
                'w-full py-3 px-4 rounded-lg border-2 border-dashed text-center text-sm transition-colors ' +
                (uploading === slot
                  ? 'border-yellow-500 text-yellow-400 cursor-wait'
                  : 'border-gray-500 text-gray-400 hover:border-yellow-500 hover:text-yellow-400')
              }>
                {uploading === slot ? 'Enviando...' : (banners[slot - 1] ? 'Trocar imagem' : 'Clique para enviar imagem')}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading !== null}
                onChange={e => { if (e.target.files?.[0]) uploadBanner(e.target.files[0], slot) }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BannersCarrossel() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <BannersCarrosselContent />
    </Suspense>
  )
}
