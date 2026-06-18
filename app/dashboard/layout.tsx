'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  House, Wallet, Bike, UtensilsCrossed, ShoppingCart, ChefHat,
  ChartColumn, Smartphone, CreditCard, MessageCircle, BarChart2,
  BookOpen, Globe, Users, HandCoins, Lightbulb, Link2,
  BookOpenText, Headphones, LogOut, Settings, ExternalLink
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''

  const navGroups: NavGroup[] = [
    {
      items: [
        { label: 'Início', href: `/dashboard?slug=${slug}`, icon: House },
        { label: 'Caixa', href: `/dashboard/caixa?slug=${slug}`, icon: Wallet },
        { label: 'Delivery', href: `/dashboard/delivery?slug=${slug}`, icon: Bike },
        { label: 'Mesas/Comandas', href: `/dashboard/mesas?slug=${slug}`, icon: UtensilsCrossed },
        { label: 'PDV', href: `/dashboard/pdv?slug=${slug}`, icon: ShoppingCart },
        { label: 'KDS', href: `https://kds.vigorepro.com.br?slug=${slug}`, icon: ChefHat, external: true },
        { label: 'Histórico de Vendas', href: `/dashboard/historico?slug=${slug}`, icon: ChartColumn },
      ]
    },
    {
      items: [
        { label: 'Aplicativos', href: `/dashboard/aplicativos?slug=${slug}`, icon: Smartphone },
        { label: 'Pix Online', href: `/dashboard/pix?slug=${slug}`, icon: CreditCard },
        { label: 'WhatsApp', href: `/dashboard/whatsapp?slug=${slug}`, icon: MessageCircle },
        { label: 'Desempenho', href: `/dashboard/desempenho?slug=${slug}`, icon: BarChart2 },
      ]
    },
    {
      items: [
        { label: 'Cardápio', href: `/dashboard/cardapio?slug=${slug}`, icon: BookOpen },
        { label: 'Cardápio Digital', href: `/dashboard/cardapio-digital?slug=${slug}`, icon: Globe },
        { label: 'Clientes', href: `/dashboard/clientes?slug=${slug}`, icon: Users },
        { label: 'Fidelidade CRM', href: `/dashboard/crm?slug=${slug}`, icon: HandCoins },
      ]
    },
    {
      items: [
        { label: 'Sugestões', href: `/dashboard/sugestoes?slug=${slug}`, icon: Lightbulb },
        { label: 'Meus Links', href: `/dashboard/links?slug=${slug}`, icon: Link2 },
        { label: 'Manual', href: `/dashboard/manual?slug=${slug}`, icon: BookOpenText },
        { label: 'Suporte', href: `/dashboard/suporte?slug=${slug}`, icon: Headphones },
      ]
    },
    {
      items: [
        { label: 'Configurações', href: `/dashboard/configuracoes?slug=${slug}`, icon: Settings },
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', backgroundColor: '#111' }}>
      <aside style={{
        width: '185px',
        minWidth: '185px',
        backgroundColor: '#080808',
        borderRight: '1px solid #292929',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{
          height: '65px',
          display: 'flex',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid #424242',
          flexShrink: 0
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#ef4239',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '8px',
            flexShrink: 0
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>VP</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', lineHeight: '16px' }}>VigorePro</div>
            <div style={{ color: '#888', fontSize: '11px', lineHeight: '14px' }}>estabelecimento</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {groupIndex > 0 && (
                <div style={{
                  height: '1px',
                  backgroundColor: '#424242',
                  margin: '4px 0'
                }} />
              )}
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <a
                    key={item.label}
                    href={item.external ? item.href : `${item.href}`}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={!item.external ? (e) => {
                      e.preventDefault()
                      if (item.href) router.push(item.href)
                    } : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      height: '32px',
                      borderRadius: active ? '0px' : '14px',
                      backgroundColor: active ? '#281615' : 'transparent',
                      color: active ? '#ef4239' : '#e6e6e6',
                      fontWeight: active ? 500 : 400,
                      fontSize: '14px',
                      lineHeight: '20px',
                      textDecoration: 'none',
                      borderLeft: active ? '4px solid #ef4239' : '4px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '2px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                    <span style={{ flexShrink: 0 }}>{item.label}</span>
                    {item.external && <ExternalLink size={10} strokeWidth={1.5} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #292929',
          color: '#424242',
          fontSize: '11px',
          flexShrink: 0
        }}>
          v1.0.0
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '185px', flex: 1, minHeight: '100vh', backgroundColor: '#111' }}>
        {children}
      </main>
    </div>
  )
}
