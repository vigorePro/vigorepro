'use client'

import { useState } from 'react'
import {
  BookOpen, ChevronDown, ChevronUp, ShoppingCart, UtensilsCrossed,
  LayoutDashboard, Package, Users, BarChart3, Settings, Bike,
  ChefHat, CreditCard, MessageCircle, Star, Link, HelpCircle,
  PlayCircle, CheckCircle, ArrowRight, Lightbulb, Zap
} from 'lucide-react'

const secoes = [
  {
    id: 'inicio',
    icon: LayoutDashboard,
    titulo: 'Dashboard (Inicio)',
    cor: '#6366f1',
    descricao: 'Visao geral do seu negocio com KPIs principais, grafico de vendas e pedidos recentes.',
    passos: [
      'Acesse o Dashboard no menu principal',
      'Visualize o total de vendas, pedidos e ticket medio do dia',
      'Use o grafico para analisar a evolucao das vendas nos ultimos 7 dias',
      'Confira os produtos mais vendidos na lista lateral',
      'Veja os pedidos recentes e seus status em tempo real'
    ],
    dicas: ['Os dados atualizam automaticamente a cada 30 segundos', 'Clique em qualquer pedido para ver os detalhes completos']
  },
  {
    id: 'caixa',
    icon: CreditCard,
    titulo: 'Caixa',
    cor: '#f59e0b',
    descricao: 'Gerencie a abertura e fechamento do caixa, entradas, saidas e cancelamentos do dia.',
    passos: [
      'Clique em "Abrir Caixa" no inicio do expediente',
      'Informe o valor inicial em dinheiro (fundo de caixa)',
      'Durante o dia, todos os pagamentos sao registrados automaticamente',
      'Para registrar uma saida manual clique em "+ Lancamento"',
      'No final do dia clique em "Fechar Caixa" para ver o relatorio completo'
    ],
    dicas: ['O caixa so pode ser fechado pelo administrador', 'Relatorios de fechamento ficam salvos no Historico']
  },
  {
    id: 'delivery',
    icon: Bike,
    titulo: 'Delivery',
    cor: '#ef4239',
    descricao: 'Gerenciamento de pedidos de entrega em tempo real com status e informacoes do cliente.',
    passos: [
      'Acesse a pagina Delivery para ver todos os pedidos',
      'Pedidos novos aparecem na coluna "Novo" com alerta sonoro',
      'Clique em "Aceitar" para iniciar o preparo',
      'Atualize para "Saiu para Entrega" quando o entregador sair',
      'Marque como "Entregue" ao finalizar'
    ],
    dicas: ['A pagina atualiza automaticamente a cada 15 segundos', 'Clique no pedido para ver o endereco completo no mapa']
  },
  {
    id: 'mesas',
    icon: UtensilsCrossed,
    titulo: 'Mesas e Comandas',
    cor: '#8b5cf6',
    descricao: 'Gerenciamento visual de mesas, abertura de comandas e controle de ocupacao.',
    passos: [
      'Clique em uma mesa para ver seu status atual',
      'Mesas verdes estao livres, vermelhas estao ocupadas',
      'Clique em "Abrir Comanda" para iniciar um atendimento',
      'Adicione itens a comanda pelo PDV vinculando a mesa',
      'Feche a comanda ao finalizar o atendimento e registrar o pagamento'
    ],
    dicas: ['Use a visualizacao em lista para ver todas as mesas de uma vez', 'Voce pode transferir itens entre comandas']
  },
  {
    id: 'pdv',
    icon: ShoppingCart,
    titulo: 'PDV (Ponto de Venda)',
    cor: '#22c55e',
    descricao: 'Registre vendas rapidas, selecione produtos, aplique descontos e processe pagamentos.',
    passos: [
      'Selecione os produtos clicando nas fotos ou buscando pelo nome',
      'Ajuste as quantidades no carrinho lateral',
      'Selecione o tipo de pedido: Mesa, Balcao ou Delivery',
      'Aplique desconto se necessario (em reais ou percentual)',
      'Escolha a forma de pagamento e finalize a venda'
    ],
    dicas: ['Use F1 para abrir o cadastro rapido de produto', 'O PDV suporta multiplas formas de pagamento no mesmo pedido']
  },
  {
    id: 'kds',
    icon: ChefHat,
    titulo: 'KDS - Cozinha',
    cor: '#f97316',
    descricao: 'Tela para a cozinha com pedidos em tempo real, temporizadores e organizacao por categoria.',
    passos: [
      'Abra o KDS em um tablet ou monitor na cozinha',
      'Os pedidos aparecem automaticamente sem precisar recarregar',
      'O temporizador mostra quanto tempo o pedido esta esperando',
      'Clique em "Em Preparo" quando iniciar o preparo do pedido',
      'Clique em "Pronto" quando o pedido estiver finalizado'
    ],
    dicas: ['Use o modo tela cheia para melhor visibilidade', 'Pedidos urgentes ficam em vermelho apos 15 minutos']
  },
  {
    id: 'cardapio',
    icon: Package,
    titulo: 'Cardapio Digital',
    cor: '#06b6d4',
    descricao: 'Gerencie produtos, categorias, complementos e grupos de opcoes do seu cardapio.',
    passos: [
      'Crie categorias em Cardapio > Setores (ex: Lanches, Bebidas)',
      'Adicione produtos com nome, preco, descricao e foto',
      'Configure complementos (ex: Ponto da carne, Tamanho)',
      'Ative ou desative produtos conforme disponibilidade',
      'As alteracoes aparecem automaticamente no cardapio digital'
    ],
    dicas: ['Produtos com foto vendem mais - sempre adicione uma imagem', 'Use grupos de complementos para produtos customizaveis']
  },
  {
    id: 'clientes',
    icon: Users,
    titulo: 'Clientes',
    cor: '#ec4899',
    descricao: 'Cadastro e historico completo de clientes com segmentacao e programa de fidelidade.',
    passos: [
      'Acesse a pagina Clientes para ver todos os cadastros',
      'Clique em "+ Novo Cliente" para adicionar manualmente',
      'Clientes que pedem pelo cardapio digital sao cadastrados automaticamente',
      'Clique no nome do cliente para ver seu historico de pedidos',
      'Use a busca para encontrar clientes rapidamente'
    ],
    dicas: ['Clientes com mais pedidos aparecem destacados', 'Exporte a lista de clientes para acoes de marketing']
  },
  {
    id: 'financeiro',
    icon: BarChart3,
    titulo: 'Financeiro',
    cor: '#10b981',
    descricao: 'Controle de lancamentos financeiros, fluxo de caixa e relatorios de receitas e despesas.',
    passos: [
      'Registre entradas (receitas) e saidas (despesas) clicando em "+ Lancamento"',
      'Categorize cada lancamento para facilitar os relatorios',
      'Acompanhe o grafico de fluxo de caixa mensal',
      'Filtre por periodo para analises especificas',
      'Exporte os dados para planilha se necessario'
    ],
    dicas: ['Registre todas as despesas para ter uma visao real do lucro', 'O financeiro integra automaticamente com os pedidos do caixa']
  },
  {
    id: 'configuracoes',
    icon: Settings,
    titulo: 'Configuracoes',
    cor: '#94a3b8',
    descricao: 'Personalize seu estabelecimento, integracoes, formas de pagamento e muito mais.',
    passos: [
      'Acesse Configuracoes no menu lateral',
      'Em "Geral" configure nome, logo, CNPJ e contato',
      'Em "Aparencia" escolha a cor principal do seu cardapio',
      'Em "Pagamentos" ative as formas aceitas e configure o Pix',
      'Em "Horarios" defina os horarios de funcionamento por dia da semana'
    ],
    dicas: ['Mantenha o logo atualizado - ele aparece no cardapio publico', 'Configure os horarios corretamente para o cardapio fechar automaticamente']
  }
]

export default function ManualPage() {
  const [abertos, setAbertos] = useState<string[]>(['inicio'])
  const [busca, setBusca] = useState('')

  const toggle = (id: string) => {
    setAbertos(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const secoesFiltradas = secoes.filter(s =>
    s.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    s.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div style={{ fontFamily: 'Mulish, sans-serif', backgroundColor: '#111', minHeight: '100vh', color: '#fff', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#1a1a1a', border: '1px solid #292929', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} color="#ef4239" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Manual do Usuario</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Guia completo para usar todas as funcionalidades do VigorePro</p>
          </div>
        </div>
      </div>

      {/* Destaque */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#2e1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Lightbulb size={24} color="#ef4239" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#fff' }}>Bem-vindo ao VigorePro!</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888', lineHeight: 1.6 }}>
            Este manual cobre todas as funcionalidades do sistema. Clique em cada secao para expandir e ver o passo a passo detalhado. Se precisar de ajuda adicional, acesse a Central de Suporte.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/dashboard/suporte" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#ef4239', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              <HelpCircle size={13} />
              Central de Suporte
            </a>
            <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#1a2e1a', border: '1px solid #22c55e', borderRadius: 6, color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              <MessageCircle size={13} />
              Falar com Suporte
            </a>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar no manual..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 16px', backgroundColor: '#1a1a1a',
            border: '1px solid #292929', borderRadius: 8, color: '#fff', fontSize: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Indice rapido */}
      {!busca && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {secoes.map(s => (
            <button
              key={s.id}
              onClick={() => {
                if (!abertos.includes(s.id)) toggle(s.id)
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 20,
                color: '#ccc', fontSize: 12, cursor: 'pointer', transition: 'border-color 0.2s'
              }}
            >
              <s.icon size={12} color={s.cor} />
              {s.titulo}
            </button>
          ))}
        </div>
      )}

      {/* Secoes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {secoesFiltradas.map(s => {
          const aberto = abertos.includes(s.id)
          return (
            <div key={s.id} id={s.id} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${aberto ? s.cor + '55' : '#292929'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <button
                onClick={() => toggle(s.id)}
                style={{
                  width: '100%', padding: '16px', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: s.cor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={18} color={s.cor} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.titulo}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{s.descricao}</p>
                </div>
                {aberto ? <ChevronUp size={18} color={s.cor} /> : <ChevronDown size={18} color="#555" />}
              </button>

              {aberto && (
                <div style={{ padding: '0 16px 20px', borderTop: '1px solid #222' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <div>
                      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: s.cor, textTransform: 'uppercase', letterSpacing: 1 }}>Passo a Passo</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {s.passos.map((passo, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: s.cor + '22', border: `1px solid ${s.cor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: s.cor }}>{idx + 1}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>{passo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1 }}>Dicas Importantes</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {s.dicas.map((dica, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, backgroundColor: '#111', border: '1px solid #292929', borderRadius: 6, padding: '10px 12px' }}>
                            <Zap size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                            <p style={{ margin: 0, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>{dica}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, padding: 20, backgroundColor: '#1a1a1a', border: '1px solid #292929', borderRadius: 10, textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Nao encontrou o que precisava?</p>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>Nossa equipe de suporte esta pronta para ajudar voce</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/dashboard/suporte" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', backgroundColor: '#ef4239', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            <HelpCircle size={14} />
            Abrir Suporte
          </a>
        </div>
      </div>
    </div>
  )
}
