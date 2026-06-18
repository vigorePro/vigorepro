'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Pencil, Trash2, MoreVertical, Eye, EyeOff, ArrowLeft, Star, X, Check, Loader2 } from 'lucide-react'

type Categoria = {
  id: string
  estabelecimento_id: string
  nome: string
  ordem: number
  banner_url: string | null
}

type Produto = {
  id: string
  estabelecimento_id: string
  categoria_id: string
  nome: string
  descricao: string
  preco: number
  imagem_url: string | null
  disponivel: boolean
  destaque: boolean
}

type FiltroAba = 'todos' | 'ativos' | 'inativos'

const PRECO_VAZIO: Produto = {
  id: '',
  estabelecimento_id: '',
  categoria_id: '',
  nome: '',
  descricao: '',
  preco: 0,
  imagem_url: null,
  disponivel: true,
  destaque: false,
}

function formatarPreco(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ModalProduto({
  produto,
  categorias,
  estabelecimentoId,
  onSalvar,
  onFechar,
}: {
  produto: Produto | null
  categorias: Categoria[]
  estabelecimentoId: string
  onSalvar: () => void
  onFechar: () => void
}) {
  const [form, setForm] = useState<Produto>(produto || { ...PRECO_VAZIO, estabelecimento_id: estabelecimentoId, categoria_id: categorias[0]?.id || '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Nome obrigatorio'); return }
    if (!form.categoria_id) { setErro('Selecione uma categoria'); return }
    setSalvando(true)
    setErro('')

    const dados = {
      estabelecimento_id: estabelecimentoId,
      categoria_id: form.categoria_id,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: form.preco,
      imagem_url: form.imagem_url || null,
      disponivel: form.disponivel,
      destaque: form.destaque,
    }

    if (form.id) {
      await supabase.from('produtos').update(dados).eq('id', form.id)
    } else {
      await supabase.from('produtos').insert(dados)
    }
    setSalvando(false)
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-bold text-gray-800">{form.id ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
            <select
              value={form.categoria_id}
              onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: X-Burguer Especial"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva o produto..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Preço (R$) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.preco}
              onChange={e => setForm(f => ({ ...f, preco: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL da Imagem</label>
            <input
              type="url"
              value={form.imagem_url || ''}
              onChange={e => setForm(f => ({ ...f, imagem_url: e.target.value || null }))}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.disponivel}
                onChange={e => setForm(f => ({ ...f, disponivel: e.target.checked }))}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-gray-600">Disponível</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm text-gray-600">Destaque</span>
            </label>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ backgroundColor: '#eb0029' }}
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {form.id ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCategoria({
  categoria,
  estabelecimentoId,
  ordemMaxima,
  onSalvar,
  onFechar,
}: {
  categoria: Categoria | null
  estabelecimentoId: string
  ordemMaxima: number
  onSalvar: () => void
  onFechar: () => void
}) {
  const [nome, setNome] = useState(categoria?.nome || '')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    if (categoria?.id) {
      await supabase.from('categorias').update({ nome: nome.trim() }).eq('id', categoria.id)
    } else {
      await supabase.from('categorias').insert({
        estabelecimento_id: estabelecimentoId,
        nome: nome.trim(),
        ordem: ordemMaxima + 1,
      })
    }
    setSalvando(false)
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-bold text-gray-800">{categoria ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome da categoria"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onFechar} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex-1 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2" style={{ backgroundColor: '#eb0029' }}>
              {salvando ? <Loader2 size={14} className="animate-spin" /> : null}
              {categoria ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CardapioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug') || ''

  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas')
  const [filtro, setFiltro] = useState<FiltroAba>('todos')
  const [loading, setLoading] = useState(true)
  const [modalProduto, setModalProduto] = useState<Produto | null | 'novo'>(null)
  const [modalCategoria, setModalCategoria] = useState<Categoria | null | 'nova'>(null)
  const [deletando, setDeletando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!slug) return
    const { data: est } = await supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
    if (!est) { setLoading(false); return }
    setEstabelecimentoId(est.id)

    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categorias').select('*').eq('estabelecimento_id', est.id).order('ordem'),
      supabase.from('produtos').select('*').eq('estabelecimento_id', est.id).order('nome'),
    ])
    setCategorias(cats || [])
    setProdutos(prods || [])
    setLoading(false)
  }, [slug])

  useEffect(() => { carregar() }, [carregar])

  const toggleDisponivel = async (produto: Produto) => {
    await supabase.from('produtos').update({ disponivel: !produto.disponivel }).eq('id', produto.id)
    setProdutos(prev => prev.map(p => p.id === produto.id ? { ...p, disponivel: !p.disponivel } : p))
  }

  const deletarProduto = async (id: string) => {
    if (!confirm('Excluir este produto?')) return
    setDeletando(id)
    await supabase.from('produtos').delete().eq('id', id)
    setProdutos(prev => prev.filter(p => p.id !== id))
    setDeletando(null)
  }

  const deletarCategoria = async (id: string) => {
    const temProdutos = produtos.some(p => p.categoria_id === id)
    if (temProdutos) { alert('Remova os produtos desta categoria antes de excluí-la.'); return }
    if (!confirm('Excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id)
    setCategorias(prev => prev.filter(c => c.id !== id))
    if (categoriaSelecionada === id) setCategoriaSelecionada('todas')
  }

  const produtosFiltrados = produtos.filter(p => {
    if (categoriaSelecionada !== 'todas' && p.categoria_id !== categoriaSelecionada) return false
    if (filtro === 'ativos') return p.disponivel
    if (filtro === 'inativos') return !p.disponivel
    return true
  })

  const categoriasFiltradas = categoriaSelecionada === 'todas'
    ? categorias
    : categorias.filter(c => c.id === categoriaSelecionada)

  const totalProdutos = produtosFiltrados.length
  const ordemMaxima = Math.max(0, ...categorias.map(c => c.ordem || 0))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.push('/dashboard?slug=' + slug)} className="text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-800">Gestão de Cardápio</h1>
          <p className="text-xs text-gray-400">{totalProdutos} produto{totalProdutos !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModalProduto('novo')}
          className="ml-auto flex items-center gap-1.5 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm hover:opacity-90 transition"
          style={{ backgroundColor: '#eb0029' }}
        >
          <Plus size={15} />
          Novo Produto
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Categorias */}
        <div className="w-48 flex-shrink-0 bg-white border-r flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Setores</span>
            <button
              onClick={() => setModalCategoria('nova')}
              className="text-xs text-white px-2 py-0.5 rounded-full font-medium hover:opacity-90 transition"
              style={{ backgroundColor: '#eb0029' }}
            >
              + Nova
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => setCategoriaSelecionada('todas')}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition ${categoriaSelecionada === 'todas' ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span>Todos</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoriaSelecionada === 'todas' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                {produtos.length}
              </span>
            </button>
            {categorias.map(cat => {
              const count = produtos.filter(p => p.categoria_id === cat.id).length
              const ativa = categoriaSelecionada === cat.id
              return (
                <div key={cat.id} className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition ${ativa ? 'bg-red-50' : 'hover:bg-gray-50'}`} onClick={() => setCategoriaSelecionada(cat.id)}>
                  <span className={`text-sm truncate flex-1 ${ativa ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{cat.nome}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={e => { e.stopPropagation(); setModalCategoria(cat) }} className="text-gray-400 hover:text-blue-600 p-0.5">
                      <Pencil size={11} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deletarCategoria(cat.id) }} className="text-gray-400 hover:text-red-600 p-0.5">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full flex-shrink-0 ${ativa ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-y-auto">
          {/* Filtros */}
          <div className="sticky top-0 z-10 bg-white border-b px-4 py-2 flex items-center gap-2">
            {(['todos', 'ativos', 'inativos'] as FiltroAba[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${filtro === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={filtro === f ? { backgroundColor: '#eb0029' } : {}}
              >
                {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{totalProdutos} resultado{totalProdutos !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista por categoria */}
          <div className="p-4 space-y-6">
            {categoriasFiltradas.map(cat => {
              const prodsCat = produtosFiltrados.filter(p => p.categoria_id === cat.id)
              if (prodsCat.length === 0 && filtro !== 'todos') return null
              return (
                <div key={cat.id}>
                  {/* Header da categoria */}
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-bold text-gray-800">{cat.nome}</h2>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{prodsCat.length} produto{prodsCat.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => { setCategoriaSelecionada(cat.id); setModalProduto('novo') }}
                      className="ml-auto text-xs text-red-600 hover:text-red-800 flex items-center gap-0.5 font-medium"
                    >
                      <Plus size={12} /> Produto
                    </button>
                  </div>
                  {/* Grid de produtos */}
                  {prodsCat.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                      Nenhum produto nesta categoria
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {prodsCat.map(prod => (
                        <div
                          key={prod.id}
                          className={`flex gap-3 p-3 border rounded-xl bg-white hover:shadow-md transition-all ${!prod.disponivel ? 'opacity-60' : ''}`}
                        >
                          {/* Imagem */}
                          <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {prod.imagem_url ? (
                              <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">sem foto</div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-sm font-medium text-gray-800 truncate leading-tight">{prod.nome}</h4>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                {prod.destaque && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                                <button onClick={() => setModalProduto(prod)} className="text-gray-400 hover:text-blue-600 p-0.5 transition">
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => toggleDisponivel(prod)}
                                  className={`p-0.5 transition ${prod.disponivel ? 'text-green-600 hover:text-gray-400' : 'text-gray-400 hover:text-green-600'}`}
                                  title={prod.disponivel ? 'Desativar' : 'Ativar'}
                                >
                                  {prod.disponivel ? <Eye size={13} /> : <EyeOff size={13} />}
                                </button>
                                <button
                                  onClick={() => deletarProduto(prod.id)}
                                  disabled={deletando === prod.id}
                                  className="text-gray-400 hover:text-red-600 p-0.5 transition"
                                >
                                  {deletando === prod.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                </button>
                              </div>
                            </div>
                            {prod.descricao && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{prod.descricao}</p>
                            )}
                            <p className="text-sm font-semibold mt-1" style={{ color: '#eb0029' }}>
                              {formatarPreco(prod.preco)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {categoriasFiltradas.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Nenhuma categoria criada ainda.</p>
                <button
                  onClick={() => setModalCategoria('nova')}
                  className="mt-3 text-sm text-white px-4 py-2 rounded-full font-medium hover:opacity-90 transition"
                  style={{ backgroundColor: '#eb0029' }}
                >
                  Criar primeira categoria
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {(modalProduto === 'novo' || (modalProduto && modalProduto !== 'novo')) && estabelecimentoId && (
        <ModalProduto
          produto={modalProduto === 'novo' ? null : modalProduto as Produto}
          categorias={categorias}
          estabelecimentoId={estabelecimentoId}
          onSalvar={() => { setModalProduto(null); carregar() }}
          onFechar={() => setModalProduto(null)}
        />
      )}
      {(modalCategoria === 'nova' || (modalCategoria && modalCategoria !== 'nova')) && estabelecimentoId && (
        <ModalCategoria
          categoria={modalCategoria === 'nova' ? null : modalCategoria as Categoria}
          estabelecimentoId={estabelecimentoId}
          ordemMaxima={ordemMaxima}
          onSalvar={() => { setModalCategoria(null); carregar() }}
          onFechar={() => setModalCategoria(null)}
        />
      )}
    </div>
  )
}

export default function CardapioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    }>
      <CardapioContent />
    </Suspense>
  )
}
