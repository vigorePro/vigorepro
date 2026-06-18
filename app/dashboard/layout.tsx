'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  Home, ShoppingBag, Truck, LayoutGrid, MonitorSpeaker,
  History, Settings, ChevronRight, LogOut, UtensilsCrossed,
  Package, Image as ImageIcon, Users
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Início',          href: '/dashboard',         icon: Home },
  { label: 'Caixa / PDV',     href: '/dashboard/pdv',     icon: MonitorSpeaker },
  { label: 'Delivery',        href: '/admin/delivery',    icon: Truck },
  { label: 'Mesas/Comandas',  href: '/dashboard/mesas',   icon: LayoutGrid },
  { label: 'Cozinha (KDS)',   href: '/admin/cozinha',     icon: UtensilsCrossed },
  { label: 'Histórico',       href: '/dashboard/historico', icon: History },
  { label: 'Cardápio',        href: '/dashboard/cardapio', icon: ShoppingBag },
  { label: 'Produtos',        href: '/dashboard/produtos', icon: Package },
  { label: 'Banners',         href: '/dashboard/banners', icon: ImageIcon },
  { label: 'Configuração',    href: '/dashboard/configuracoes', icon: Settings },
]

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
    <aside className="fixed left-0 top-0 h-full w-[200px] flex flex-col z-40"
      style={{ backgroundColor: '#1c1208', borderRight: '1px solid #2a1e10' }}>

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b" style={{ borderColor: '#2a1e10' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
          style={{ backgroundColor: '#eb0029', color: '#fff' }}>
          V
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">VigorePro</p>
          <p className="text-xs leading-tight" style={{ color: '#9ca3af' }}>food</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const href = item.href + (slug ? '?slug=' + slug : '')
          return (
            <Link
              key={item.href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
              style={{
                backgroundColor: active ? '#eb0029' : 'transparent',
                color: active ? '#ffffff' : '#9ca3af',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = '#2a1e10'; (e.currentTarget as HTMLElement).style.color = '#ffffff' }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9ca3af' } }}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t" style={{ borderColor: '#2a1e10' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all"
          style={{ color: '#9ca3af' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2a1e10'; (e.currentTarget as HTMLElement).style.color = '#ffffff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9ca3af' }}
        >
          <LogOut size={17} />
          <span>Sair</span>
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#4b5563' }}>v1.0.0</p>
      </div>
    </aside>
  )
}

function SlugReader({ children }: { children: (slug: string) => React.ReactNode }) {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  return <>{children(slug)}</>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      <Suspense fallback={null}>
        <SlugReader>
          {(slug) => <Sidebar slug={slug} />}
        </SlugReader>
      </Suspense>
      <main className="ml-[200px] min-h-screen" style={{ backgroundColor: '#111111' }}>
        {children}
      </main>
    </div>
  )
}

