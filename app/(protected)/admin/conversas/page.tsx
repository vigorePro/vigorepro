'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  criado_em: string;
}

interface Contato {
  telefone: string;
  nome: string | null;
  ultima_mensagem: string;
  ultima_interacao: string;
  total_mensagens: number;
}

interface PedidoItem {
  nome: string;
  preco: number;
  quantidade: number;
  categoria?: string;
}

interface Pedido {
  id: string;
  numero_pedido: number;
  criado_em: string;
  valor_total: number;
  tipo_entrega: string;
  status: string;
  itens: PedidoItem[];
}

interface PerfilCliente {
  nome: string | null;
  total_pedidos: number;
  valor_total_gasto: number;
  ticket_medio: number;
  produtos_preferidos: string[] | null;
  pedidos: Pedido[];
}

function ConversasContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');

  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [perfil, setPerfil] = useState<PerfilCliente | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'conversa' | 'perfil'>('conversa');
  const mensagensEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) {
      setErro('Slug nao informado na URL (?slug=...).');
      setLoading(false);
      return;
    }
    const init = async () => {
      setLoading(true);
      const { data: est, error: estErr } = await supabase
        .from('estabelecimentos')
        .select('id')
        .eq('slug', slug)
        .single();
      if (estErr || !est) {
        setErro('Estabelecimento nao encontrado.');
        setLoading(false);
        return;
      }
      setEstabelecimentoId(est.id);
      await carregarContatos(est.id);
      setLoading(false);
    };
    init();
  }, [slug]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const carregarContatos = async (estId: string) => {
    const { data, error } = await supabase
      .from('conversas_ia')
      .select('telefone, content, role, criado_em')
      .eq('estabelecimento_id', estId)
      .order('criado_em', { ascending: false });
    if (error || !data) return;
    const mapa = new Map<string, Contato>();
    for (const msg of data) {
      if (!mapa.has(msg.telefone)) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nome')
          .eq('restaurant_id', estId)
          .eq('telefone', msg.telefone)
          .maybeSingle();
        mapa.set(msg.telefone, {
          telefone: msg.telefone,
          nome: cliente?.nome || null,
          ultima_mensagem: msg.content.substring(0, 60),
          ultima_interacao: msg.criado_em,
          total_mensagens: 1,
        });
      } else {
        mapa.get(msg.telefone)!.total_mensagens += 1;
      }
    }
    setContatos(Array.from(mapa.values()));
  };

  const abrirConversa = async (telefone: string) => {
    if (!estabelecimentoId) return;
    setContatoSelecionado(telefone);
    setLoadingMensagens(true);
    setPerfil(null);
    setAbaAtiva('conversa');

    // Busca mensagens e perfil em paralelo
    const [{ data: msgs }, { data: clienteData }] = await Promise.all([
      supabase
        .from('conversas_ia')
        .select('id, role, content, criado_em')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('telefone', telefone)
        .order('criado_em', { ascending: true }),
      supabase
        .from('clientes')
        .select('nome, total_pedidos, valor_total_gasto, ticket_medio, produtos_preferidos')
        .eq('restaurant_id', estabelecimentoId)
        .eq('telefone', telefone)
        .maybeSingle(),
    ]);

    if (msgs) setMensagens(msgs);

    // Busca pedidos do cliente
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('id, numero_pedido, criado_em, valor_total, tipo_entrega, status, itens')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('cliente_telefone', telefone)
      .order('criado_em', { ascending: false })
      .limit(10);

    setPerfil({
      nome: clienteData?.nome || null,
      total_pedidos: clienteData?.total_pedidos || 0,
      valor_total_gasto: clienteData?.valor_total_gasto || 0,
      ticket_medio: clienteData?.ticket_medio || 0,
      produtos_preferidos: clienteData?.produtos_preferidos || [],
      pedidos: pedidosData || [],
    });

    setLoadingMensagens(false);
  };

  const formatarHora = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    const hoje = new Date();
    const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return formatarHora(iso);
    if (diff === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatarDataCompleta = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const statusCor: Record<string, string> = {
    confirmado: 'bg-blue-100 text-blue-700',
    em_preparo: 'bg-yellow-100 text-yellow-700',
    pronto: 'bg-green-100 text-green-700',
    entregue: 'bg-gray-100 text-gray-600',
    cancelado: 'bg-red-100 text-red-600',
    em_producao: 'bg-purple-100 text-purple-700',
  };

  const contatoAtual = contatos.find((c) => c.telefone === contatoSelecionado);
  const contatosFiltrados = contatos.filter((c) => {
    const termo = busca.toLowerCase();
    return (c.nome?.toLowerCase().includes(termo) ?? false) || c.telefone.includes(busca);
  });

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Carregando...</div>;
  if (erro) return <div className="flex h-screen items-center justify-center text-red-600">{erro}</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Coluna esquerda - Lista de contatos */}
      <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 bg-green-600 text-white">
          <h1 className="text-xl font-bold">Conversas</h1>
          <p className="text-sm text-green-100">{contatos.length} contatos</p>
        </div>
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Buscar contato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 rounded-full text-sm outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {contatosFiltrados.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Nenhuma conversa encontrada</div>
          ) : (
            contatosFiltrados.map((contato) => (
              <button
                key={contato.telefone}
                onClick={() => abrirConversa(contato.telefone)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                  contatoSelecionado === contato.telefone ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(contato.nome || contato.telefone).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium text-sm truncate">{contato.nome || contato.telefone}</span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{formatarData(contato.ultima_interacao)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{contato.ultima_mensagem}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Coluna central - Conversa */}
      <div className="flex-1 flex flex-col min-w-0">
        {!contatoSelecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">Selecione uma conversa</p>
            <p className="text-sm">Escolha um contato na lista ao lado</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {(contatoAtual?.nome || contatoAtual?.telefone || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{contatoAtual?.nome || 'Sem nome'}</p>
                <p className="text-xs text-gray-500">{contatoAtual?.telefone} · {contatoAtual?.total_mensagens} mensagens</p>
              </div>
              {/* Abas */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAbaAtiva('conversa')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${abaAtiva === 'conversa' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  💬 Conversa
                </button>
                <button
                  onClick={() => setAbaAtiva('perfil')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${abaAtiva === 'perfil' ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  👤 Perfil
                </button>
              </div>
            </div>

            {/* Aba Conversa */}
            {abaAtiva === 'conversa' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                  {loadingMensagens ? (
                    <div className="text-center text-gray-400 pt-10">Carregando mensagens...</div>
                  ) : mensagens.length === 0 ? (
                    <div className="text-center text-gray-400 pt-10">Nenhuma mensagem</div>
                  ) : (
                    mensagens.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-green-500 text-white rounded-br-none'
                            : 'bg-white text-gray-800 rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 text-right ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                            {formatarHora(msg.criado_em)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={mensagensEndRef} />
                </div>
                <div className="px-4 py-3 bg-white border-t text-center text-xs text-gray-400">
                  Modo somente leitura — conversas gerenciadas pela IA
                </div>
              </>
            )}

            {/* Aba Perfil */}
            {abaAtiva === 'perfil' && (
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {!perfil ? (
                  <div className="text-center text-gray-400 pt-10">Carregando perfil...</div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-4">

                    {/* Cards de métricas */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-2xl font-bold text-green-600">{perfil.total_pedidos}</p>
                        <p className="text-xs text-gray-500 mt-1">Pedidos</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-2xl font-bold text-green-600">R$ {perfil.valor_total_gasto.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">Total gasto</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                        <p className="text-2xl font-bold text-green-600">R$ {perfil.ticket_medio.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">Ticket médio</p>
                      </div>
                    </div>

                    {/* Top 3 produtos favoritos */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <h3 className="font-semibold text-gray-700 mb-3">⭐ Produtos favoritos</h3>
                      {!perfil.produtos_preferidos || perfil.produtos_preferidos.length === 0 ? (
                        <p className="text-sm text-gray-400">Nenhum pedido registrado ainda</p>
                      ) : (
                        <div className="space-y-2">
                          {perfil.produtos_preferidos.slice(0, 3).map((produto, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                i === 0 ? 'bg-yellow-400 text-white' :
                                i === 1 ? 'bg-gray-300 text-gray-700' :
                                'bg-orange-300 text-white'
                              }`}>
                                {i + 1}
                              </div>
                              <span className="text-sm text-gray-700">{produto}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Histórico de pedidos */}
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <h3 className="font-semibold text-gray-700 mb-3">🛍️ Histórico de compras</h3>
                      {perfil.pedidos.length === 0 ? (
                        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
                      ) : (
                        <div className="space-y-3">
                          {perfil.pedidos.map((pedido) => (
                            <div key={pedido.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium text-sm">Pedido #{pedido.numero_pedido}</span>
                                  <span className="text-xs text-gray-400 ml-2">{formatarDataCompleta(pedido.criado_em)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCor[pedido.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {pedido.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-sm font-semibold text-green-600">R$ {pedido.valor_total.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                {Array.isArray(pedido.itens) && pedido.itens.map((item, idx) => (
                                  <p key={idx} className="text-xs text-gray-500">
                                    {item.quantidade}x {item.nome} — R$ {(item.preco * item.quantidade).toFixed(2)}
                                  </p>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 mt-1 capitalize">{pedido.tipo_entrega}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConversasPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
      <ConversasContent />
    </Suspense>
  );
}
