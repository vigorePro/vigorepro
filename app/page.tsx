'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChefHat, Search, ArrowRight, Star, BarChart3, MessageCircle, Truck, ShoppingBag, Globe, Lock, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')

  const acessarDashboard = async () => {
    if (!slug.trim()) return
    setBuscando(true)
    setErro('')
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    const { data } = await supabase.from('estabelecimentos').select('id,slug,nome').eq('slug', s).single()
    if (data) {
      router.push('/dashboard?slug=' + data.slug)
    } else {
      setErro('Estabelecimento "' + s + '" não encontrado. Verifique o slug.')
      setBuscando(false)
    }
  }

  const features = [
    { icon: <ShoppingBag size={24} />, title: 'PDV Completo', desc: 'Ponto de venda com produtos, categorias e carrinho' },
    { icon: <Truck size={24} />, title: 'Delivery Kanban', desc: 'Gestão de entregas em tempo real com 4 colunas' },
    { icon: <BarChart3 size={24} />, title: 'Desempenho', desc: 'KPIs, gráficos e análises do seu negócio' },
    { icon: <MessageCircle size={24} />, title: 'WhatsApp IA', desc: 'Atendimento automatizado 24/7 por inteligência artificial' },
    { icon: <Globe size={24} />, title: 'Cardápio Digital', desc: 'Cardápio online com pedidos e rastreamento' },
    { icon: <Star size={24} />, title: 'Fidelidade CRM', desc: 'Programa de pontos e recompensas para clientes' },
  ]

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', minHeight: '100vh', background: '#080808', color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* NAVBAR */}
      <nav style={{ padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ef4239', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChefHat size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Vigor<span style={{ color: '#ef4239' }}>Pro</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })} style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid #292929', background: 'none',
            color: '#e6e6e6', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
          }}>Acessar Painel</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ef423922', border: '1px solid #ef423944', borderRadius: 20, padding: '6px 16px', marginBottom: 24, fontSize: 13, color: '#ef4239', fontWeight: 600 }}>
          <CheckCircle size={14} /> SaaS para Food Service
        </div>
        <h1 style={{ margin: '0 0 20px', fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>
          Seu restaurante no<br />
          <span style={{ color: '#ef4239' }}>próximo nível</span>
        </h1>
        <p style={{ margin: '0 0 48px', fontSize: 18, color: '#888', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          PDV, Delivery, KDS, Cardápio Digital, WhatsApp IA e muito mais. Tudo integrado em uma só plataforma.
        </p>

        {/* Login box */}
        <div id="login" style={{ background: '#111', border: '1px solid #292929', borderRadius: 16, padding: 32, maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Acessar seu painel</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#888' }}>Digite o slug do seu estabelecimento para entrar</p>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>Slug do Estabelecimento</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#555' }}>vigorepro.com.br/</span>
              <input value={slug} onChange={e => { setSlug(e.target.value); setErro('') }}
                onKeyDown={e => e.key === 'Enter' && acessarDashboard()}
                placeholder="dolcedolce"
                style={{ width: '100%', padding: '12px 12px 12px 130px', borderRadius: 8, border: '1px solid ' + (erro ? '#ef4444' : '#333'), background: '#0a0a0a', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Mulish, sans-serif' }}
              />
            </div>
            <button onClick={acessarDashboard} disabled={buscando || !slug} style={{
              padding: '12px 20px', borderRadius: 8, border: 'none',
              background: slug && !buscando ? '#ef4239' : '#333', color: '#fff',
              fontWeight: 700, cursor: slug && !buscando ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Mulish, sans-serif', flexShrink: 0
            }}>
              {buscando ? '...' : <><ArrowRight size={18} /></>}
            </button>
          </div>
          {erro && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#ef4444' }}>{erro}</p>}
          <div style={{ marginTop: 16, padding: 12, background: '#0a0a0a', borderRadius: 8, border: '1px solid #1a1a1a' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
              Exemplo: digite <strong style={{ color: '#ef4239' }}>dolcedolce</strong> para acessar o painel da Dolce & Dolce
            </p>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Tudo que seu restaurante precisa</h2>
        <p style={{ textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 48 }}>Uma plataforma completa, do pedido à entrega</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ef423922', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4239', marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#fff' }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #1a1a1a', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#555' }}>© 2026 VigorePro · SaaS para Food Service</span>
        <span style={{ fontSize: 13, color: '#555' }}>v1.0.0</span>
      </div>
    </div>
  )
}
