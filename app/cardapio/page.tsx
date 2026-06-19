'use client'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function CardapioRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const slug = searchParams.get('slug') ||
      (typeof window !== 'undefined'
        ? window.location.hostname.replace('.vigorepro.com.br', '')
        : '')
    if (slug) {
      router.replace('/cardapio/' + slug)
    } else {
      router.replace('/')
    }
  }, [searchParams, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mulish, sans-serif' }}>
      <p style={{ color: '#888' }}>Redirecionando...</p>
    </div>
  )
}

export default function CardapioPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Carregando...</p></div>}>
      <CardapioRedirect />
    </Suspense>
  )
}
