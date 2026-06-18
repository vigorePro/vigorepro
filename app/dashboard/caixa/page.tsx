'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { RefreshCw, Filter, CheckCircle, XCircle, LayoutList } from 'lucide-react'

interface Caixa {
  id: string
  abertura: string
  fechamento: string | null
  usuario_abertura: string
  saldo_inicial: number
  saldo_final: number | null
  status: 'aberto' | 'fechado'
}

function CaixaContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const supabase = createClientComponentClient()
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'listagem'|'cancelamentos'>('listagem')
  const [estabId, setEstabId] = useState<string | null>(null)
  const [abrindo, setAbrindo] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase.from('estabelecimentos').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setEstabId(data.id) })
  }, [slug])

  const abrirCaixa = async () => {
    if (!estabId) return
    setAbrindo(true)
    // Simulacao: adicionar registro de caixa aberto
    const novoCaixa: Caixa = {
      id: Date.now().toString(),
      abertura: new Date().toISOString(),
      fechamento: null,
      usuario_abertura: 'Admin',
      saldo_inicial: 0,
      saldo_final: null,
      status: 'aberto'
    }
    setCaixas(prev => [novoCaixa, ...prev])
    setAbrindo(false)
  }

  const fmtData = (d: string) => new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const fmtMoeda = (v: number | null) => v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '-'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
      {/* Topbar do header da pagina */}
      <div className="border-b px-6 py-0 flex items-center gap-0" style={{ borderColor: '#2a2a2a' }}>
        <button
          onClick={() => setAbaAtiva('listagem')}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: abaAtiva === 'listagem' ? '#eb0029' : 'transparent',
            color: abaAtiva === 'listagem' ? '#ffffff' : '#6b7280'
          }}>
          <LayoutList size={15} />
          Listagem de Caixa
        </button>
        <button
          onClick={() => setAbaAtiva('cancelamentos')}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: abaAtiva === 'cancelamentos' ? '#eb0029' : 'transparent',
            color: abaAtiva === 'cancelamentos' ? '#ffffff' : '#6b7280'
          }}>
          <XCircle size={15} />
          Cancelamentos
        </button>
      </div>

      <div className="p-6">
        {abaAtiva === 'listagem' && (
          <>
            {/* Ações */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={abrirCaixa}
                  disabled={abrindo}
                  className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                  style={{ backgroundColor: '#16a34a' }}>
                  <CheckCircle size={15} />
                  {abrindo ? 'Abrindo...' : 'Abrir Caixa'}
                </button>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a', color: '#6b7280' }}>
                  <Filter size={14} />
                  <span>Filtros:</span>
                  <select className="bg-transparent outline-none text-sm" style={{ color: '#9ca3af' }}>
                    <option>Todos os usuários</option>
                  </select>
                </div>
              </div>
              <button className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a', color: '#9ca3af' }}>
                <RefreshCw size={14} />
                Atualizar
              </button>
            </div>

            {/* Tabela */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#2a2a2a' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
                    {['Ações', 'Caixa', 'Data/Hora Abertura', 'Data/Hora Fechamento', 'Usuário Abertura', 'Usuário Fechamento', 'Saldo Final', 'Conf. Saldo Final', 'Quebra de Caixa', 'Operações'].map(col => (
                      <th key={col} className="text-left px-4 py-3 text-xs font-semibold uppercase"
                        style={{ color: '#6b7280' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {caixas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-sm" style={{ color: '#4b5563' }}>
                        Nenhum caixa encontrado
                      </td>
                    </tr>
                  ) : caixas.map((cx, i) => (
                    <tr key={cx.id} className="border-b" style={{ borderColor: '#2a2a2a' }}>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cx.status === 'aberto' ? 'text-green-400' : 'text-gray-400'}`}
                          style={{ backgroundColor: cx.status === 'aberto' ? '#0f2018' : '#1a1a1a' }}>
                          {cx.status === 'aberto' ? 'Aberto' : 'Fechado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">Caixa {i + 1}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{fmtData(cx.abertura)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{cx.fechamento ? fmtData(cx.fechamento) : '-'}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>{cx.usuario_abertura}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>-</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{fmtMoeda(cx.saldo_final)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>-</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>-</td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#9ca3af' }}>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: '#2a2a2a', color: '#6b7280' }}>
                <div className="flex items-center gap-2">
                  <span>Por página:</span>
                  <select className="bg-transparent border rounded px-2 py-1 outline-none" style={{ borderColor: '#374151', color: '#9ca3af' }}>
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <span>Mostrando 1-0 de {caixas.length}</span>
              </div>
            </div>
          </>
        )}

        {abaAtiva === 'cancelamentos' && (
          <div className="rounded-xl border py-16 text-center" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}>
            <XCircle size={40} className="mx-auto mb-3" style={{ color: '#374151' }} />
            <p style={{ color: '#6b7280' }}>Nenhum cancelamento registrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CaixaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: '#111111' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#eb0029' }}></div></div>}>
      <CaixaContent />
    </Suspense>
  )
}

