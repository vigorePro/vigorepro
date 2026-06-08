# API de Gerenciamento de Prompts da IA

## Descrição

Este endpoint permite gerenciar os system prompts da IA para diferentes restaurantes. É responsável por armazenar e recuperar as instruções customizadas que serão utilizadas pelo Claude ao responder clientes via WhatsApp.

## Endpoints

### GET /api/admin/ia-prompts

Recupera o system prompt de um restaurante específico.

**Parâmetros:**
- `restaurantId` (query, obrigatório): ID único do restaurante no Supabase

**Resposta (200):**
```json
{
  "id": "uuid",
    "restaurant_id": "dolce-dolce",
      "system_prompt": "Você é um atendente virtual da confeitaria Dolce...",
        "name": "Prompt Padrão",
          "version": 1,
            "created_at": "2026-06-07T10:00:00Z",
              "updated_at": "2026-06-07T10:00:00Z"
              }
              ```

              **Erros:**
              - 400: `restaurantId` não fornecido
              - 404: Perfil da IA não encontrado
              - 500: Erro interno do servidor

              ### POST /api/admin/ia-prompts

              Cria ou atualiza o system prompt de um restaurante.

              **Body:**
              ```json
              {
                "restaurantId": "dolce-dolce",
                  "systemPrompt": "Você é um atendente virtual...",
                    "name": "Prompt Padrão",
                      "version": 1
                      }
                      ```

                      **Resposta (201):**
                      Retorna o objeto criado/atualizado (mesmo formato que GET).

                      **Erros:**
                      - 400: `restaurantId` ou `systemPrompt` não fornecidos
                      - 500: Erro ao salvar perfil

                      ## Exemplo de Uso

                      ### Obter prompt existente
                      ```bash
                      curl "https://dolcedolce.vigorepro.com.br/api/admin/ia-prompts?restaurantId=dolce-dolce"
                      ```

                      ### Criar/atualizar prompt
                      ```bash
                      curl -X POST "https://dolcedolce.vigorepro.com.br/api/admin/ia-prompts" \
                        -H "Content-Type: application/json" \
                          -d '{
                              "restaurantId": "dolce-dolce",
                                  "systemPrompt": "Você é um atendente de confeitaria...",
                                      "name": "Atendimento Padrão",
                                          "version": 2
                                            }'
                                            ```

                                            ## Fluxo de Dados

                                            1. GET solicita o prompt da tabela `ia_perfis`
                                            2. POST salva na `ia_perfis` (upsert) e registra versão em `ia_perfis_historico`
                                            3. Cada mudança é auditada automaticamente

                                            ## Autenticação

                                            Atualmente usa `SUPABASE_SERVICE_ROLE_KEY` para acesso. Futuro: implementar autenticação JWT.

                                            ## TODO

                                            - [ ] Adicionar autenticação JWT
                                            - [ ] Implementar limites de rate limit
                                            - [ ] Criar endpoint DELETE para remover prompts
                                            - [ ] Dashboard para editar prompts visualmente
