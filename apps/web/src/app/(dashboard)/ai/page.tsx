'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Send, Sparkles, Bot, User, Trash2, Copy,
  TrendingUp, AlertTriangle, Package, DollarSign,
  RefreshCw, Mic, Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import dayjs from 'dayjs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: <TrendingUp className="h-4 w-4" />, text: '¿Cuál es mi producto más rentable?' },
  { icon: <Package className="h-4 w-4" />, text: '¿Qué productos debo reabastecer urgente?' },
  { icon: <DollarSign className="h-4 w-4" />, text: 'Muéstrame un resumen financiero del mes' },
  { icon: <AlertTriangle className="h-4 w-4" />, text: '¿Qué alertas importantes tengo hoy?' },
  { icon: <Lightbulb className="h-4 w-4" />, text: 'Dame 3 estrategias para aumentar ventas' },
  { icon: <Sparkles className="h-4 w-4" />, text: 'Genera una campaña de promoción' },
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: insights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then((r) => r.data.data),
  });

  const chat = useMutation({
    mutationFn: (message: string) =>
      api.post('/ai/chat', { message, conversationId }).then((r) => r.data.data),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: new Date() },
      ]);
    },
    onError: () => toast.error('Error al comunicarse con el asistente IA'),
  });

  const generateInsights = useMutation({
    mutationFn: () => api.post('/ai/insights/generate').then((r) => r.data.data),
    onSuccess: () => toast.success('Insights generados', { description: 'Nuevos insights de IA disponibles' }),
    onError: () => toast.error('Error al generar insights'),
  });

  const handleSend = (text?: string) => {
    const message = text ?? input.trim();
    if (!message) return;

    setMessages((prev) => [...prev, { role: 'user', content: message, timestamp: new Date() }]);
    setInput('');
    chat.mutate(message);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chat.isPending) {
      inputRef.current?.focus();
    }
  }, [chat.isPending]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar — Insights */}
      <div className="w-72 border-r border-border bg-card flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-nexus-500" />
              <h3 className="font-semibold text-sm">Insights IA</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => generateInsights.mutate()}
              disabled={generateInsights.isPending}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', generateInsights.isPending && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scroll p-3 space-y-2">
          {insights?.map((insight: any) => (
            <div
              key={insight.id}
              className={cn(
                'p-3 rounded-xl border text-xs cursor-pointer select-none hover:shadow-sm transition-all',
                (insight.type === 'warning' || insight.type === 'WARNING') && 'bg-amber-500/5 border-amber-500/20',
                (insight.type === 'opportunity' || insight.type === 'OPPORTUNITY') && 'bg-nexus-500/5 border-nexus-500/20',
                (insight.type === 'alert' || insight.type === 'ALERT') && 'bg-rose-500/5 border-rose-500/20',
                (insight.type === 'trend' || insight.type === 'INSIGHT' || insight.type === 'RECOMMENDATION') && 'bg-emerald-500/5 border-emerald-500/20',
              )}
              onClick={() => handleSend(`Explícame más sobre este insight: ${insight.title}`)}
            >
              <p className="font-semibold mb-1">{insight.title}</p>
              <p className="text-muted-foreground leading-relaxed">{insight.description}</p>
              {insight.action && (
                <p className="mt-2 font-medium text-nexus-500">→ {insight.action}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full font-medium',
                  insight.type === 'warning' && 'bg-amber-500/20 text-amber-600',
                  insight.type === 'opportunity' && 'bg-nexus-500/20 text-nexus-500',
                  insight.type === 'alert' && 'bg-rose-500/20 text-rose-600',
                  insight.type === 'trend' && 'bg-emerald-500/20 text-emerald-600',
                )}>
                  {insight.type}
                </span>
                <span className="text-muted-foreground">Score: {insight.score}/10</span>
              </div>
            </div>
          ))}

          {(!insights || insights.length === 0) && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Genera insights para ver análisis automáticos de tu negocio</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-nexus flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Nexus AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Powered by GPT-4 & Claude</p>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-500">Activo</span>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMessages([]); setConversationId(null); }}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Nueva conversación
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto custom-scroll p-4 space-y-4">
          {/* Welcome */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-nexus flex items-center justify-center mb-4 shadow-nexus-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">¿En qué te puedo ayudar?</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Soy tu asistente de negocios con acceso en tiempo real a los datos de tu empresa.
                Pregúntame sobre ventas, inventario, clientes, estrategias y más.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-nexus-500/40 hover:bg-nexus-500/5 transition-all text-left text-sm group"
                  >
                    <span className="text-nexus-500 group-hover:scale-110 transition-transform">
                      {p.icon}
                    </span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message thread */}
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  msg.role === 'assistant'
                    ? 'bg-gradient-nexus'
                    : 'bg-muted border border-border',
                )}>
                  {msg.role === 'assistant'
                    ? <Bot className="h-4 w-4 text-white" />
                    : <User className="h-4 w-4 text-muted-foreground" />
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3 text-sm relative group',
                  msg.role === 'assistant'
                    ? 'bg-card border border-border rounded-tl-sm'
                    : 'bg-nexus-500 text-white rounded-tr-sm',
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <span className="text-[10px] opacity-50 mt-1 block">
                    {dayjs(msg.timestamp).format('HH:mm')}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copiado'); }}
                      className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>

          {/* Typing indicator */}
          {chat.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-nexus flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-nexus-500/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 items-center"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre tu negocio..."
              className="flex-1 h-11"
              disabled={chat.isPending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              type="submit"
              className="h-11 w-11 shrink-0 p-0 bg-nexus-500 hover:bg-nexus-600"
              disabled={!input.trim() || chat.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            La IA accede a datos reales de tu negocio en tiempo real
          </p>
        </div>
      </div>
    </div>
  );
}
