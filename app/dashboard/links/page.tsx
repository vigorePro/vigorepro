'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Link2, Plus, ExternalLink, Copy, Check, Trash2, Globe, Instagram, Facebook, QrCode, Edit3 } from 'lucide-react'

function LinksContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimento, setEstabelecimento] = useState<any>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [linksCustom, setLinksCustom] = useState<any[]>([])
  const [modalNovo, setModalNovo] = useState(false)
  const [form, setForm] = useState({ titulo: '', url: '' })

  const fetchEstab = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (data) setEstabelecimento(data)
  }, [slug])

  useEffect(() => { fetchEstab() }, [fetchEstab])

  const copiar = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const cardapioUrl = `https://dolcedolce.vigorepro.com.br/cardapio/${slug}`
  const rastreioUrl = `https://dolcedolce.vigorepro.com.br/pedido/`

  const linksFixos = [
    { id: 'cardapio', titulo: 'Cardápio Digital', url: cardapioUrl, desc: 'Link principal para seus clientes fazerem pedidos online', icone: <Globe size={20} color="#22c55e" />, cor: '#22c55e' },
    { id: 'whatsapp', titulo: 'WhatsApp', url: estabelecimento?.telefone ? `https://wa.me/55${estabelecimento.telefone.replace(/\D/g,'')}` : '', desc: 'Link direto para seu WhatsApp', icone: <Globe size={20} color="#25d366" />, cor: '#25d366' },
    { id: 'instagram', titulo: 'Instagram', url: estabelecimento?.instagram ? `https://instagram.com/${estabelecimento.instagram.replace('@','')}` : '', desc: 'Seu perfil no Instagram', icone: <Instagram size={20} color="#e1306c" />, cor: '#e1306c' },
    { id: 'facebook', titulo: 'Facebook', url: estabelecimento?.facebook || '', desc: 'Sua página no Facebook', icone: <Facebook size={20} color="#1877f2" />, cor: '#1877f2' },
  ].filter(l => l.url)

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', padding: 24, color: '#e6e6e6' }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#3b82f622', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link2 size={20} color="#3b82f6" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Meus Links</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Links e QR codes do seu estabelecimento</p>
          </div>
        </div>
      </div>

      {/* Link do Cardápio - destaque */}
      <div style={{ background: '#0f2e1a', border: '2px solid #16a34a', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 0.5 }}>🌐 Seu Cardápio Digital</p>
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#fff' }}>{estabelecimento?.nome || 'Estabelecimento'}</p>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#4ade80' }}>{cardapioUrl}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => copiar(cardapioUrl, 'cardapio-main')} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Mulish, sans-serif'
              }}>
                {copiado === 'cardapio-main' ? <Check size={14} /> : <Copy size={14} />}
                {copiado === 'cardapio-main' ? 'Copiado!' : 'Copiar Link'}
              </button>
              <a href={cardapioUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                border: '1px solid #22c55e', color: '#22c55e', fontWeight: 600, fontSize: 13, textDecoration: 'none'
              }}>
                <ExternalLink size={14} /> Abrir
              </a>
            </div>
          </div>
          {/* QR Code simples */}
          <div style={{ background: '#fff', padding: 12, borderRadius: 10, flexShrink: 0 }}>
            <QrCode size={80} color="#111" />
            <p style={{ margin: '6px 0 0', fontSize: 10, textAlign: 'center', color: '#888' }}>QR Code</p>
          </div>
        </div>
      </div>

      {/* Outros links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#fff' }}>Links do Estabelecimento</h2>
        {linksFixos.map(link => (
          <div key={link.id} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: link.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {link.icone}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: '#fff' }}>{link.titulo}</p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#888' }}>{link.desc}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{link.url}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => copiar(link.url, link.id)} style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid #292929', background: 'none',
                color: copiado === link.id ? '#22c55e' : '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'Mulish, sans-serif'
              }}>
                {copiado === link.id ? <Check size={13} /> : <Copy size={13} />}
                {copiado === link.id ? 'Copiado' : 'Copiar'}
              </button>
              <a href={link.url} target="_blank" rel="noopener noreferrer" style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #292929', background: 'none',
                color: '#888', display: 'flex', alignItems: 'center'
              }}>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ))}
        {linksFixos.length === 0 && (
          <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, padding: 30, textAlign: 'center', color: '#555' }}>
            <p>Configure o WhatsApp, Instagram e Facebook nas <strong style={{ color: '#ef4239' }}>Configurações</strong> para ver seus links aqui</p>
          </div>
        )}
      </div>

      {/* Link de rastreamento */}
      <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#fff' }}>🔍 Link de Rastreamento</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>Compartilhe com o cliente para ele acompanhar o pedido</p>
        <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555', fontFamily: 'monospace' }}>
          {rastreioUrl}<span style={{ color: '#ef4239' }}>[ID_DO_PEDIDO]</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#444' }}>O ID do pedido é gerado automaticamente ao criar um pedido via PDV ou Cardápio Digital</p>
      </div>
    </div>
  )
}

export default function LinksPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <LinksContent />
    </Suspense>
  )
}
