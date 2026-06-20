'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Send, RefreshCw, Users, TrendingUp, Clock, Bot, Zap, Star, AlertCircle, X, PhoneCall, UserCheck, Bell, Pencil } from 'lucide-react'

type Conversa = {
  telefone: string
  total_mensagens: number
  ultima_mensagem: string
  criado_em: string
}
type MensagemChat = { role: 'user' | 'assistant'; content: string }
type MensagemHistorico = { role: 'user' | 'assistant' | 'atendente'; content: string; criado_em: string }
type Notificacao = {
  id: string; gatilho: string; tipo: string; tipoColor: string
  mensagem: string; preview: string; ativo: boolean
}

const FRASES_HUMANO = ['chamar um de nossos atendentes','chamar um atendente','atendente humano','vou chamar','Um momento!','chamo um atendente']
function precisaHumano(msg: string) { return FRASES_HUMANO.some(f => msg.toLowerCase().includes(f.toLowerCase())) }

const NOTIFS_DEFAULT: Notificacao[] = [
  { id: 'pedido_feito', gatilho: 'Pedido feito', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Olá ***CLIENTE_NOME*** 👋, seu pedido ***VENDA_NUMERO*** foi recebido com sucess...',
    mensagem: 'Olá ***CLIENTE_NOME*** 👋,\nseu pedido ***VENDA_NUMERO*** foi recebido com sucesso.\n\n► *Detalhes*\n**VENDA_PRODUTOS**\n–\n**VENDA_TOTAIS**\n\n► *Entrega*\n**VENDA_ENTREGA**\n**MEU_MINUTOS_DELIVERY**\n\n► *Pagamento*\n**VENDA_PAGAMENTO**' },
  { id: 'pedido_confirmado', gatilho: 'Pedido confirmado', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Obá 🤩! Seu pedido foi confirmado e está sendo preparado....',
    mensagem: 'Obá 🤩!\nSeu pedido foi confirmado e está sendo preparado.' },
  { id: 'pedido_pronto', gatilho: 'Pedido pronto para retirada', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: '🛍️ Seu pedido está pronto para retirada....',
    mensagem: '🛍️ Seu pedido está pronto para retirada.' },
  { id: 'pedido_saiu', gatilho: 'Pedido saiu para entrega', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: '🛵 Seu pedido está pronto e sairá para entrega....',
    mensagem: '🛵 Seu pedido está pronto e sairá para entrega.' },
  { id: 'pedido_entregue', gatilho: 'Pedido retirado ou entregue', tipo: 'Delivery', tipoColor: '#a855f7', ativo: true,
    preview: 'Olá ***CLIEN
