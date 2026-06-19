'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Save, Store, Phone, MapPin, Clock, Upload, CheckCircle, Globe, Palette, Bell, Shield, Link2, Image, RefreshCw } from 'lucide-react'

function ConfigContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estab, setEstab] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('geral')
  const [carregando, setCarregando] = useState(true)

  const fetchEstab = useCallback(async () => {
    if (!slug) return
    const { data } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
    if (data) { setEstab(data); setForm(data) }
    setCarregando(false)
  }, [slug])

  useEffect(() => { fetchEstab() }, [fetchEstab])

  const setF = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }))

  const salvar = async () => {
    if (!estab?.id) return
    setSalvando(true)
    const { error } = await supabase.from('estabelecimentos').update({
      nome: form.nome, telefone: form.telefone, email: form.email,
      endereco: form.endereco, cidade: form.cidade, estado: form.estado,
      cep: form.cep, logo_url: form.logo_url, banner_url: form.banner_url,
      cor_primaria: form.cor_primaria, descricao: form.descricao,
      horario_abertura: form.horario_abertura, horario_fechamento: form.horario_fechamento,
      aberto: form.aberto, instagram: form.instagram, facebook: form.facebook, site: form.site
    }).eq('id', estab.id)
    setSalvando(false)
    if (!error) { setSalvo(true); setEstab(form); setTimeout(() => setSalvo(false), 3000) }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #292929', background: '#111', color: '#e6e6e6', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Mulish, sans-serif' }
  const labelStyle = { display: 'block' as const, fontSize: 13, fontWeight: 600 as const, color: '#aaa', marginBottom: 6 }
  const sectionStyle = { background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 24, marginBottom: 20 }

  const abas = [
    { id: 'geral', label: 'Geral', icon: <Store size={14} /> },
    { id: 'aparencia', label: 'Aparência', icon: <Palette size={14} /> },
    { id: 'contato', label: 'Contato', icon: <Phone size={14} /> },
    { id: 'horarios', label: 'Horários', icon: <Clock size={14} /> },
    { id: 'redes', label: 'Redes Sociais', icon: <Globe size={14} /> },
  ]

  if (carregando) return <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando configurações...</div>

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', padding: 24, color: '#e6e6e6', maxWidth: 800 }}>
      <link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>Configurações</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>{estab?.nome} · slug: {slug}</p>
        </div>
        <button onClick={salvar} disabled={salvando} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
          borderRadius: 8, border: 'none',
          background: salvo ? '#22c55e' : salvando ? '#555' : '#ef4239',
          color: '#fff', fontWeight: 700, fontSize: 14, cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'Mulish, sans-serif'
        }}>
          {salvo ? <CheckCircle size={16} /> : salvando ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          {salvo ? 'Salvo!' : salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #292929' }}>
        {abas.map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
            background: 'none', border: 'none', borderBottom: abaAtiva === aba.id ? '2px solid #ef4239' : '2px solid transparent',
            color: abaAtiva === aba.id ? '#ef4239' : '#888', fontWeight: abaAtiva === aba.id ? 600 : 400,
            fontSize: 13, cursor: 'pointer', marginBottom: -1, fontFamily: 'Mulish, sans-serif'
          }}>{aba.icon}{aba.label}</button>
        ))}
      </div>

      {/* ABA GERAL */}
      {abaAtiva === 'geral' && (
        <div>
          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Store size={16} color="#ef4239" /> Informações do Estabelecimento</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nome do Estabelecimento *</label>
                <input value={form.nome || ''} onChange={e => setF('nome', e.target.value)} style={inputStyle} placeholder="Nome do seu restaurante" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao || ''} onChange={e => setF('descricao', e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} placeholder="Descreva seu estabelecimento..." />
              </div>
              <div>
                <label style={labelStyle}>Slug (URL)</label>
                <input value={form.slug || ''} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#555' }}>O slug não pode ser alterado</p>
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input value={form.email || ''} onChange={e => setF('email', e.target.value)} type="email" style={inputStyle} placeholder="contato@seurestaurante.com" />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={16} color="#ef4239" /> Endereço</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Endereço Completo</label>
                <input value={form.endereco || ''} onChange={e => setF('endereco', e.target.value)} style={inputStyle} placeholder="Rua, número, bairro" />
              </div>
              <div>
                <label style={labelStyle}>Cidade</label>
                <input value={form.cidade || ''} onChange={e => setF('cidade', e.target.value)} style={inputStyle} placeholder="São Paulo" />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <input value={form.estado || ''} onChange={e => setF('estado', e.target.value)} style={inputStyle} placeholder="SP" maxLength={2} />
              </div>
              <div>
                <label style={labelStyle}>CEP</label>
                <input value={form.cep || ''} onChange={e => setF('cep', e.target.value)} style={inputStyle} placeholder="00000-000" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA APARÊNCIA */}
      {abaAtiva === 'aparencia' && (
        <div>
          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Image size={16} color="#ef4239" /> Logo e Banner</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>URL da Logo</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {form.logo_url && <img src={form.logo_url} alt="logo" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid #292929' }} />}
                <input value={form.logo_url || ''} onChange={e => setF('logo_url', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label style={labelStyle}>URL do Banner</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {form.banner_url && <img src={form.banner_url} alt="banner" style={{ width: 80, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #292929' }} />}
                <input value={form.banner_url || ''} onChange={e => setF('banner_url', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Palette size={16} color="#ef4239" /> Cor Principal</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="color" value={form.cor_primaria || '#ef4239'} onChange={e => setF('cor_primaria', e.target.value)}
                style={{ width: 60, height: 40, borderRadius: 8, border: '1px solid #292929', background: 'none', cursor: 'pointer' }}
              />
              <input value={form.cor_primaria || '#ef4239'} onChange={e => setF('cor_primaria', e.target.value)}
                style={{ ...inputStyle, maxWidth: 120 }} placeholder="#ef4239"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                {['#ef4239', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'].map(cor => (
                  <button key={cor} onClick={() => setF('cor_primaria', cor)} style={{ width: 32, height: 32, borderRadius: '50%', background: cor, border: form.cor_primaria === cor ? '3px solid #fff' : 'none', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: form.cor_primaria + '11', border: '1px solid ' + form.cor_primaria + '44' }}>
              <p style={{ margin: 0, fontSize: 13, color: form.cor_primaria || '#ef4239', fontWeight: 600 }}>Prévia: botões e destaques aparecerão nesta cor no seu cardápio digital</p>
            </div>
          </div>
        </div>
      )}

      {/* ABA CONTATO */}
      {abaAtiva === 'contato' && (
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={16} color="#ef4239" /> Contato</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { key: 'telefone', label: 'Telefone / WhatsApp', placeholder: '(11) 99999-9999' },
              { key: 'email', label: 'E-mail de Contato', placeholder: 'contato@restaurante.com' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input value={(form as any)[f.key] || ''} onChange={e => setF(f.key, e.target.value)} style={inputStyle} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA HORÁRIOS */}
      {abaAtiva === 'horarios' && (
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} color="#ef4239" /> Horários de Funcionamento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Horário de Abertura</label>
              <input type="time" value={form.horario_abertura || '08:00'} onChange={e => setF('horario_abertura', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={labelStyle}>Horário de Fechamento</label>
              <input type="time" value={form.horario_fechamento || '22:00'} onChange={e => setF('horario_fechamento', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: 44, height: 24, background: form.aberto ? '#22c55e' : '#333', borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                onClick={() => setF('aberto', !form.aberto)}>
                <div style={{ position: 'absolute', top: 3, left: form.aberto ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 14, color: form.aberto ? '#22c55e' : '#888' }}>
                {form.aberto ? 'Estabelecimento Aberto' : 'Estabelecimento Fechado'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* ABA REDES SOCIAIS */}
      {abaAtiva === 'redes' && (
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={16} color="#ef4239" /> Redes Sociais e Site</h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { key: 'instagram', label: 'Instagram', placeholder: '@seurestaurante' },
              { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/seurestaurante' },
              { key: 'site', label: 'Site / Cardápio Digital', placeholder: 'https://seusite.com.br' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input value={(form as any)[f.key] || ''} onChange={e => setF(f.key, e.target.value)} style={inputStyle} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 16, background: '#111', borderRadius: 8, border: '1px solid #292929' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#888' }}>Link do seu Cardápio Digital</p>
            <p style={{ margin: 0, fontSize: 14, color: '#ef4239', fontWeight: 700 }}>
              dolcedolce.vigorepro.com.br/cardapio/{slug}
            </p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#888', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <ConfigContent />
    </Suspense>
  )
}
