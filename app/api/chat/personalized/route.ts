import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { restaurant_slug, cliente_telefone, mensagem_cliente } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: restaurant } = await supabase
      .from('estabelecimentos').select('id, nome')
      .eq('slug', restaurant_slug).single();
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const { data: cliente } = await supabase
      .from('clientes').select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('telefone', cliente_telefone).single();

    let historicoCompras: any[] = [];
    if (cliente) {
      const { data: historico } = await supabase
        .from('pedidos_historico').select('items, valor_total')
        .eq('cliente_id', cliente.id)
        .order('data_pedido', { ascending: false })
        .limit(10);
      historicoCompras = historico || [];
    }

    await supabase.from('cardapio').select('*')
      .eq('restaurant_id', restaurant.id).eq('ativo', true);

    let contextoCliente = '';
    if (cliente) {
      const historicoTxt = historicoCompras.map((h, i) => {
        const itens = Array.isArray(h.items)
          ? h.items.map((it: any) => `${it.nome} (${it.quantidade}x)`).join(', ')
          : '';
        return `Pedido ${i + 1}: R$ ${h.valor_total} - Itens: ${itens}`;
      }).join('\n');

      contextoCliente = `
INFORMACOES DO CLIENTE:
- Nome: ${cliente.nome || 'nao informado'}
- Total de pedidos anteriores: ${cliente.total_pedidos}
- Gasto total: R$ ${cliente.valor_total_gasto}
- Ultimo pedido: ${cliente.ultima_interacao}
- Produtos favoritos: ${cliente.produtos_preferidos?.length ? cliente.produtos_preferidos.join(', ') : 'nenhum registrado'}
- Categorias preferidas: ${cliente.categorias_preferidas?.length ? cliente.categorias_preferidas.join(', ') : 'nenhuma registrada'}

HISTORICO DE COMPRAS (ultimos 10 pedidos):
${historicoTxt}
`;
    }

    const { data: iaProfile } = await supabase
      .from('ia_perfis').select('system_prompt')
      .eq('restaurant_id', restaurant.id).single();

    const systemPromptCompleto = `
${iaProfile?.system_prompt || ''}

INSTRUCOES ESPECIAIS PARA ESTA CONVERSA:
${contextoCliente}

IMPORTANTE:
1. Se cliente e recorrente, cumprimente pelo nome de forma calorosa.
2. Recomende produtos que o cliente ja comprou ou similares ao historico.
3. Seja personalizado e amigavel baseado no historico.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPromptCompleto,
      messages: [{ role: 'user', content: mensagem_cliente }],
    });

    const respostaIA = response.content[0].type === 'text' ? response.content[0].text : '';

    if (!cliente) {
      await supabase.from('clientes').insert({
        restaurant_id: restaurant.id, telefone: cliente_telefone,
        total_pedidos: 0, valor_total_gasto: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        resposta_ia: respostaIA,
        eh_cliente_recorrente: !!cliente,
        total_pedidos_cliente: cliente?.total_pedidos || 0,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 });
  }
}
