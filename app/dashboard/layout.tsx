'use client'

import { Suspense, useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
House, Wallet, Bike, UtensilsCrossed, ShoppingCart, ChefHat,
BarChart3, Smartphone, CreditCard, BarChart2,
BookOpen, Globe, Users, HandCoins, Lightbulb, Link2,
BookOpenText, Headphones, LogOut, Settings, ExternalLink,
DollarSign, Megaphone, FileText, Receipt, Package, Bot,
MessageSquare, FileStack, Send, History, ChevronDown, ChevronRight
} from 'lucide-react'

type NavItem = {
  label: string
  href?: string
  icon: React.ElementType
  external?: boolean
  subItems?: NavItem[]
}

type NavGroup = {
  items: NavItem[]
}

function SidebarContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || 'default'
  const [nomeEstab, setNomeEstab] = useState(slug || 'VigorePro')
  const [iaMenuOpen, setIaMenuOpen] = useState(false)

  useEffect(() => {
    if (!slug || slug === 'default') return
    supabase.from('estabelecimentos').select('nome').eq('slug', slug).single()
      .then(({ data }) => { if (data?.nome) setNomeEstab(data.nome) })
  }, [slug])

  useEffect(() => {
    if (
      pathname.startsWith('/dashboard/ia') ||
      pathname.startsWith('/dashboard/mel') ||
      pathname.startsWith('/dashboard/whatsapp')
    ) {
      setIaMenuOpen(true)
    }
  }, [pathname])

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
        { label: 'Desempenho', href: '/dashboard/desempenho?slug=' + slug, icon: BarChart2 },
      ]
    },
    {
      items: [
        { label: 'Cardapio', href: '/dashboard/cardapio?slug=' + slug, icon: BookOpen },
        { label: 'Cardapio Digital', href: '/dashboard/cardapio-digital?slug=' + slug, icon: Globe },
        { label: 'Clientes', href: '/dashboard/clientes?slug=' + slug, icon: Users },
        { label: 'Fidelidade CRM', href: '/dashboard/fidelidade?slug=' + slug, icon: HandCoins },
      ]
    },
    {
      items: [
        { label: 'Food Marketing', href: '/dashboard/marketing?slug=' + slug, icon: Megaphone },
        { label: 'Fiado', href: '/dashboard/fiado?slug=' + slug, icon: Receipt },
        { label: 'Estoque', href: '/dashboard/estoque?slug=' + slug, icon: Package },
        { label: 'Financeiro', href: '/dashboard/financeiro?slug=' + slug, icon: DollarSign },
        { label: 'Fiscal', href: '/dashboard/fiscal?slug=' + slug, icon: FileText },
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

  const iaSubItems = [
    { label: 'Conversas', href: '/dashboard/ia?slug=' + slug, icon: MessageSquare },
    { label: 'Templates', href: '/dashboard/mel?slug=' + slug, icon: FileStack },
    { label: 'Envios em Massa', href: '/dashboard/whatsapp?slug=' + slug, icon: Send },
    { label: 'Historico', href: '/dashboard/whatsapp?slug=' + slug, icon: History },
  ]

  const isActive = (href?: string) => {
    if (!href) return false
    if (href.startsWith('http')) return false
    const hrefPath = href.split('?')[0]
    if (hrefPath === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(hrefPath)
  }

  const isIaActive = pathname.startsWith('/dashboard/ia') || pathname.startsWith('/dashboard/mel') || pathname.startsWith('/dashboard/whatsapp')

  const itemStyle = (active: boolean) => ({
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
    userSelect: 'none' as const,
  })

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
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'Mulish, sans-serif' }}>{nomeEstab}</div>
            <div style={{ fontSize: '11px', color: '#888', fontFamily: 'Mulish, sans-serif' }}>{slug}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '0' }}>

        {navGroups.slice(0, 1).map((group, gi) => (
          <div key={gi}>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div key={item.label} onClick={() => { if (item.external && item.href) { window.open(item.href, '_blank') } else if (item.href) { router.push(item.href) } }} style={itemStyle(active)}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.external && <ExternalLink size={12} style={{ color: '#555' }} />}
                </div>
              )
            })}
          </div>
        ))}

        <div style={{ height: '1px', background: '#424242', margin: '4px 0' }} />

        {navGroups.slice(1, 2).map((group, gi) => (
          <div key={gi}>
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div key={item.label} onClick={() => { if (item.href) router.push(item.href) }} style={itemStyle(active)}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              )
            })}
          </div>
        ))}

        <div
          onClick={() => setIaMenuOpen(!iaMenuOpen)}
          style={itemStyle(isIaActive)}
        >
          <Bot size={16} />
          <span style={{ flex: 1 }}>IA MEL</span>
          {iaMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {iaMenuOpen && (
          <div style={{ marginLeft: '12px', borderLeft: '2px solid #333' }}>
            {iaSubItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 8px',
                    height: '30px',
                    cursor: 'pointer',
                    borderRadius: '10px',
                    background: active ? '#281615' : 'transparent',
                    color: active ? '#ef4239' : '#aaa',
                    fontSize: '13px',
                    fontFamily: 'Mulish, sans-serif',
                    marginBottom: '1px',
                    userSelect: 'none',
                  }}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {navGroups.slice(2).map((group, gi) => (
          <div key={gi}>
            <div style={{ height: '1px', background: '#424242', margin: '4px 0' }} />
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <div key={item.label} onClick={() => { if (item.href) router.push(item.href) }} style={itemStyle(active)}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
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
