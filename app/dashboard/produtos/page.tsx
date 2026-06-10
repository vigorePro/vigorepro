'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Categoria = { id: string; nome: string; ordem: number }
type Produto = { id: string; nome: string; descricao: string; preco: number; imagem_url: string; disponivel: boolean; categoria_id: string; ordem: number }

export default function ProdutosPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', imagem_url: '', disponivel: true, categoria_id: '', ordem: '0' })

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin'); return }
    const slug = typeof window !== 'undefined' ? window.location.hostname.replace('.vigorepro.com.br', '') : ''
    const { data: est } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (!est) { setCarregando(false); return }
    setEstabelecimentoId(est.id)
    const { data: cats } = await supabase.from('categorias').select('*').eq('estabelecimento_id', est.id).order('ordem')
    const { data: prods } = await supabase.from('produtos').select('*').eq('estabelecimento_id', est.id).order('ordem')
    setCategorias(cats || [])
    setProdutos(prods || [])
    setCarregando(false)
  }

  async function uploadImagem(file: File): Promise<string | null> {
    setEnviandoImagem(true)
    const ext = file.name.split('.').pop()
    const path = `produtos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setMensagem('Erro no upload: ' + error.message); setEnviandoImagem(false); return null }
    const { data } = supabase.storage.from('assets').getPublicUrl(path)
    setEnviandoImagem(false)
    return data.publicUrl
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImagem(file)
    if (url) setForm(f => ({ ...f, imagem_url: url }))
  }

  function abrirNovo() {
    setEditando(null)
    setMensagem('')
    setForm({ nome: '', descricao: '', preco: '', imagem_url: '', disponivel: true, categoria_id: categorias[0]?.id || '', ordem: '0' })
    setModalAberto(true)
  }

  function abrirEdicao(p: Produto) {
    setEditando(p)
    setMensagem('')
    setForm({ nome: p.nome, descricao: p.descricao || '', preco: p.preco.toString(), imagem_url: p.imagem_url || '', disponivel: p.disponivel, categoria_id: p.categoria_id || '', ordem: p.ordem?.toString() || '0' })
    setModalAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const dados = { nome: form.nome.trim(), descricao: form.descricao.trim(), preco: parseFloat(form.preco), imagem_url: form.imagem_url.trim() || null, disponivel: form.disponivel, categoria_id: form.categoria_id || null, ordem: parseInt(form.ordem) || 0, estabelecimento_id: estabelecimentoId }
    if (editando) {
      const { error } = await supabase.from('produtos').update(dados).eq('id', editando.id)
      if (error) setMensagem('Erro: ' + error.message)
      else { setModalAberto(false); setMensagem('Produto atualizado!'); carregarDados() }
    } else {
      const { error } = await supabase.from('produtos').insert(dados)
      if (error) setMensagem('Erro: ' + error.message)
      else { setModalAberto(false); setMensagem('Produto criado!'); carregarDados() }
    }
    setSalvando(false)
  }

  async function toggleDisponivel(p: Produto) {
    await supabase.from('produtos').update({ disponivel: !p.disponivel }).eq('id', p.id)
    carregarDados()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    carregarDados()
  }

  if (carregando) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="bg-[#161616] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-white">Gerenciar Produtos</h1>
          <span className="bg-amber-600/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">{produtos.length} produtos</span>
        </div>
        <button onClick={abrirNovo} className="bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Novo Produto
        </button>
      </header>
      {mensagem && <div className="max-w-4xl mx-auto px-6 pt-4"><div className="bg-green-900/30 border border-green-700/50 text-green-400 px-4 py-3 rounded-xl text-sm">{mensagem}</div></div>}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {categorias.map(cat => {
          const prodsCat = produtos.filter(p => p.categoria_id === cat.id)
          if (prodsCat.length === 0) return null
          return (
            <div key={cat.id} className="mb-8">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-widest mb-3">{cat.nome}</h2>
              <div className="flex flex-col divide-y divide-white/5 bg-[#161616] rounded-2xl overflow-hidden border border-white/5">
                {prodsCat.map(produto => (
                  <div key={produto.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                      {produto.imagem_url ? <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🎂</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{produto.nome}</p>
                      {produto.descricao && <p className="text-gray-500 text-xs truncate">{produto.descricao}</p>}
                      <p className="text-amber-400 text-sm font-bold mt-0.5">R$ {produto.preco.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button" onClick={() => toggleDisponivel(produto)} className={`relative w-10 h-5 rounded-full transition-colors ${produto.disponivel ? 'bg-amber-600' : 'bg-white/10'}`} title={produto.disponivel ? 'Disponível' : 'Indisponível'}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${produto.disponivel ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <button onClick={() => abrirEdicao(produto)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => excluir(produto.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-900/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {produtos.filter(p => !p.categoria_id).length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Sem categoria</h2>
            <div className="flex flex-col divide-y divide-white/5 bg-[#161616] rounded-2xl overflow-hidden border border-white/5">
              {produtos.filter(p => !p.categoria_id).map(produto => (
                <div key={produto.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                    {produto.imagem_url ? <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🎂</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{produto.nome}</p>
                    <p className="text-amber-400 text-sm font-bold mt-0.5">R$ {produto.preco.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={() => toggleDisponivel(produto)} className={`relative w-10 h-5 rounded-full transition-colors ${produto.disponivel ? 'bg-amber-600' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${produto.disponivel ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => abrirEdicao(produto)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => excluir(produto.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-900/30 text-gray-400 hover:text-red-400 flex items-center justify-center transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {produtos.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-gray-500 mb-4">Nenhum produto cadastrado ainda</p>
            <button onClick={abrirNovo} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold">Adicionar primeiro produto</button>
          </div>
        )}
      </main>
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalAberto(false)} />
          <div className="relative w-full max-w-lg bg-[#161616] rounded-2xl border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setModalAberto(false)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={salvar} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Nome *</label>
                <input type="text" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition" placeholder="Ex: Torta de frango" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition resize-none" placeholder="Descreva o produto..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Preço (R$) *</label>
                  <input type="number" required step="0.01" min="0" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Categoria</label>
                  <select value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition">
                    <option value="">Sem categoria</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Imagem do Produto</label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                {form.imagem_url ? (
                  <div className="relative group w-full h-40 rounded-xl overflow-hidden border border-white/10">
                    <img src={form.imagem_url} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Trocar</button>
                      <button type="button" onClick={() => setForm(f => ({ ...f, imagem_url: '' }))} className="bg-red-600/60 hover:bg-red-600/80 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Remover</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={enviandoImagem} className="w-full h-32 border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-amber-400 transition disabled:opacity-50">
                    {enviandoImagem ? (
                      <><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm">Enviando...</span></>
                    ) : (
                      <><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-sm font-medium">Clique para adicionar foto</span><span className="text-xs">JPG, PNG ou WebP</span></>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-semibold">Disponível no cardápio</p>
                  <p className="text-gray-500 text-xs">Visível para clientes</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, disponivel: !f.disponivel }))} className={`relative w-12 h-6 rounded-full transition-colors ${form.disponivel ? 'bg-amber-600' : 'bg-white/10'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.disponivel ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              {mensagem && <p className="text-red-400 text-sm">{mensagem}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-xl font-bold transition">Cancelar</button>
                <button type="submit" disabled={salvando || enviandoImagem} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition">{salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar Produto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
