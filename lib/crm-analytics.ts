import { createClient } from '@supabase/supabase-js';

interface ItemPedido {
  nome?: string;
  categoria?: string;
  quantidade?: number;
}

export async function analisarPreferenciasCliente(
  restaurantId: string,
  clienteId: string
): Promise<{ produtosTop: string[]; categoriasTop: string[] }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: historico, error } = await supabase
    .from('pedidos_historico')
    .select('items')
    .eq('cliente_id', clienteId)
    .eq('restaurant_id', restaurantId)
    .order('data_pedido', { ascending: false })
    .limit(20);

  if (error || !historico) {
    return { produtosTop: [], categoriasTop: [] };
  }

  const produtosCount: Record<string, number> = {};
  const categoriasCount: Record<string, number> = {};

  historico.forEach((pedido) => {
    if (!Array.isArray(pedido.items)) return;
    (pedido.items as ItemPedido[]).forEach((item) => {
      if (item?.nome) produtosCount[item.nome] = (produtosCount[item.nome] || 0) + 1;
      if (item?.categoria)
        categoriasCount[item.categoria] = (categoriasCount[item.categoria] || 0) + 1;
    });
  });

  const produtosTop = Object.entries(produtosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => nome);

  const categoriasTop = Object.entries(categoriasCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nome]) => nome);

  await supabase
    .from('clientes')
    .update({
      produtos_preferidos: produtosTop,
      categorias_preferidas: categoriasTop,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId)
    .eq('restaurant_id', restaurantId);

  return { produtosTop, categoriasTop };
}
