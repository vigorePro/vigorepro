'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const NAV_GROUPS = [
  {
    items: [
      { label: 'Início', href: '/dashboard', icon: '🏠' },
      { label: 'Caixa', href: '/dashboard/caixa', icon: '🖥' },
      { label: 'Delivery', href: '/admin/delivery', icon: '🚲' },
      { label: 'Mesas/Comandas', href: '/dashboard/mesas', icon: '⊞' },
      { label: 'PDV', href: '/dashboard/pdv', icon: '🛒' },
      { label: 'KDS', href: '/admin/cozinha', icon: '🍳', external: true },
      { label: 'Histórico de Vendas', href: '/dashboard/historico', icon: '📊' },
    ]
  },
  {
    divider: true,
    items: [
      { label: 'Aplicativos', href: '/dashboard/aplicativos', icon: '📱' },
      { label: 'Pix Online', href: '/dashboard/pix', icon: '💳' },
      { label: 'WhatsApp', href: '/dashboard/whatsapp', icon: '💬' },
      { label: 'Desempenho', href: '/dashboard/desempenho', icon: '📈' },
    ]
  },
  {
    divider: true,
    items: [
      { label: 'Cardápio', href: '/dashboard/cardapio', icon: '📋' },
      { label: 'Cardápio Digital', href: '/dashboard/cardapio-digital', icon: '🌐' },
      { label: 'Estoque', href: '/dashboard/estoque', icon: '📦' },
    ]
  },
  {
    divider: true,
    items: [
      { label: 'Clientes', href: '/dashboard/clientes', icon: '👥' },
      { label: 'Fidelidade (CRM)', href: '/dashboard/fidelidade', icon: '⭐', badge: 'NOVO' },
      { label: 'Food Marketing', href: '/dashboard/marketing', icon: '📣', badge: 'NOVO' },
      { label: 'Fiado', href: '/dashboard/fiado', icon: '💰' },
    ]
  },
  {
    divider: true,
    items: [
      { label: 'Financeiro', href: '/dashboard/financeiro', icon: '💵' },
      { label: 'Fiscal', href: '/dashboard/fiscal', icon: '🧾' },
    ]
  },
  {
    divider: true,
    items: [
      { label: 'Cadastros', href: '/dashboard/cadastros', icon: '📂' },
      { label: 'Configuração', href: '/dashboard/configuracoes', icon: '⚙️' },
      { label: 'Novidades', href: '/dashboard/novidades', icon: '🎉' },
    ]
  }
]

const FOOTER_ITEMS = [
  { label: 'Sugestões', icon: '💡' },
  { label: 'Meus Links', icon: '🔗' },
  { label: 'Manual', icon: '📖' },
  { label: 'Suporte', icon: '🎧' },
]

function SlugReader({ children }: { children: (slug: string) => React.ReactNode }) {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  return <>{children(slug)}</>
}

function Sidebar({ slug }: { slug: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  return (
    <aside
      style={{
        position: 'fixed', left: 0, top: 0, height: '100vh', width: '200px',
        backgroundColor: '#1c1208', borderRight: '1px solid #2a1e10',
        display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto'
      }}
    >
      {/* Logo */}
      <div style={{ padding: '16px 12px', borderBottom: '1px solid #2a1e10', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#eb0029', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>
          VP
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            VigorePro
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slug || 'estabelecimento'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.divider && <div style={{ height: '1px', backgroundColor: '#2a1e10', margin: '6px 4px' }} />}
            {group.items.map(item => {
              const active = isActive(item.href)
              const href = item.href + (slug ? '?slug=' + slug : '')
              return (
                <Link
                  key={item.href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                    borderRadius: '6px', marginBottom: '1px', textDecoration: 'none',
                    backgroundColor: active ? '#eb002922' : 'transparent',
                    color: active ? '#eb0029' : '#c9b8a8',
                    fontSize: '12.5px', fontWeight: active ? '600' : '400',
                    borderLeft: active ? '2px solid #eb0029' : '2px solid transparent'
                  }}
                >
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                  {(item as any).badge && (
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', flexShrink: 0 }}>
                      {(item as any).badge}
                    </span>
                  )}
                  {(item as any).external && (
                    <span style={{ fontSize: '10px', color: '#6b7280', flexShrink: 0 }}>↗</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #2a1e10', padding: '8px' }}>
        {FOOTER_ITEMS.map(item => (
          <button
            key={item.label}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
              borderRadius: '6px', marginBottom: '1px', backgroundColor: 'transparent', border: 'none',
              color: '#9ca3af', fontSize: '12px', cursor: 'pointer', textAlign: 'left' as any
            }}
          >
            <span style={{ fontSize: '13px' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
            borderRadius: '6px', marginTop: '4px', backgroundColor: 'transparent', border: 'none',
            color: '#ef4444', fontSize: '12px', cursor: 'pointer', textAlign: 'left' as any
          }}
        >
          <span>🚪</span> Sair
        </button>
        <div style={{ padding: '4px 10px', fontSize: '10px', color: '#4b5563', textAlign: 'center' as any }}>
          v1.0.0
        </div>
      </div>
    </aside>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', backgroundColor: '#111111', minHeight: '100vh' }}>
        <div style={{ width: '200px', backgroundColor: '#1c1208', flexShrink: 0 }} />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    }>
      <SlugReader>
        {(slug) => (
          <div style={{ display: 'flex', backgroundColor: '#111111', minHeight: '100vh' }}>
            <Sidebar slug={slug} />
            <main style={{ flex: 1, marginLeft: '200px', minHeight: '100vh', overflow: 'auto' }}>
              {children}
            </main>
          </div>
        )}
      </SlugReader>
    </Suspense>
  )
}
