'use client'

import { Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  House, Wallet, Bike, UtensilsCrossed, ShoppingCart, ChefHat,
  BarChart3, Smartphone, CreditCard, MessageCircle, BarChart2,
  BookOpen, Globe, Users, HandCoins, Lightbulb, Link2,
  BookOpenText, Headphones, LogOut, Settings, ExternalLink, DollarSign
} from 'lucide-react'

type NavItem = {
  label: string
  href?: string
  icon: React.ElementType
  external?: boolean
}

type NavGroup = {
  items: NavItem[]
}

function SidebarContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || 'default'

  const navGroups: NavGroup[] = [
    {
      items: [
        { label: 'Inicio', href: '/dashboard?slug=' + slug, icon: House },
        { label: 'Caixa', href: '/dashboard/caixa?slug=' + slug, icon: Wallet },
        { label: 'Delivery', href: '/dashboard/delivery?slug=' + slug, icon: Bike },
        { label: 'Mesas/Comandas', href: '/dashboard/mesas?slug=' + slug, icon: UtensilsCrossed },
        { label: 'PDV', href: '/dashboard/pdv?slug=' + slug, icon: ShoppingCart },
        { label: 'KDS', href: 'https://kds.vigorepro.com.br?slug=' + slug, icon: ChefHat, external: true },
        { label: 'Historico de Vendas', href: '/dashboard/historico?slug=' + slug, icon: BarChart3 },
      ]
    },
    {
      items: [
        { label: 'Aplicativos', href: '/dashboard/aplicativos?slug=' + slug, icon: Smartphone },
        { label: 'Pix Online', href: '/dashboard/pix?slug=' + slug, icon: CreditCard },
        { label: 'WhatsApp', href: '/dashboard/whatsapp?slug=' + slug, icon: MessageCircle },
        { label: 'Desempenho', href: '/dashboard/desempenho?slug=' + slug, icon: BarChart2 },
      ]
    },
    {
      items: [
        { label: 'Cardapio', href: '/dashboard/cardapio?slug=' + slug, icon: BookOpen },
        { label: 'Cardapio Digital', href: '/dashboard/cardapio-digital?slug=' + slug, icon: Globe },
        { label: 'Clientes', href: '/dashboard/clientes?slug=' + slug, icon: Users },
        { label: 'Fidelidade CRM', href: '/dashboard/crm?slug=' + slug, icon: HandCoins },
      ]
    },
    {
      items: [
        { label: 'Financeiro', href: '/dashboard/financeiro?slug=' + slug, icon: DollarSign },
      ]
    },
    {
      items: [
        { label: 'Sugestoes', href: '/dashboard/sugestoes?slug=' + slug, icon: Lightbulb },
        { label: 'Meus Links', href: '/dashboard/links?slug=' + slug, icon: Link2 },
        { label: 'Manual', href: '/dashboard/manual?slug=' + slug, icon: BookOpenText },
        { label: 'Suporte', href: '/dashboard/suporte?slug=' + slug, icon: Headphones },
      ]
    },
    {
      items: [
        { label: 'Configuracoes', href: '/dashboard/configuracoes?slug=' + slug, icon: Settings },
        { label: 'Sair', href: '/login', icon: LogOut },
      ]
    },
  ]

  const isActive = (href?: string) => {
    if (!href) return false
    if (href.startsWith('http')) return false
    const hrefPath = href.split('?')[0]
    if (hrefPath === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(hrefPath)
  }

  return (
    <>
      <div style={{
        height: '65px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #424242',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#ef4239', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: '800',
            fontSize: '14px', fontFamily: 'Mulish, sans-serif'
          }}>VP</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'Mulish, sans-serif' }}>VigorePro</div>
            <div style={{ fontSize: '11px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>estabelecimento</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div style={{ height: '1px', background: '#424242', margin: '4px 0' }} />
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  onClick={() => {
                    if (item.external && item.href) {
                      window.open(item.href, '_blank')
                    } else if (item.href) {
                      router.push(item.href)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    height: '32px',
                    cursor: 'pointer',
                    borderRadius: active ? '0px' : '14px',
                    background: active ? '#281615' : 'transparent',
                    color: active ? '#ef4239' : '#e6e6e6',
                    fontWeight: active ? '500' : '400',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: 'Mulish, sans-serif',
                    borderLeft: active ? '4px solid #ef4239' : '4px solid transparent',
                    transition: 'all 0.15s',
                    marginBottom: '2px',
                    userSelect: 'none',
                  }}
                >
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.external && <ExternalLink size={12} style={{ color: '#555' }} />}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid #292929',
        fontSize: '11px',
        color: '#424242',
        fontFamily: 'Mulish, sans-serif',
        textAlign: 'center'
      }}>
        v1.0.0
      </div>
    </>
  )
}

function DashboardSidebar() {
  return (
    <div style={{
      width: '180px',
      minWidth: '180px',
      height: '100vh',
      background: '#080808',
      borderRight: '1px solid #292929',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50
    }}>
      <Suspense fallback={null}>
        <SidebarContent />
      </Suspense>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111' }}>
      <DashboardSidebar />
      <main style={{ flex: 1, marginLeft: '180px', minHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
