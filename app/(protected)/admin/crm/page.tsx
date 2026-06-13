'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface Cliente {
  id: string;
  nome: string | null;
  telefone: string;
  total_pedidos: number;
  valor_total_gasto: number | null;
  ticket_medio: number | null;
  ultima_interacao: string;
  produtos_preferidos: string[] | null;
  categorias_preferidas: string[] | null;
}

export default function CRMPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const supabase = createClient();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    if (!slug) {
      setErro('Slug do estabelecimento nao informado na URL (?slug=...).');
      setLoading(false);
      return;
    }

    const carregarClientes = async () => {
      setLoading(true);
      setErro(null);

      const { data: restaurant, error: restErr } = await supabase
        .from('estabelecimentos')
        .select('id')
        .eq('slug', slug)
        .single();

      if (restErr || !restaurant) {
        setErro('Estabelecimento nao encontrado ou sem permissao de acesso.');
        setLoading(false);
        return;
      }

      const { data, error: cliErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('ultima_interacao', { ascending: false });

      if (cliErr) {
        setErro('Falha ao carregar clientes.');
        setLoading(false);
        return;
      }

      setClientes(data || []);
      setLoading(false);
    };

    carregarClientes();
  }, [slug, supabase]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (erro) return <div className="p-6 text-red-600">{erro}</div>;

  const clientesFiltrados = clientes.filter((c) => {
    const termo = filtro.toLowerCase();
    return (
      (c.nome?.toLowerCase().includes(termo) ?? false) ||
      c.telefone.includes(filtro)
    );
  });

  const totalGasto = clientesFiltrados.reduce(
    (acc, c) => acc + (c.valor_total_gasto ?? 0),
    0
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">CRM - Meus Clientes</h1>

      <input
        type="text"
        placeholder="Buscar por nome ou telefone..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full p-3 border rounded mb-6"
      />

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Telefone</th>
              <th className="p-3 text-center">Pedidos</th>
              <th className="p-3 text-right">Gasto Total</th>
              <th className="p-3 text-right">Ticket Medio</th>
              <th className="p-3 text-left">Preferencias</th>
              <th className="p-3 text-left">Ultimo Pedido</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => (
              <tr key={cliente.id} className="border-t">
                <td className="p-3">{cliente.nome || 'Sem nome'}</td>
                <td className="p-3">{cliente.telefone}</td>
                <td className="p-3 text-center font-bold">{cliente.total_pedidos}</td>
                <td className="p-3 text-right">
                  R$ {(cliente.valor_total_gasto ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  R$ {(cliente.ticket_medio ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-sm">
                  <div>Categorias: {cliente.categorias_preferidas?.join(', ') || '-'}</div>
                  <div>Produtos: {cliente.produtos_preferidos?.join(', ') || '-'}</div>
                </td>
                <td className="p-3 text-sm">
                  {cliente.ultima_interacao
                    ? new Date(cliente.ultima_interacao).toLocaleDateString('pt-BR')
                    : '-'}
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between text-gray-600">
        <span>Total de clientes: {clientesFiltrados.length}</span>
        <span>Faturamento acumulado: R$ {totalGasto.toFixed(2)}</span>
      </div>
    </div>
  );
}
