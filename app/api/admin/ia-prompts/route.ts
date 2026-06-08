import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET(request: NextRequest) {
    try {
          const { searchParams } = new URL(request.url);
          const restaurantId = searchParams.get('restaurantId');

          if (!restaurantId) {
                  return NextResponse.json(
                            { error: 'restaurantId é obrigatório' },
                            { status: 400 }
                          );
                }

          const { data, error } = await supabase
            .from('ia_perfis')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .single();

          if (error) {
                  return NextResponse.json(
                            { error: 'Perfil da IA não encontrado' },
                            { status: 404 }
                          );
                }

          return NextResponse.json(data);
        } catch (error) {
          console.error('Erro ao buscar perfil da IA:', error);
          return NextResponse.json(
                  { error: 'Erro interno do servidor' },
                  { status: 500 }
                );
        }
  }

export async function POST(request: NextRequest) {
    try {
          const body = await request.json();
          const { restaurantId, systemPrompt, name, version } = body;

          if (!restaurantId || !systemPrompt) {
                  return NextResponse.json(
                            { error: 'restaurantId e systemPrompt são obrigatórios' },
                            { status: 400 }
                          );
                }

          // Primeiro, tenta atualizar
          const { data, error } = await supabase
            .from('ia_perfis')
            .upsert({
                      restaurant_id: restaurantId,
                      system_prompt: systemPrompt,
                      name: name || 'Prompt Padrão',
                      version: version || 1,
                      updated_at: new Date().toISOString(),
                    })
            .eq('restaurant_id', restaurantId)
            .select();

          if (error) {
                  return NextResponse.json(
                            { error: 'Erro ao salvar perfil' },
                            { status: 500 }
                          );
                }

          // Registrar no histórico
          await supabase
            .from('ia_perfis_historico')
            .insert({
                      ia_perfis_id: data?.[0]?.id,
                      system_prompt: systemPrompt,
                      version: version || 1,
                      changed_at: new Date().toISOString(),
                    });

          return NextResponse.json(data?.[0], { status: 201 });
        } catch (error) {
          console.error('Erro ao atualizar perfil da IA:', error);
          return NextResponse.json(
                  { error: 'Erro interno do servidor' },
                  { status: 500 }
                );
        }
  }
