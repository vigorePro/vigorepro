'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Clock, ChefHat, Users, BarChart3, Star, RefreshCw, Bike, UtensilsCrossed, Package, Zap, AlertCircle, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Filter, Calendar } from 'lucide-react'

type Periodo = 'hoje' | 'semana' | 'mes'

function DashContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [estabelecimento, setEstabelecimento] = useState<any>(null)
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [stats, setStats] = useState({
    receitaAtual: 0, receitaAnterior: 0,
    pedidosAtual: 0, pedidosAnterior: 0,
    ticketMedio: 0, ticketMedioAnterior: 0,
    emPreparo: 0, mesas: 0, clientes: 0,
    receitaMes: 0, pedidosMes: 0,
    delivery: 0, mesa: 0, balcao: 0,
  })
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([])
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<any[]>([])
  const [graficoDados, setGraficoDados] = useState<{label: string, total: number}[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ultimaAtt, setUltimaAtt] = useState(new Date())

  const fetchDados = useCallback(async () => {
    if (!slug) return
    try {
      const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      if (!est) return
      setEstabelecimento(est)

      const agora = new Date()
      const inicioHoje = new Date(agora); inicioHoje.setHours(0,0,0,0)
      const fimHoje = new Date(agora); fimHoje.setHours(23,59,59,999)
      const inicioOntem = new Date(agora); inicioOntem.setDate(agora.getDate()-1); inicioOntem.setHours(0,0,0,0)
      const fimOntem = new Date(agora); fimOntem.setDate(agora.getDate()-1); fimOntem.setHours(23,59,59,999)
      const inicioSemana = new Date(agora); inicioSemana.setDate(agora.getDate()-6); inicioSemana.setHours(0,0,0,0)
      const inicioSemanaAnt = new Date(agora); inicioSemanaAnt.setDate(agora.getDate()-13); inicioSemanaAnt.setHours(0,0,0,0)
      const fimSemanaAnt = new Date(agora); fimSemanaAnt.setDate(agora.getDate()-7); fimSemanaAnt.setHours(23,59,59,999)
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
      const inicioMesAnt = new Date(agora.getFullYear(), agora.getMonth()-1, 1)
      const fimMesAnt = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999)
      const inicio30dias = new Date(agora); inicio30dias.setDate(agora.getDate()-30)

      let inicioAtual: Date, fimAtual: Date, inicioAnterior: Date, fimAnterior: Date
      if (periodo === 'hoje') {
        inicioAtual = inicioHoje; fimAtual = fimHoje
        inicioAnterior = inicioOntem; fimAnterior = fimOntem
      } else if (periodo === 'semana') {
        inicioAtual = inicioSemana; fimAtual = agora
        inicioAnterior = inicioSemanaAnt; fimAnterior = fimSemanaAnt
      } else {
        inicioAtual = inicioMes; fimAtual = agora
        inicioAnterior = inicioMesAnt; fimAnterior = fimMesAnt
      }

      const [pedAtual, pedAnterior, pedMes, pedRecentes, pedGrafico, clientes, mesasData] = await Promise.all([
        supabase.from('pedidos').select('total,status,tipo').eq('estabelecimento_id', est.id).gte('criado_em', inicioAtual.toISOString()).lte('criado_em', fimAtual.toISOString()),
        supabase.from('pedidos').select('total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioAnterior.toISOString()).lte('criado_em', fimAnterior.toISOString()),
        supabase.from('pedidos').select('total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioMes.toISOString()).not('status','eq','cancelado'),
        supabase.from('pedidos').select('*').eq('estabelecimento_id', est.id).order('criado_em',{ascending:false}).limit(6),
        supabase.from('pedidos').select('criado_em,total,status').eq('estabelecimento_id', est.id).gte('criado_em', inicioAtual.toISOString()).lte('criado_em', fimAtual.toISOString()).not('status','eq','cancelado'),
        supabase.from('clientes').select('id',{count:'exact'}).eq('estabelecimento_id', est.id),
        supabase.from('mesas').select('status').eq('estabelecimento_id', est.id).eq('status','ocupada'),
      ])

      const validos = (pedAtual.data||[]).filter((p:any)=>p.status!=='cancelado')
      const validosAnt = (pedAnterior.data||[]).filter((p:any)=>p.status!=='cancelado')
      const receitaAtual = validos.reduce((s:number,p:any)=>s+(p.total||0),0)
      const receitaAnterior = validosAnt.reduce((s:number,p:any)=>s+(p.total||0),0)
      const pedidosAtual = validos.length
      const pedidosAnterior = validosAnt.length
      const ticketMedio = pedidosAtual > 0 ? receitaAtual/pedidosAtual : 0
      const ticketMedioAnterior = pedidosAnterior > 0 ? receitaAnterior/pedidosAnterior : 0
      const emPreparo = (pedAtual.data||[]).filter((p:any)=>['recebido','em_preparo','pronto'].includes(p.status)).length
      const receitaMes = (pedMes.data||[]).reduce((s:number,p:any)=>s+(p.total||0),0)
      const delivery = validos.filter((p:any)=>p.tipo==='delivery').length
      const mesaPed = validos.filter((p:any)=>p.tipo==='mesa').length
      const balcao = validos.filter((p:any)=>!p.tipo||p.tipo==='balcao').length

      setStats({
        receitaAtual, receitaAnterior,
        pedidosAtual, pedidosAnterior,
        ticketMedio, ticketMedioAnterior,
        emPreparo,
        mesas: mesasData.data?.length||0,
        clientes: clientes.count||0,
        receitaMes, pedidosMes: pedMes.data?.length||0,
        delivery, mesa: mesaPed, balcao,
      })

      // Build grafico
      const pedGrafData = pedGrafico.data||[]
      if (periodo === 'hoje') {
        const horas: Record<string,number> = {}
        for (let h=0; h<24; h++) horas[h+'h']= 0
        pedGrafData.forEach((p:any)=>{
          const h = new Date(p.criado_em).getHours()
          horas[h+'h'] = (horas[h+'h']||0)+(p.total||0)
        })
        setGraficoDados(Object.entries(horas).map(([label,total])=>({label,total})))
      } else if (periodo === 'semana') {
        const dias: Record<string,number> = {}
        for (let i=6; i>=0; i--) {
          const d = new Date(agora); d.setDate(agora.getDate()-i)
          const key = d.toLocaleDateString('pt-BR',{weekday:'short'})
          dias[key]=0
        }
        pedGrafData.forEach((p:any)=>{
          const key = new Date(p.criado_em).toLocaleDateString('pt-BR',{weekday:'short'})
          if (dias[key]!==undefined) dias[key]=(dias[key]||0)+(p.total||0)
        })
        setGraficoDados(Object.entries(dias).map(([label,total])=>({label,total})))
      } else {
        const semanas: Record<string,number> = {'S1':0,'S2':0,'S3':0,'S4':0}
        pedGrafData.forEach((p:any)=>{
          const dia = new Date(p.criado_em).getDate()
          const s = dia<=7?'S1':dia<=14?'S2':dia<=21?'S3':'S4'
          semanas[s]=(semanas[s]||0)+(p.total||0)
        })
        setGraficoDados(Object.entries(semanas).map(([label,total])=>({label,total})))
      }

      setPedidosRecentes(pedRecentes.data||[])

      // Produtos mais vendidos
      const todosItens: Record<string,{nome:string,qtd:number,total:number}> = {}
      ;(pedRecentes.data||[]).forEach((p:any)=>{
        if (p.itens) {
          try {
            const itens = typeof p.itens==='string'?JSON.parse(p.itens):p.itens
            itens.forEach((it:any)=>{
              const n = it.nome||it.name||'?'
              if (!todosItens[n]) todosItens[n]={nome:n,qtd:0,total:0}
              todosItens[n].qtd+=(it.quantidade||it.qty||1)
              todosItens[n].total+=(it.preco||it.price||0)*(it.quantidade||it.qty||1)
            })
          } catch {}
        }
      })
      setProdutosMaisVendidos(Object.values(todosItens).sort((a,b)=>b.qtd-a.qtd).slice(0,5))
      setUltimaAtt(new Date())
    } catch(e) { console.error(e) } finally { setCarregando(false) }
  }, [slug, periodo])

  useEffect(()=>{ fetchDados() },[fetchDados])

  useEffect(()=>{
    const ch = supabase.channel('dash-rt-'+slug)
      .on('postgres_changes',{event:'*',schema:'public',table:'pedidos'},()=>fetchDados())
      .subscribe()
    return ()=>{ supabase.removeChannel(ch) }
  },[slug, fetchDados])

  const fmt = (v:number)=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const pct = (a:number,b:number)=>b===0?0:Math.round(((a-b)/b)*100)
  const maxGraf = Math.max(...graficoDados.map(g=>g.total), 1)

  const statusCor: Record<string,string> = {
    recebido:'#3b82f6', em_preparo:'#f59e0b', pronto:'#8b5cf6',
    entregue:'#22c55e', cancelado:'#ef4444', finalizado:'#22c55e'
  }
  const statusLabel: Record<string,string> = {
    recebido:'Recebido', em_preparo:'Em Preparo', pronto:'Pronto',
    entregue:'Entregue', cancelado:'Cancelado', finalizado:'Finalizado'
  }
  const periodoLabel: Record<Periodo,string> = { hoje:'Hoje', semana:'Esta Semana', mes:'Este Mês' }

  const kpis = [
    {
      label: 'Receita ' + periodoLabel[periodo],
      value: fmt(stats.receitaAtual),
      sub: stats.pedidosAtual + ' pedidos',
      variacao: pct(stats.receitaAtual, stats.receitaAnterior),
      icon: <DollarSign size={20}/>, cor: '#22c55e'
    },
    {
      label: 'Ticket Médio',
      value: fmt(stats.ticketMedio),
      sub: 'por pedido',
      variacao: pct(stats.ticketMedio, stats.ticketMedioAnterior),
      icon: <TrendingUp size={20}/>, cor: '#3b82f6'
    },
    {
      label: 'Em Preparo',
      value: String(stats.emPreparo),
      sub: 'na cozinha agora',
      variacao: null,
      icon: <ChefHat size={20}/>, cor: '#f59e0b'
    },
    {
      label: 'Receita do Mês',
      value: fmt(stats.receitaMes),
      sub: stats.pedidosMes + ' pedidos',
      variacao: null,
      icon: <BarChart3 size={20}/>, cor: '#8b5cf6'
    },
    {
      label: 'Clientes',
      value: String(stats.clientes),
      sub: 'cadastrados',
      variacao: null,
      icon: <Users size={20}/>, cor: '#ec4899'
    },
    {
      label: 'Mesas Ocupadas',
      value: String(stats.mesas),
      sub: 'agora',
      variacao: null,
      icon: <UtensilsCrossed size={20}/>, cor: '#ef4239'
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#111', minHeight: '100vh', fontFamily: 'Mulish, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#e6e6e6' }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Filtro Período */}
          <div style={{ display: 'flex', background: '#1a1a1a', border: '1px solid #292929', borderRadius: 8, overflow: 'hidden' }}>
            {(['hoje','semana','mes'] as Periodo[]).map(p=>(
              <button key={p} onClick={()=>setPeriodo(p)} style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: periodo===p ? '#ef4239' : 'transparent',
                color: periodo===p ? '#fff' : '#777',
                transition: 'all 0.2s'
              }}>{periodoLabel[p]}</button>
            ))}
          </div>
          <button onClick={fetchDados} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: '#1a1a1a', border: '1px solid #292929', borderRadius: 8,
            color: '#e6e6e6', fontSize: 12, cursor: 'pointer', fontWeight: 600
          }}>
            <RefreshCw size={13}/> Atualizar
          </button>
          <span style={{ fontSize: 11, color: '#444' }}>
            {ultimaAtt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </span>
        </div>
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#555' }}>
          <RefreshCw size={28} color="#ef4239" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}/>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          <p style={{ margin: 0 }}>Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {kpis.map((k, i) => {
              const positivo = k.variacao !== null && k.variacao >= 0
              return (
                <div key={i} style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>{k.label}</span>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: k.cor+'22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.cor }}>{k.icon}</div>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#e6e6e6' }}>{k.value}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#555' }}>{k.sub}</span>
                    {k.variacao !== null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: positivo ? '#22c55e' : '#ef4444' }}>
                        {positivo ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        {Math.abs(k.variacao)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grafico + Canais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, marginBottom: 20 }}>
            {/* Grafico de linha */}
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e6e6e6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={15} color="#ef4239"/> Vendas — {periodoLabel[periodo]}
                </h2>
                <span style={{ fontSize: 11, color: '#555' }}>{fmt(stats.receitaAtual)}</span>
              </div>
              {graficoDados.length === 0 || graficoDados.every(g=>g.total===0) ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 13 }}>Sem vendas no período</div>
              ) : (
                <div style={{ position: 'relative', height: 130 }}>
                  {/* SVG Line Chart */}
                  <svg width="100%" height="110" viewBox={`0 0 ${graficoDados.length*60} 110`} preserveAspectRatio="none" style={{ display: 'block' }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4239" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#ef4239" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d={`M ${graficoDados.map((g,i)=>`${i*60+30},${100-(g.total/maxGraf)*90}`).join(' L ')} L ${(graficoDados.length-1)*60+30},100 L 30,100 Z`}
                      fill="url(#grad)"
                    />
                    {/* Line */}
                    <polyline
                      points={graficoDados.map((g,i)=>`${i*60+30},${100-(g.total/maxGraf)*90}`).join(' ')}
                      fill="none" stroke="#ef4239" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                    {/* Dots */}
                    {graficoDados.map((g,i)=>(
                      <circle key={i} cx={i*60+30} cy={100-(g.total/maxGraf)*90} r="4" fill="#ef4239" stroke="#1a1a1a" strokeWidth="2"/>
                    ))}
                  </svg>
                  {/* Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
                    {graficoDados.filter((_,i)=> periodo==='hoje' ? i%3===0 : true).map((g,i)=>(
                      <span key={i} style={{ fontSize: 9, color: '#444', textAlign: 'center' }}>{g.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Canais de venda */}
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: '18px 20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#e6e6e6', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={15} color="#f59e0b"/> Canais de Venda
              </h2>
              {[
                { label: 'Delivery', value: stats.delivery, cor: '#3b82f6', icon: <Bike size={14}/> },
                { label: 'Mesa', value: stats.mesa, cor: '#8b5cf6', icon: <UtensilsCrossed size={14}/> },
                { label: 'Balcão', value: stats.balcao, cor: '#22c55e', icon: <ShoppingBag size={14}/> },
              ].map((c,i)=>{
                const total = stats.delivery+stats.mesa+stats.balcao
                const pctCanal = total>0 ? Math.round((c.value/total)*100) : 0
                return (
                  <div key={i} style={{ marginBottom: i<2?16:0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#aaa', fontWeight: 600 }}>
                        <span style={{ color: c.cor }}>{c.icon}</span>{c.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#e6e6e6' }}>{c.value} <span style={{ color: '#555', fontWeight: 400 }}>({pctCanal}%)</span></span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#292929', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: c.cor, width: pctCanal+'%', borderRadius: 2, transition: 'width 0.5s' }}/>
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: 20, padding: '12px', background: '#111', borderRadius: 8, border: '1px solid #292929' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#555', textAlign: 'center' }}>Total de pedidos</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#e6e6e6', textAlign: 'center' }}>{stats.pedidosAtual}</p>
              </div>
            </div>
          </div>

          {/* Pedidos Recentes + Produtos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
            {/* Pedidos Recentes */}
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e6e6e6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#3b82f6"/> Pedidos Recentes
                </h2>
                <span style={{ fontSize: 11, color: '#555', background: '#111', border: '1px solid #292929', borderRadius: 6, padding: '3px 8px' }}>
                  {pedidosRecentes.length} pedidos
                </span>
              </div>
              {pedidosRecentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#444' }}>
                  <ShoppingBag size={32} color="#333" style={{ display: 'block', margin: '0 auto 10px' }}/>
                  <p style={{ margin: 0, fontSize: 13 }}>Nenhum pedido ainda</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pedidosRecentes.map((p:any)=>{
                    const cor = statusCor[p.status]||'#555'
                    const mins = Math.floor((Date.now()-new Date(p.criado_em).getTime())/60000)
                    const tempoStr = mins < 60 ? mins+'min' : Math.floor(mins/60)+'h'+('0'+mins%60).slice(-2)
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#111', borderRadius: 8, border: '1px solid #292929', borderLeft: '3px solid '+cor }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#e6e6e6' }}>Pedido #{String(p.id).slice(-4)}</span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: cor+'22', color: cor, fontWeight: 700 }}>{statusLabel[p.status]||p.status}</span>
                            {p.tipo && <span style={{ fontSize: 10, color: '#555' }}>{p.tipo}</span>}
                          </div>
                          <span style={{ fontSize: 11, color: '#555' }}>{tempoStr} atrás</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#e6e6e6' }}>{fmt(p.total||0)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Produtos mais vendidos */}
            <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: '18px 20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#e6e6e6', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={15} color="#f59e0b"/> Mais Vendidos
              </h2>
              {produtosMaisVendidos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#444' }}>
                  <Package size={28} color="#333" style={{ display: 'block', margin: '0 auto 10px' }}/>
                  <p style={{ margin: 0, fontSize: 12 }}>Sem dados disponíveis</p>
                </div>
              ) : produtosMaisVendidos.map((p:any, i:number)=>{
                const maxQtd = produtosMaisVendidos[0].qtd
                const pctProd = Math.round((p.qtd/maxQtd)*100)
                return (
                  <div key={i} style={{ marginBottom: i<produtosMaisVendidos.length-1?14:0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: i===0?'#f59e0b':i===1?'#9ca3af':'#6b7280', minWidth: 18 }}>#{i+1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{p.nome}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#666' }}>{p.qtd}x</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: '#292929', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: i===0?'#f59e0b':'#ef4239', width: pctProd+'%', borderRadius: 2, transition: 'width 0.5s' }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#555', fontFamily: 'Mulish, sans-serif' }}>Carregando...</div>}>
      <DashContent/>
    </Suspense>
  )
}
