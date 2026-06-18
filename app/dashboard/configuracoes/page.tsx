'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Save, Store, Phone, MapPin, Clock, Upload, CheckCircle } from 'lucide-react'

interface Estabelecimento {
  id: string
  slug: string
  nome: string
  telefone: string
  endereco: string
  cidade: string
  estado: string
  logo_url: string
  banner_url: string
  horario_abertura: string
  horario_fechamento: string
  ativo: boolean
}

function ConfiguracoesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()

  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [uploadandoLogo, setUploadandoLogo] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    logo_url: '',
    horario_abertura: '',
    horario_fechamento: '',
  })

  useEffect(() => {
    if (!slug) return
    fetchEstabelecimento()
  }, [slug])

  const fetchEstabelecimento = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('estabelecimentos')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!error && data) {
      setEstabelecimento(data)
      setForm({
        nome: data.nome || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        logo_url: data.logo_url || '',
        horario_abertura: data.horario_abertura || '08:00',
        horario_fechamento: data.horario_fechamento || '22:00',
      })
    }
    setCarregando(false)
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !estabelecimento) return

    setUploadandoLogo(true)
    const ext = file.name.split('.').pop()
    const filename = `logo-${estabelecimento.slug}-${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('assets')
      .upload(filename, file, { upsert: true })

    if (!error && data) {
      const { data: publicData } = supabase.storage.from('assets').getPublicUrl(filename)
      handleChange('logo_url', publicData.publicUrl)
    }
    setUploadandoLogo(false)
  }

  const handleSalvar = async () => {
    if (!estabelecimento) return
    setSalvando(true)

    const { error } = await supabase
      .from('estabelecimentos')
      .update({
        nome: form.nome,
        telefone: form.telefone,
        endereco: form.endereco,
        cidade: form.cidade,
        estado: form.estado,
        logo_url: form.logo_url,
        horario_abertura: form.horario_abertura,
        horario_fechamento: form.horario_fechamento,
      })
      .eq('id', estabelecimento.id)

    setSalvando(false)
    if (!error) {
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard?slug=${slug}`)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        </div>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-60"
          style={{ backgroundColor: salvo ? '#16a34a' : '#eb0029' }}
        >
          {salvo ? <CheckCircle size={16} /> : <Save size={16} />}
          {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Logo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} style={{ color: '#eb0029' }} />
            <h2 className="font-semibold text-gray-900">Identidade Visual</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store size={28} className="text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Logo do estabelecimento</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-medium px-3 py-2 rounded-lg w-fit transition"
                  style={{ backgroundColor: '#eb0029' }}>
                  {uploadandoLogo ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploadandoLogo ? 'Enviando...' : 'Fazer upload'}
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                </label>
                <input
                  type="text"
                  placeholder="Ou cole a URL da imagem..."
                  value={form.logo_url}
                  onChange={(e) => handleChange('logo_url', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-red-400 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Informações básicas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} style={{ color: '#eb0029' }} />
            <h2 className="font-semibold text-gray-900">Informações do Estabelecimento</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome do estabelecimento</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Dolce & Dolce"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} style={{ color: '#eb0029' }} />
            <h2 className="font-semibold text-gray-900">Endereço</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço completo</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua, número, bairro..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  placeholder="São Paulo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Estado</label>
                <input
                  type="text"
                  value={form.estado}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Horários */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} style={{ color: '#eb0029' }} />
            <h2 className="font-semibold text-gray-900">Horário de Funcionamento</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Abertura</label>
              <input
                type="time"
                value={form.horario_abertura}
                onChange={(e) => handleChange('horario_abertura', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Fechamento</label>
              <input
                type="time"
                value={form.horario_fechamento}
                onChange={(e) => handleChange('horario_fechamento', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-red-400"
              />
            </div>
          </div>
        </div>

        {/* Botão salvar */}
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60"
          style={{ backgroundColor: salvo ? '#16a34a' : '#eb0029' }}
        >
          {salvando ? 'Salvando...' : salvo ? '✓ Configurações salvas!' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <ConfiguracoesContent />
    </Suspense>
  )
}

