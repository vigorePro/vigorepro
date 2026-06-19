'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link2, Plus, ExternalLink, Copy, Check, Trash2, GripVertical, Globe, Instagram, Facebook, Twitter, Youtube, QrCode } from 'lucide-react'

const ICONES_REDE = { instagram: Instagram, facebook: Facebook, twitter: Twitter, youtube: Youtube, globe: Globe }

const LINKS_MOCK = [
  { id: 1, titulo: 'Cardápio Digital', url: 'https://cardapio.vigorepro.com.br/dolcedolce', icone: 'globe', cor: '#ef4239', cliques: 248 },
  { id: 2, titulo: 'Instagram', url: 'https://instagram.com/dolcedolce', icone: 'instagram', cor: '#e1306c', cliques: 132 },
  { id: 3, titulo: 'Facebook', url: 'https://facebook.com/dolcedolce', icone: 'facebook', cor: '#1877f2', cliques: 89 },
  { id: 4, titulo: 'WhatsApp', url: 'https://wa.me/5511945678900', icone: 'globe', cor: '#25d366', cliques: 315 },
]

function LinksContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [links, setLinks] = useState(LINKS_MOCK)
  const [novoLink, setNovoLink] = useState(false)
  const [novoForm, setNovoForm] = useState({ titulo: '', url: '', icone: 'globe', cor: '#ef4239' })
  const [copiados, setCopiados] = useState<Set<number>>(new Set())
  const paginaLink = `https://vigorepro.com.br/links/${slug}`

  const copiar = (id: number, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiados(new Set([...copiados, id]))
    setTimeout(() => setCopiados(cs => { const ns = new Set(cs); ns.delete(id); return ns }), 2000)
  }

  const adicionarLink = () => {
    if (!novoForm.titulo || !novoForm.url) return
    setLinks([...links, { ...novoForm, id: Date.now(), cliques: 0 }])
    setNovoLink(false)
    setNovoForm({ titulo: '', url: '', icone: 'globe', cor: '#ef4239' })
  }

  const inputStyle: React.CSSProperties = { padding: '9px 12px', backgroundColor: '#111', border: '1px solid #292929', borderRadius: '8px', color: '#e6e6e6', fontSize: '13px', fontFamily: 'Mulish, sans-serif' }

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link2 size={26} color='#ef4239' />
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Meus Links</h1>
            <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0' }}>Gerencie seus links e redes sociais</p>
          </div>
        </div>
        <button onClick={() => setNovoLink(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4239', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'Mulish, sans-serif' }}>
          <Plus size={16} /> Novo Link
        </button>
      </div>

      {/* Pagina de links */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <QrCode size={16} color='#ef4239' />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Sua Página de Links</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input readOnly value={paginaLink} style={{ ...inputStyle, flex: 1, color: '#ef4239' }} />
          <button onClick={() => copiar(0, paginaLink)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #292929', backgroundColor: '#111', color: '#e6e6e6' }}>
            {copiados.has(0) ? <Check size={14} color='#22c55e' /> : <Copy size={14} />}
          </button>
          <a href={paginaLink} target='_blank' rel='noopener noreferrer' style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: '#888', border: '1px solid #292929' }}>
            <ExternalLink size={14} />
          </a>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
          {[{ label: 'Total de Cliques', val: links.reduce((a,l) => a+l.cliques,0).toString() }, { label: 'Links Ativos', val: links.length.toString() }].map(s => (
            <div key={s.label} style={{ color: '#888', fontSize: '13px' }}>
              {s.label}: <span style={{ color: '#e6e6e6', fontWeight: 600 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {novoLink && (
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4239', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', margin: '0 0 16px' }}>Novo Link</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <input value={novoForm.titulo} onChange={e => setNovoForm({...novoForm, titulo: e.target.value})} placeholder='Título (ex: Instagram)' style={{ ...inputStyle, flex: 1, minWidth: '140px' }} />
            <input value={novoForm.url} onChange={e => setNovoForm({...novoForm, url: e.target.value})} placeholder='https://...' style={{ ...inputStyle, flex: 2, minWidth: '200px' }} />
            <input type='color' value={novoForm.cor} onChange={e => setNovoForm({...novoForm, cor: e.target.value})} style={{ width: '44px', height: '40px', border: '1px solid #292929', borderRadius: '8px', cursor: 'pointer', padding: '2px', backgroundColor: '#111' }} />
            <button onClick={adicionarLink} style={{ ...inputStyle, backgroundColor: '#ef4239', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
            <button onClick={() => setNovoLink(false)} style={{ ...inputStyle, cursor: 'pointer', color: '#888' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de links */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
        {links.map(link => {
          const IconeRede = ICONES_REDE[link.icone as keyof typeof ICONES_REDE] || Globe
          return (
            <div key={link.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <GripVertical size={16} color='#333' style={{ cursor: 'grab', flexShrink: 0 }} />
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: link.cor + '20', border: `1px solid ${link.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconeRede size={18} color={link.cor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{link.titulo}</div>
                <div style={{ color: '#555', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{link.url}</div>
              </div>
              <div style={{ color: '#888', fontSize: '12px', flexShrink: 0 }}>
                <span style={{ color: '#ef4239', fontWeight: 600 }}>{link.cliques}</span> cliques
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => copiar(link.id, link.url)} style={{ background: 'none', border: '1px solid #292929', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: copiados.has(link.id) ? '#22c55e' : '#888' }}>
                  {copiados.has(link.id) ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <a href={link.url} target='_blank' rel='noopener noreferrer' style={{ display: 'flex', border: '1px solid #292929', borderRadius: '6px', padding: '6px', color: '#888', textDecoration: 'none' }}>
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => setLinks(links.filter(l => l.id !== link.id))} style={{ background: 'none', border: '1px solid #292929', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4239' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LinksPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <LinksContent />
    </Suspense>
  )
}
