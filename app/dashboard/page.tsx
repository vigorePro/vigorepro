'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, DollarSign, Clock, ChefHat, UtensilsCrossed, Users, BarChart3, Star, RefreshCw, Bike, Package, Zap, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

type P = 'hoje'|'semana'|'mes'

function DashContent() {
  const sp = useSearchParams()
  const slug = sp.get('slug') || ''
  const [est, setEst] = useState<any>(null)
  const [periodo, setPeriodo] = useState<P>('hoje')
  const [stats, setStats] = useState({rA:0,rB:0,pA:0,pB:0,tA:0,tB:0,prep:0,mesas:0,clientes:0,rMes:0,pMes:0,del:0,mesa:0,bal:0})
  const [pedidos, setPedidos] = useState<any[]>([])
  const [prods, setProds] = useState<any[]>([])
  const [graf, setGraf] = useState<{label:string,v:number}[]>([])
  const [loading, setLoading] = useState(true)
  const [att, setAtt] = useState(new Date())

  const fetch_dados = useCallback(async () => {
    if (!slug) return
    try {
      const { data: e } = await supabase.from('estabelecimentos').select('*').eq('slug', slug).single()
      if (!e) return
      setEst(e)
      const now = new Date()
      const hj0 = new Date(now); hj0.setHours(0,0,0,0)
      const hj1 = new Date(now); hj1.setHours(23,59,59,999)
      const on0 = new Date(now); on0.setDate(now.getDate()-1); on0.setHours(0,0,0,0)
      const on1 = new Date(now); on1.setDate(now.getDate()-1); on1.setHours(23,59,59,999)
      const sw0 = new Date(now); sw0.setDate(now.getDate()-6); sw0.setHours(0,0,0,0)
      const sa0 = new Date(now); sa0.setDate(now.getDate()-13); sa0.setHours(0,0,0,0)
      const sa1 = new Date(now); sa1.setDate(now.getDate()-7); sa1.setHours(23,59,59,999)
      const mes0 = new Date(now.getFullYear(),now.getMonth(),1)
      const ma0 = new Date(now.getFullYear(),now.getMonth()-1,1)
      const ma1 = new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999)
      let ia:Date,ib:Date,ja:Date,jb:Date
      if (periodo==='hoje'){ia=hj0;ib=hj1;ja=on0;jb=on1}
      else if (periodo==='semana'){ia=sw0;ib=now;ja=sa0;jb=sa1}
      else{ia=mes0;ib=now;ja=ma0;jb=ma1}
      const [pA,pB,pM,pR,pG,cli,ms] = await Promise.all([
        supabase.from('pedidos').select('total,status,tipo').eq('estabelecimento_id',e.id).gte('criado_em',ia.toISOString()).lte('criado_em',ib.toISOString()),
        supabase.from('pedidos').select('total,status').eq('estabelecimento_id',e.id).gte('criado_em',ja.toISOString()).lte('criado_em',jb.toISOString()),
        supabase.from('pedidos').select('total,status').eq('estabelecimento_id',e.id).gte('criado_em',mes0.toISOString()).not('status','eq','cancelado'),
        supabase.from('pedidos').select('*').eq('estabelecimento_id',e.id).order('criado_em',{ascending:false}).limit(6),
        supabase.from('pedidos').select('criado_em,total,status').eq('estabelecimento_id',e.id).gte('criado_em',ia.toISOString()).lte('criado_em',ib.toISOString()).not('status','eq','cancelado'),
        supabase.from('clientes').select('id',{count:'exact'}).eq('estabelecimento_id',e.id),
        supabase.from('mesas').select('status').eq('estabelecimento_id',e.id).eq('status','ocupada'),
      ])

      const ok = (pA.data||[]).filter((p:any)=>p.status!=='cancelado')
      const okB = (pB.data||[]).filter((p:any)=>p.status!=='cancelado')
      const rA=ok.reduce((s:number,p:any)=>s+(p.valor_total||0),0)
      const rB=okB.reduce((s:number,p:any)=>s+(p.valor_total||0),0)
      const pAn=ok.length, pBn=okB.length
      const tA=pAn>0?rA/pAn:0, tB=pBn>0?rB/pBn:0
      const prep=(pA.data||[]).filter((p:any)=>['recebido','em_preparo','pronto'].includes(p.status)).length
      const rMes=(pM.data||[]).reduce((s:number,p:any)=>s+(p.valor_total||0),0)
      const del=ok.filter((p:any)=>p.tipo==='delivery').length
      const mesa=ok.filter((p:any)=>p.tipo==='mesa').length
      const bal=ok.filter((p:any)=>!p.tipo||p.tipo==='balcao').length
      setStats({rA,rB,pA:pAn,pB:pBn,tA,tB,prep,mesas:ms.data?.length||0,clientes:cli.count||0,rMes,pMes:pM.data?.length||0,del,mesa,bal})
      setPedidos(pR.data||[])
      // grafico
      const gd = pG.data||[]
      if (periodo==='hoje'){
        const hrs:Record<string,number>={}
        for(let h=0;h<24;h++) hrs[h+'h']=0
        gd.forEach((p:any)=>{const h=new Date(p.criado_em).getHours();hrs[h+'h']=(hrs[h+'h']||0)+(p.valor_total||0)})
        setGraf(Object.entries(hrs).map(([label,v])=>({label,v})))
      } else if (periodo==='semana'){
        const dias:Record<string,number>={}
        for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);dias[d.toLocaleDateString('pt-BR',{weekday:'short'})]=0}
        gd.forEach((p:any)=>{const k=new Date(p.criado_em).toLocaleDateString('pt-BR',{weekday:'short'});if(dias[k]!==undefined)dias[k]=(dias[k]||0)+(p.valor_total||0)})
        setGraf(Object.entries(dias).map(([label,v])=>({label,v})))
      } else {
        const ss:Record<string,number>={'S1':0,'S2':0,'S3':0,'S4':0}
        gd.forEach((p:any)=>{const d=new Date(p.criado_em).getDate();const s=d<=7?'S1':d<=14?'S2':d<=21?'S3':'S4';ss[s]=(ss[s]||0)+(p.valor_total||0)})
        setGraf(Object.entries(ss).map(([label,v])=>({label,v})))
      }
      // produtos
      const mp:Record<string,{nome:string,qtd:number}>={}
      ;(pR.data||[]).forEach((p:any)=>{
        if(p.itens){try{const its=typeof p.itens==='string'?JSON.parse(p.itens):p.itens;its.forEach((it:any)=>{const n=it.nome||it.name||'?';if(!mp[n])mp[n]={nome:n,qtd:0};mp[n].qtd+=(it.quantidade||it.qty||1)})}catch{}}
      })
      setProds(Object.values(mp).sort((a:any,b:any)=>b.qtd-a.qtd).slice(0,5))
      setAtt(new Date())
    } catch(err){console.error(err)} finally{setLoading(false)}
  },[slug,periodo])

  useEffect(()=>{fetch_dados()},[fetch_dados])
  useEffect(()=>{
    const ch=supabase.channel('dash-'+slug).on('postgres_changes',{event:'*',schema:'public',table:'pedidos'},()=>fetch_dados()).subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[slug,fetch_dados])

  const fm=(v:number)=>'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const pc=(a:number,b:number)=>b===0?0:Math.round(((a-b)/b)*100)
  const mg=Math.max(...graf.map(g=>g.v),1)
  const scor:Record<string,string>={recebido:'#3b82f6',em_preparo:'#f59e0b',pronto:'#8b5cf6',entregue:'#22c55e',cancelado:'#ef4444',finalizado:'#22c55e'}
  const slbl:Record<string,string>={recebido:'Recebido',em_preparo:'Em Preparo',pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado',finalizado:'Finalizado'}
  const plbl:Record<P,string>={hoje:'Hoje',semana:'Esta Semana',mes:'Este MÃªs'}

  const kpis=[
    {lbl:'Receita '+plbl[periodo],val:fm(stats.rA),sub:stats.pA+' pedidos',var:pc(stats.rA,stats.rB),cor:'#22c55e',icon:<DollarSign size={20}/>},
    {lbl:'Ticket MÃ©dio',val:fm(stats.tA),sub:'por pedido',var:pc(stats.tA,stats.tB),cor:'#3b82f6',icon:<TrendingUp size={20}/>},
    {lbl:'Em Preparo',val:String(stats.prep),sub:'na cozinha',var:null,cor:'#f59e0b',icon:<ChefHat size={20}/>},
    {lbl:'Receita do MÃªs',val:fm(stats.rMes),sub:stats.pMes+' pedidos',var:null,cor:'#8b5cf6',icon:<BarChart3 size={20}/>},
    {lbl:'Clientes',val:String(stats.clientes),sub:'cadastrados',var:null,cor:'#ec4899',icon:<Users size={20}/>},
    {lbl:'Mesas Ocupadas',val:String(stats.mesas),sub:'agora',var:null,cor:'#ef4239',icon:<UtensilsCrossed size={20}/>},
  ]

  return (
    <div style={{padding:24,background:'#111',minHeight:'100vh',fontFamily:'Mulish,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:'#e6e6e6'}}>Dashboard</h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:'#555'}}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <div style={{display:'flex',background:'#1a1a1a',border:'1px solid #292929',borderRadius:8,overflow:'hidden'}}>
            {(['hoje','semana','mes'] as P[]).map(p=>(
              <button key={p} onClick={()=>setPeriodo(p)} style={{padding:'7px 14px',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',background:periodo===p?'#ef4239':'transparent',color:periodo===p?'#fff':'#777',transition:'all 0.2s'}}>{plbl[p]}</button>
            ))}
          </div>
          <button onClick={fetch_dados} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#1a1a1a',border:'1px solid #292929',borderRadius:8,color:'#e6e6e6',fontSize:12,cursor:'pointer',fontWeight:600}}>
            <RefreshCw size={13}/> Atualizar
          </button>
          <span style={{fontSize:11,color:'#444'}}>{att.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
      </div>
      {loading ? (
        <div style={{textAlign:'center',padding:80,color:'#555'}}>
          <RefreshCw size={28} color="#ef4239" style={{animation:'spin 1s linear infinite',display:'block',margin:'0 auto 12px'}}/>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          <p style={{margin:0}}>Carregando...</p>
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            {kpis.map((k,i)=>{
              const pos=k.var!==null&&k.var>=0
              return (
                <div key={i} style={{background:'#1a1a1a',border:'1px solid #292929',borderRadius:12,padding:'16px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <span style={{fontSize:12,color:'#666',fontWeight:600}}>{k.lbl}</span>
                    <div style={{width:36,height:36,borderRadius:8,background:k.cor+'22',display:'flex',alignItems:'center',justifyContent:'center',color:k.cor}}>{k.icon}</div>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:22,fontWeight:800,color:'#e6e6e6'}}>{k.val}</p>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#555'}}>{k.sub}</span>
                    {k.var!==null&&<span style={{display:'flex',alignItems:'center',gap:2,fontSize:11,fontWeight:700,color:pos?'#22c55e':'#ef4444'}}>{pos?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}{Math.abs(k.var)}%</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12,marginBottom:20}}>
            <div style={{background:'#1a1a1a',border:'1px solid #292929',borderRadius:12,padding:'18px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h2 style={{margin:0,fontSize:13,fontWeight:700,color:'#e6e6e6',display:'flex',alignItems:'center',gap:6}}><BarChart3 size={15} color="#ef4239"/> Vendas â {plbl[periodo]}</h2>
                <span style={{fontSize:11,color:'#555'}}>{fm(stats.rA)}</span>
              </div>
              {graf.every(g=>g.v===0) ? (
                <div style={{height:130,display:'flex',alignItems:'center',justifyContent:'center',color:'#444',fontSize:13}}>Sem vendas no perÃ­odo</div>
              ) : (
                <div style={{position:'relative'}}>
                  <svg width="100%" height="110" viewBox={`0 0 ${Math.max(graf.length*50,100)} 110`} preserveAspectRatio="none" style={{display:'block'}}>
                    <defs>
                      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4239" stopOpacity="0.35"/>
                        <stop offset="100%" stopColor="#ef4239" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d={`M ${graf.map((g,i)=>`${i*50+25},${100-(g.v/mg)*90}`).join(' L ')} L ${(graf.length-1)*50+25},100 L 25,100 Z`} fill="url(#gr)"/>
                    <polyline points={graf.map((g,i)=>`${i*50+25},${100-(g.v/mg)*90}`).join(' ')} fill="none" stroke="#ef4239" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {graf.map((g,i)=>(<circle key={i} cx={i*50+25} cy={100-(g.v/mg)*90} r="3.5" fill="#ef4239" stroke="#1a1a1a" strokeWidth="2"/>))}
                  </svg>
                  <div style={{display:'flex',justifyContent:'space-around',marginTop:6}}>
                    {(periodo==='hoje'?graf.filter((_,i)=>i%4===0):graf).map((g,i)=>(<span key={i} style={{fontSize:9,color:'#444'}}>{g.label}</span>))}
                  </div>
                </div>
              )}
            </div>
            <div style={{background:'#1a1a1a',border:'1px solid #292929',borderRadius:12,padding:'18px 20px'}}>
              <h2 style={{margin:'0 0 16px',fontSize:13,fontWeight:700,color:'#e6e6e6',display:'flex',alignItems:'center',gap:6}}><Zap size={15} color="#f59e0b"/> Canais de Venda</h2>
              {[
                {lbl:'Delivery',v:stats.del,cor:'#3b82f6',icon:<Bike size={14}/>},
                {lbl:'Mesa',v:stats.mesa,cor:'#8b5cf6',icon:<UtensilsCrossed size={14}/>},
                {lbl:'BalcÃ£o',v:stats.bal,cor:'#22c55e',icon:<ShoppingBag size={14}/>},
              ].map((c,i)=>{
                const tot=stats.del+stats.mesa+stats.bal
                const pct=tot>0?Math.round((c.v/tot)*100):0
                return (
                  <div key={i} style={{marginBottom:i<2?16:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#aaa',fontWeight:600}}><span style={{color:c.cor}}>{c.icon}</span>{c.lbl}</span>
                      <span style={{fontSize:12,fontWeight:700,color:'#e6e6e6'}}>{c.v} <span style={{color:'#555',fontWeight:400}}>({pct}%)</span></span>
                    </div>
                    <div style={{height:4,borderRadius:2,background:'#292929',overflow:'hidden'}}>
                      <div style={{height:'100%',background:c.cor,width:pct+'%',borderRadius:2,transition:'width 0.5s'}}/>
                    </div>
                  </div>
                )
              })}
              <div style={{marginTop:20,padding:12,background:'#111',borderRadius:8,border:'1px solid #292929',textAlign:'center'}}>
                <p style={{margin:0,fontSize:11,color:'#555'}}>Total de pedidos</p>
                <p style={{margin:'4px 0 0',fontSize:20,fontWeight:800,color:'#e6e6e6'}}>{stats.pA}</p>
              </div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12}}>
            <div style={{background:'#1a1a1a',border:'1px solid #292929',borderRadius:12,padding:'18px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h2 style={{margin:0,fontSize:13,fontWeight:700,color:'#e6e6e6',display:'flex',alignItems:'center',gap:6}}><Clock size={15} color="#3b82f6"/> Pedidos Recentes</h2>
                <span style={{fontSize:11,color:'#555',background:'#111',border:'1px solid #292929',borderRadius:6,padding:'3px 8px'}}>{pedidos.length} pedidos</span>
              </div>
              {pedidos.length===0?(
                <div style={{textAlign:'center',padding:'30px 0',color:'#444'}}>
                  <ShoppingBag size={32} color="#333" style={{display:'block',margin:'0 auto 10px'}}/>
                  <p style={{margin:0,fontSize:13}}>Nenhum pedido ainda</p>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pedidos.map((p:any)=>{
                    const cor=scor[p.status]||'#555'
                    const mins=Math.floor((Date.now()-new Date(p.criado_em).getTime())/60000)
                    const tstr=mins<60?mins+'min':Math.floor(mins/60)+'h'+('0'+mins%60).slice(-2)
                    return (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'#111',borderRadius:8,border:'1px solid #292929',borderLeft:'3px solid '+cor}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                            <span style={{fontSize:13,fontWeight:700,color:'#e6e6e6'}}>#{String(p.id).slice(-4)}</span>
                            <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:cor+'22',color:cor,fontWeight:700}}>{slbl[p.status]||p.status}</span>
                            {p.tipo&&<span style={{fontSize:10,color:'#555'}}>{p.tipo}</span>}
                          </div>
                          <span style={{fontSize:11,color:'#555'}}>{tstr} atrÃ¡s</span>
                        </div>
                        <span style={{fontSize:14,fontWeight:800,color:'#e6e6e6'}}>{fm(p.valor_total||0)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{background:'#1a1a1a',border:'1px solid #292929',borderRadius:12,padding:'18px 20px'}}>
              <h2 style={{margin:'0 0 16px',fontSize:13,fontWeight:700,color:'#e6e6e6',display:'flex',alignItems:'center',gap:6}}><Star size={15} color="#f59e0b"/> Mais Vendidos</h2>
              {prods.length===0?(
                <div style={{textAlign:'center',padding:'30px 0',color:'#444'}}>
                  <Package size={28} color="#333" style={{display:'block',margin:'0 auto 10px'}}/>
                  <p style={{margin:0,fontSize:12}}>Sem dados disponÃ­veis</p>
                </div>
              ):prods.map((p:any,i:number)=>{
                const pct=Math.round((p.qtd/prods[0].qtd)*100)
                return (
                  <div key={i} style={{marginBottom:i<prods.length-1?14:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:12,fontWeight:800,color:i===0?'#f59e0b':i===1?'#9ca3af':'#6b7280',minWidth:18}}>#{i+1}</span>
                        <span style={{fontSize:12,fontWeight:600,color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{p.nome}</span>
                      </div>
                      <span style={{fontSize:11,color:'#666'}}>{p.qtd}x</span>
                    </div>
                    <div style={{height:3,borderRadius:2,background:'#292929',overflow:'hidden'}}>
                      <div style={{height:'100%',background:i===0?'#f59e0b':'#ef4239',width:pct+'%',borderRadius:2,transition:'width 0.5s'}}/>
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
    <Suspense fallback={<div style={{padding:40,textAlign:'center',color:'#555',fontFamily:'Mulish,sans-serif'}}>Carregando...</div>}>
      <DashContent/>
    </Suspense>
  )
}
