'use client';

import { Suspense, useEffect, useState } from 'react';
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

function ConversasContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');

  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Busca estabelecimento e contatos
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

  const carregarContatos = async (estId: string) => {
    // Busca todas as mensagens agrupadas por telefone
    const { data, error } = await supabase
      .from('conversas_ia')
      .select('telefone, content, role, criado_em')
      .eq('estabelecimento_id', estId)
      .order('criado_em', { ascending: false });

    if (error || !data) return;

    // Agrupa por telefone
    const mapa = new Map<string, Contato>();
    for (const msg of data) {
      if (!mapa.has(msg.telefone)) {
        // Tenta pegar nome do cliente
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
        const c = mapa.get(msg.telefone)!;
        c.total_mensagens += 1;
      }
    }

    setContatos(Array.from(mapa.values()));
  };

  const abrirConversa = async (telefone: string) => {
    if (!estabelecimentoId) return;
    setContatoSelecionado(telefone);
    setLoadingMensagens(true);

    const { data, error } = await supabase
      .from('conversas_ia')
      .select('id, role, content, criado_em')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('telefone', telefone)
      .order('criado_em', { ascending: true });

    if (!error && data) setMensagens(data);
    setLoadingMensagens(false);
  };

  const formatarHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    const hoje = new Date();
    const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return formatarHora(iso);
    if (diff === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const contatoAtual = contatos.find((c) => c.telefone === contatoSelecionado);

  const contatosFiltrados = contatos.filter((c) => {
    const termo = busca.toLowerCase();
    return (
      (c.nome?.toLowerCase().includes(termo) ?? false) ||
      c.telefone.includes(busca)
    );
  });

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Carregando...</div>;
  if (erro) return <div className="flex h-screen items-center justify-center text-red-600">{erro}</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Coluna esquerda - Lista de contatos */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 bg-green-600 text-white">
          <h1 className="text-xl font-bold">Conversas</h1>
          <p className="text-sm text-green-100">{contatos.length} contatos</p>
        </div>

        {/* Busca */}
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Buscar contato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 rounded-full text-sm outline-none"
          />
        </div>

        {/* Lista */}
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
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(contato.nome || contato.telefone).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-medium text-sm truncate">
                        {contato.nome || contato.telefone}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatarData(contato.ultima_interacao)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {contato.ultima_mensagem}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Coluna direita - Conversa */}
      <div className="flex-1 flex flex-col">
        {!contatoSelecionado ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">Selecione uma conversa</p>
            <p className="text-sm">Escolha um contato na lista ao lado</p>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="px-4 py-3 bg-white border-b flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                {(contatoAtual?.nome || contatoAtual?.telefone || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{contatoAtual?.nome || 'Sem nome'}</p>
                <p className="text-xs text-gray-500">{contatoAtual?.telefone} · {contatoAtual?.total_mensagens} mensagens</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {loadingMensagens ? (
                <div className="text-center text-gray-400 pt-10">Carregando mensagens...</div>
              ) : mensagens.length === 0 ? (
                <div className="text-center text-gray-400 pt-10">Nenhuma mensagem</div>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-green-500 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 text-right ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                        {formatarHora(msg.criado_em)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodape - somente leitura */}
            <div className="px-4 py-3 bg-white border-t text-center text-xs text-gray-400">
              Modo somente leitura — conversas gerenciadas pela IA
            </div>
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
