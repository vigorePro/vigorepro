'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import {
    House, Wallet, Bike, UtensilsCrossed, ShoppingCart, ChefHat,
    ChartColumn, Smartphone, CreditCard, MessageCircle, BarChart2,
    BookOpen, Globe, Users, HandCoins, Lightbulb, Link2,
    BookOpenText, Headphones, LogOut, Settings, Package, DollarSign,
    Megaphone, Receipt, ExternalLink, Star, Tablet
} from 'lucide-react'

const NAV_GROUPS = [
  {
        items: [
          { label: 'Inicio',              icon: House,           href: '/dashboard' },
          { label: 'Caixa',               icon: Wallet,          href: '/dashboard/caixa' },
          { label: 'Delivery',            icon: Bike,            href: '/admin/delivery' },
          { label: 'Mesas/Comandas',      icon: UtensilsCrossed, href: '/dashboard/mesas' },
          { label: 'PDV',                 icon: ShoppingCart,    href: '/dashboard/pdv' },
          { label: 'KDS',                 icon: ChefHat,         href: '/admin/cozinha', external: true },
          { label: 'Historico de Vendas', icon: ChartColumn,     href: '/dashboard/historico' },
              ],
  },
  {
        divider: true,
        items: [
          { label: 'Aplicativos',         icon: Smartphone,      href: '/dashboard/aplicativos' },
          { label: 'Pix Online',          icon: CreditCard,      href: '/dashboard/pix' },
          { label: 'WhatsApp',            icon: MessageCircle,   href: '/dashboard/whatsapp' },
          { label: 'Desempenho',          icon: BarChart2,       href: '/dashboard/desempenho' },
              ],
  },
  {
        divider: true,
        items: [
          { label: 'Cardapio',            icon: BookOpen,        href: '/dashboard/cardapio' },
          { label: 'Cardapio Digital',    icon: Globe,           href: '/dashboard/cardapio-digital' },
          { label: 'Clientes',            icon: Users,           href: '/dashboard/clientes' },
          { label: 'Fidelidade CRM',      icon: HandCoins,       href: '/dashboard/fidelidade' },
              ],
  },
  {
        divider: true,
        items: [
          { label: 'Estoque',             icon: Package,         href: '/dashboard/estoque' },
          { label: 'Financeiro',          icon: DollarSign,      href: '/dashboard/financeiro' },
          { label: 'Marketing',           icon: Megaphone,       href: '/dashboard/marketing' },
          { label: 'Fiscal',              icon: Receipt,         href: '/dashboard/fiscal' },
              ],
  },
  {
        divider: true,
        items: [
          { label: 'Sugestoes',           icon: Lightbulb,       href: '/dashboard/sugestoes' },
          { label: 'Meus Links',          icon: Link2,           href: '/dashboard/links' },
          { label: 'Manual',              icon: BookOpenText,    href: '/dashboard/manual' },
          { label: 'Suporte',             icon: Headphones,      href: '/dashboard/suporte' },
              ],
  },
  {
        divider: true,
        items: [
          { label: 'Configuracoes',       icon: Settings,        href: '/dashboard/configuracoes' },
          { label: 'Sair',                icon: LogOut,          href: '/logout', danger: true },
              ],
  },
  ]

function SlugReader({ children }: { children: (slug: string) => React.ReactNode }) {
    const searchParams = useSearchParams()
    const slug = searchParams.get('slug') || ''
    return <>{children(slug)}</>>
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
                              <aside style={{
                                      position: 'fixed', left: 0, top: 0, height: '100vh', width: '208px',
                                      backgroundColor: '#080808',
                                      borderRight: '1px solid #292929',
                                      display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto',
                                      fontFamily: 'Mulish, sans-serif',
                              }}>
                              
                                {/* Logo */}
                                    <div style={{
                                        padding: '16px',
                                        borderBottom: '1px solid #424242',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        height: '65px', flexShrink: 0,
                              }}>
                                            <div style={{
                                          width: '32px', height: '32px', borderRadius: '6px',
                                          backgroundColor: '#ef4239',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: '#fff', fontWeight: 800, fontSize: '12px', flexShrink: 0,
                                          fontFamily: 'Mulish, sans-serif',
                              }}>VP</div>div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
                                                      <span style={{ color: '#e6e6e6', fontWeight: 700, fontSize: '13px', lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>VigorePro</span>span>
                                                      <span style={{ color: '#666', fontWeight: 400, fontSize: '11px', lineHeight: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slug || 'estabelecimento'}</span>span>
                                            </div>div>
                                    </div>div>
                              
                                {/* Nav */}
                                    <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                      {NAV_GROUPS.map((group, gi) => (
                                          <div key={gi}>
                                            {group.divider && (
                                                          <div style={{ height: '1px', backgroundColor: '#424242', margin: '0 8px' }} />
                                                        )}
                                                      <div style={{ padding: '8px 2px' }}>
                                                        {group.items.map((item) => {
                                                            const active = isActive(item.href)
                                                                              const href = `${item.href}?slug=${slug}`
                                                                                                const Icon = item.icon as any
                                                                                                  
                                                                                                                  if (item.href === '/logout') {
                                                                                                                                      return (
                                                                                                                                                            <button
                                                                                                                                                                                    key={item.href}
                                                                                                                                                                                    onClick={handleSignOut}
                                                                                                                                                                                    style={{
                                                                                                                                                                                                              display: 'flex', alignItems: 'center', gap: '6px',
                                                                                                                                                                                                              width: '100%', height: '32px', padding: '6px 4px',
                                                                                                                                                                                                              fontSize: '14px', fontWeight: 400, lineHeight: '20px',
                                                                                                                                                                                                              color: '#ef4239',
                                                                                                                                                                                                              backgroundColor: 'transparent',
                                                                                                                                                                                                              borderLeft: '4px solid transparent',
                                                                                                                                                                                                              borderRadius: '14px',
                                                                                                                                                                                                              border: 'none', cursor: 'pointer',
                                                                                                                                                                                                              fontFamily: 'Mulish, sans-serif',
                                                                                                                                                                                                              boxSizing: 'border-box',
                                                                                                                                                                                                            }}
                                                                                                                                                                                  >
                                                                                                                                                                                  <Icon size={16} style={{ color: '#ef4239', flexShrink: 0, strokeWidth: 1.5 }} />
                                                                                                                                                                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>span>
                                                                                                                                                              </button>button>
                                                                                                                                                          )
                                                          }
                                                      
                                                                      return (
                                                                        <Link
                                                                                              key={item.href}
                                                                                              href={href}
                                                                                              style={{
                                                                                                                      display: 'flex', alignItems: 'center', gap: '6px',
                                                                                                                      width: '100%', height: '32px', padding: '6px 4px',
                                                                                                                      fontSize: '14px',
                                                                                                                      fontWeight: active ? 500 : 400,
                                                                                                                      lineHeight: '20px',
                                                                                                                      color: active ? '#ef4239' : '#e6e6e6',
                                                                                                                      backgroundColor: active ? '#281615' : 'transparent',
                                                                                                                      borderLeft: active ? '4px solid #ef4239' : '4px solid transparent',
                                                                                                                      borderRadius: active ? '0px' : '14px',
                                                                                                                      textDecoration: 'none',
                                                                                                                      boxSizing: 'border-box',
                                                                                                                      fontFamily: 'Mulish, sans-serif',
                                                                                                                      whiteSpace: 'nowrap', overflow: 'hidden',
                                                                                                }}
                                                                                            >
                                                                                            <Icon size={16} style={{
                                                                                                                    color: active ? '#ef4239' : '#e6e6e6',
                                                                                                                    flexShrink: 0, strokeWidth: 1.5,
                                                                                              }} />
                                                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                                                              {item.label}
                                                                                              </span>span>
                                                                          {(item as any).external && (
                                                                                                                    <ExternalLink size={12} style={{ color: '#666', flexShrink: 0 }} />
                                                                                                                  )}
                                                                        </Link>Link>
                                                                      )
                                                        })}
                                                      </div>div>
                                          </div>div>
                                        ))}
                                    </nav>nav>
                              
                                {/* Footer */}
                                    <div style={{
                                        padding: '8px', borderTop: '1px solid #292929',
                                        textAlign: 'center', fontSize: '11px', color: '#424242',
                                        fontFamily: 'Mulish, sans-serif', flexShrink: 0,
                              }}>
                                            v1.0.0
                                    </div>div>
                              </aside>aside>
                            )
                          }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
          <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#111', fontFamily: 'Mulish, sans-serif' }}>
                <Suspense fallback={
                          <aside style={{ width: '208px', minWidth: '208px', backgroundColor: '#080808', borderRight: '1px solid #292929' }} />
                }>
                        <SlugReader>
                          {(slug) => <Sidebar slug={slug} />}
                        </SlugReader>SlugReader>
                </Suspense>Suspense>
                <main style={{ marginLeft: '208px', flex: 1, minHeight: '100vh', backgroundColor: '#111' }}>
                  {children}
                </main>main>
          </div>div>
        )
}</>
