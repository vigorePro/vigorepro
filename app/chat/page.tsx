'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Mensagem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  pedidoCriado?: boolean
  numeroPedido?: number
}

function ChatContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sessionId] = useState(() => 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9))
  const [nomeEstab, setNomeEstab] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mensagem de boas-vindas
  useEffect(() => {
    if (!slug) return
    setMensagens([{
      id: '0',
      role: 'assistant',
      content: 'Ola! Bem-vindo ao nosso atendimento. Como posso ajudar?',
      timestamp: new Date(),
    }])
    // Busca nome do estabelecimento
    fetch('/api/estabelecimento?slug=' + slug)
      .then(r => r.json())
      .then(d => { if (d.nome) setNomeEstab(d.nome) })
      .catch(() => {})
  }, [slug])

  // Auto scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar() {
    if (!input.trim() || carregando || !slug) return

    const textoUsuario = input.trim()
    setInput('')

    // Adiciona mensagem do usuario
    const msgUsuario: Mensagem = {
      id: Date.now().toString(),
      role: 'user',
      content: textoUsuario,
      timestamp: new Date(),
    }
    setMensagens(prev => [...prev, msgUsuario])
    setCarregando(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: textoUsuario, slug, sessionId }),
      })

      const data = await res.json()

      const msgIA: Mensagem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.resposta || 'Erro ao processar mensagem.',
        timestamp: new Date(),
        pedidoCriado: data.pedidoCriado,
        numeroPedido: data.numeroPedido,
      }
      setMensagens(prev => [...prev, msgIA])
    } catch {
      setMensagens(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro de conexao. Tente novamente.',
        timestamp: new Date(),
      }])
    } finally {
      setCarregando(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  if (!slug) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8">
          <p className="text-gray-600 text-lg">Slug nao informado. Use ?slug=dolcedolce</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center text-xl font-bold">
          {nomeEstab ? nomeEstab[0] : '?'}
        </div>
        <div>
          <p className="font-semibold text-sm">{nomeEstab || slug}</p>
          <p className="text-xs text-green-200">Atendimento por IA • Teste</p>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-green-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.pedidoCriado && msg.numeroPedido && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <p className="text-xs font-semibold">Pedido #{msg.numeroPedido} criado!</p>
                  <a
                    href={`/dashboard?slug=${slug}`}
                    className="text-xs underline mt-1 block"
                    target="_blank"
                  >
                    Ver no Dashboard
                  </a>
                </div>
              )}
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {carregando && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3 flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite uma mensagem..."
          disabled={carregando}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
        />
        <button
          onClick={enviar}
          disabled={carregando || !input.trim()}
          className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 hover:bg-green-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
