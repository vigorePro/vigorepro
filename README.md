# VigorePro — SaaS de Atendimento por IA para Food Service

## Sobre o Projeto

Sistema SaaS multi-tenant para food service com atendimento automatizado por IA via WhatsApp.

URL de producao: https://dolcedolce.vigorepro.com.br

---

## ==================================
## SESSAO 10 — BACKUP — 07/06/2026
## ==================================

### IMPLEMENTACAO DA IA WHATSAPP

#### ARQUIVOS CRIADOS/ATUALIZADOS

| Arquivo | Commit | O que mudou |
|---------|--------|-------------|
| app/api/whatsapp/route.ts | 6f85356 | Webhook WhatsApp IA: recebe mensagens Evolution API, processa com Claude, responde |
| package.json | 7f7fe62 | Adicionado @anthropic-ai/sdk ^0.27.0 |

#### SUPABASE — NOVA TABELA

Tabela conversas_ia criada no SQL Editor:
- id (uuid PK)
- telefone (text)
- estabelecimento_id (uuid FK -> estabelecimentos)
- role (text: 'user' | 'assistant')
- content (text)
- criado_em (timestamptz)
- INDEX: idx_conversas_ia_telefone (telefone, estabelecimento_id, criado_em)
- RLS: habilitado | Policy: "Service role full access" FOR ALL USING (true)

#### VERCEL — DEPLOY PRONTO

- Deploy atual: BxfvvSzPW (commit 7f7fe62) — Ready / Production Current
- Funcoes deployadas:
  - / (PAGE) — 614.8 kB
  - /api/whatsapp (API) — 803.6 kB — NOVO
- URL do webhook: https://www.vigorepro.com.br/api/whatsapp

#### ARQUITETURA DO WEBHOOK

Fluxo de mensagem:
1. Cliente manda mensagem no WhatsApp
2. Evolution API dispara POST para https://www.vigorepro.com.br/api/whatsapp
3. Webhook busca estabelecimento pelo slug da instancia
4. Busca cardapio + historico de conversa do Supabase em paralelo
5. Chama Claude API (claude-3-5-haiku-20241022) com contexto do cardapio
6. Claude responde em linguagem natural ou retorna JSON de pedido confirmado
7. Se pedido confirmado: cria registro na tabela pedidos (status: em_producao)
8. Envia resposta de volta pelo WhatsApp via Evolution API

#### STATUS ATUAL DA EVOLUTION API

PROBLEMA: Evolution API no Railway retornando 502 Bad Gateway
- URL: https://evolution-api-production-8319.up.railway.app
- Possiveis causas: trial expirou (30 dias) ou servico pausado
- PENDENTE: Reativar no painel do Railway (railway.com/project/dffb08a2-b15e-401f-b335-a579645d1bb8)

#### PROXIMO PASSO (para o usuario)

1. Acessar railway.com e verificar status do servico Evolution API
2. Se pausado: reativar / adicionar credito
3. Configurar webhook na Evolution API:
   - URL: https://www.vigorepro.com.br/api/whatsapp
   - Eventos: messages.upsert
   - Instancia: vigorepro-wa
4. Conectar WhatsApp: escanear QR code na Evolution API
5. Testar: mandar mensagem no numero conectado

#### ESTADO ATUAL DO PROJETO

- URL producao: dolcedolce.vigorepro.com.br
- Repo: github.com/vigorePro/vigorepro (branch: main)
- Supabase: wncxjuywlvzdqqofteby
- Vercel: vigorepros-projects/vigorepro (57 commits)
- Webhook IA: /api/whatsapp — DEPLOYADO E PRONTO
- Evolution API: OFFLINE (Railway 502)

## FIM DA SESSAO 10 — 07/06/2026
## ==================================

---

## Infraestrutura Completa

- Supabase: https://wncxjuywlvzdqqofteby.supabase.co
- GitHub: https://github.com/vigorePro/vigorepro
- Vercel: https://vigorepro.vercel.app / www.vigorepro.com.br
- Railway (Evolution API): https://evolution-api-production-8319.up.railway.app
- Primeiro cliente: dolcedolce.vigorepro.com.br (Dolce & Dolce Confeitaria - Ivaipora PR)
