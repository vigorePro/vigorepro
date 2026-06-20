'use client'

import { useState, useEffect } from 'react'

interface Template {
  id: string
  trigger_keywords: string[]
  response_text: string
  categoria: string
  prioridade: number
  ativo: boolean
  criado_em: string
}

export default function MelDashboard() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Template | null>(null)
  const [form, setForm] = useState({
    trigger_keywords: '',
    response_text: '',
    categoria: 'geral',
    prioridade: 0,
  })

  const categorias = ['saudacao', 'horario', 'pagamento', 'entrega', 'cardapio', 'endereco', 'produto', 'geral']

  useEffect(() => {
    carregarTemplates()
  }, [])

  async function carregarTemplates() {
    setLoading(true)
    const res = await fetch('/api/mel/templates')
    const data = await res.json()
    setTemplates(data.templates || [])
    setLoading(false)
  }

  async function salvarTemplate() {
    const keywords = form.trigger_keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    if (keywords.length === 0 || !form.response_text) {
      alert('Preencha as palavras-chave e a resposta!')
      return
    }

    const payload = {
      trigger_keywords: keywords,
      response_text: form.response_text,
      categoria: form.categoria,
      prioridade: form.prioridade,
    }

    if (editando) {
      await fetch('/api/mel/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando.id, ...payload }),
      })
    } else {
      await fetch('/api/mel/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    setShowForm(false)
    setEditando(null)
    setForm({ trigger_keywords: '', response_text: '', categoria: 'geral', prioridade: 0 })
    carregarTemplates()
  }

  async function toggleAtivo(template: Template) {
    await fetch('/api/mel/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: template.id, ativo: !template.ativo }),
    })
    carregarTemplates()
  }

  async function deletarTemplate(id: string) {
    if (!confirm('Tem certeza que quer deletar este template?')) return
    await fetch(`/api/mel/templates?id=${id}`, { method: 'DELETE' })
    carregarTemplates()
  }

  function editarTemplate(t: Template) {
    setEditando(t)
    setForm({
      trigger_keywords: t.trigger_keywords.join(', '),
      response_text: t.response_text,
      categoria: t.categoria,
      prioridade: t.prioridade,
    })
    setShowForm(true)
  }

  const cores: Record<string, string> = {
    saudacao: 'bg-green-100 text-green-800',
    horario: 'bg-blue-100 text-blue-800',
    pagamento: 'bg-yellow-100 text-yellow-800',
    entrega: 'bg-orange-100 text-orange-800',
    cardapio: 'bg-purple-100 text-purple-800',
    endereco: 'bg-pink-100 text-pink-800',
    produto: 'bg-indigo-100 text-indigo-800',
    geral: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              🐝 MEL — Templates de Atendimento
            </h1>
            <p className="text-gray-500 mt-1">
              Respostas automticas sem usar IA • {templates.filter(t => t.ativo).length} ativos de {templates.length} total
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditando(null); setForm({ trigger_keywords: '', response_text: '', categoria: 'geral', prioridade: 0 }) }}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition"
          >
            + Novo Template
          </button>
        </div>

        {/* Economia estimada */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Templates Ativos</p>
            <p className="text-3xl font-bold text-green-600">{templates.filter(t => t.ativo).length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Economia Estimada</p>
            <p className="text-3xl font-bold text-amber-500">~86%</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Custo por Template</p>
            <p className="text-3xl font-bold text-blue-600">R$ 0,00</p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Template' : 'Novo Template'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Palavras-chave (separe por virgula)
                </label>
                <input
                  type="text"
                  value={form.trigger_keywords}
                  onChange={e => setForm({ ...form, trigger_keywords: e.target.value })}
                  placeholder="oi, ola, bom dia, boa tarde"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Resposta</label>
                <textarea
                  value={form.response_text}
                  onChange={e => setForm({ ...form, response_text: e.target.value })}
                  placeholder="Ola! Como posso ajudar?"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  >
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Prioridade (maior = primeiro)</label>
                  <input
                    type="number"
                    value={form.prioridade}
                    onChange={e => setForm({ ...form, prioridade: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvarTemplate} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-lg transition">
                  {editando ? 'Salvar Alteracoes' : 'Criar Template'}
                </button>
                <button onClick={() => { setShowForm(false); setEditando(null) }} className="text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum template criado ainda.</div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className={`bg-white rounded-xl border p-4 shadow-sm transition ${t.ativo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cores[t.categoria] || cores.geral}`}>
                        {t.categoria}
                      </span>
                      <span className="text-xs text-gray-400">Prioridade: {t.prioridade}</span>
                      {!t.ativo && <span className="text-xs text-red-400 font-medium">Desativado</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.trigger_keywords.map(k => (
                        <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-mono">
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{t.response_text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleAtivo(t)}
                      className={`w-10 h-6 rounded-full transition-colors ${t.ativo ? 'bg-green-400' : 'bg-gray-300'}`}
                      title={t.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${t.ativo ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <button onClick={() => editarTemplate(t)} className="text-gray-400 hover:text-blue-500 p-1 transition" title="Editar">
                      ✏️
                    </button>
                    <button onClick={() => deletarTemplate(t.id)} className="text-gray-400 hover:text-red-500 p-1 transition" title="Deletar">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
