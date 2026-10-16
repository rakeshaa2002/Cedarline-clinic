import { AlertTriangle, ArrowUp, BookOpen, Bot, MessageCircle, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { OPEN_CHAT_EVENT } from '@/components/chat/openChat'
import { RichText } from '@/components/chat/RichText'
import { toApiError } from '@/services/api'
import { chatApi } from '@/services/endpoints'
import type { ChatResponse, ChatTurn } from '@/types'
import { cn } from '@/utils/format'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: ChatResponse['status']
  sources?: ChatResponse['sources']
  actions?: ChatResponse['actions']
  error?: boolean
}

const STORAGE_KEY = 'cedarline.chat.v1'
const MAX_CHARS = 500
const SUGGESTIONS = [
  'What are the clinic timings?',
  'Which doctors are available?',
  'What dental treatments do you offer?',
  'How do I book an appointment?',
]

const uid = () => Math.random().toString(36).slice(2, 10)

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

/** Floating assistant available on every public page. History lives only in this browser tab. */
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      /* storage unavailable: history simply isn't kept */
    }
  }, [messages])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    launcherRef.current?.focus()
  }, [])

  const send = useCallback(
    async (text: string, base?: Message[]) => {
      const question = text.trim().slice(0, MAX_CHARS)
      if (!question || pending) return
      const prior = base ?? messages
      const userMsg: Message = { id: uid(), role: 'user', content: question }
      setMessages([...prior, userMsg])
      setInput('')
      setPending(true)
      // Send recent successful turns so follow-up questions have context.
      const history: ChatTurn[] = prior
        .filter((m) => !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
      try {
        const res = await chatApi.ask(question, history)
        setMessages((m) => [
          ...m,
          { id: uid(), role: 'assistant', content: res.answer, status: res.status, sources: res.sources, actions: res.actions },
        ])
      } catch (err) {
        const e = toApiError(err)
        const content =
          e.status === 429
            ? 'You are sending messages a little too quickly. Please wait a moment and try again.'
            : e.status === 503
              ? e.message
              : 'Sorry, I could not reach the clinic assistant. Please check your connection and try again.'
        setMessages((m) => [...m, { id: uid(), role: 'assistant', content, error: true }])
      } finally {
        setPending(false)
      }
    },
    [messages, pending],
  )

  // Let other components open the assistant (and optionally ask a question) via openChat().
  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  }, [send])
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true)
      const question = (e as CustomEvent<string | undefined>).detail
      if (question) void sendRef.current(question)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  const retry = (errorId: string) => {
    const idx = messages.findIndex((m) => m.id === errorId)
    const question = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
    if (!question) return
    const base = messages.slice(0, messages.indexOf(question))
    void send(question.content, base)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="clinic-chat"
        aria-label={open ? 'Close clinic assistant' : 'Open clinic assistant chat'}
        className={cn(
          'fixed right-4 bottom-4 z-[60] inline-flex h-14 items-center gap-2.5 rounded-full bg-brand-700 pr-5 pl-4 font-semibold text-white shadow-lift transition-all hover:bg-brand-800 sm:right-6 sm:bottom-6',
          open && 'max-sm:hidden',
        )}
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <MessageCircle className="size-6" aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Ask Cedarline'}</span>
      </button>

      {open && (
        <div
          id="clinic-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="fixed inset-0 z-[65] flex animate-pop flex-col bg-white sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-ink-100 sm:shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-ink-100 bg-brand-800 px-4 py-3.5 text-white sm:rounded-t-3xl">
            <span className="grid size-10 place-items-center rounded-full bg-white/15">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-white">
                Cedarline Assistant
              </h2>
              <p className="truncate text-xs text-brand-100">Answers from approved clinic information</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="grid size-9 place-items-center rounded-lg text-brand-100 hover:bg-white/10 hover:text-white"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="size-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="grid size-9 place-items-center rounded-lg text-brand-100 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-5" />
            </button>
          </div>

          <p className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            General clinic information only — not medical advice. In an emergency, call 112.
          </p>

          {/* Messages */}
          <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto bg-ink-50/60 px-4 py-5">
            <AssistantBubble>
              <p>
                Hello! I can answer questions about Cedarline's <strong>services, doctors, timings, location</strong> and{' '}
                <strong>booking</strong>. How can I help?
              </p>
            </AssistantBubble>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-10" aria-label="Suggested questions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-brand-800 transition-colors hover:border-brand-400 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-white">
                    <span className="sr-only">You said: </span>
                    {m.content}
                  </p>
                </div>
              ) : (
                <AssistantBubble key={m.id} tone={m.error ? 'error' : m.status === 'emergency' ? 'emergency' : m.status === 'safety_redirect' ? 'safety' : 'default'}>
                  <RichText text={m.content} onNavigate={() => window.innerWidth < 640 && setOpen(false)} />
                  {m.error && (
                    <button
                      type="button"
                      onClick={() => retry(m.id)}
                      disabled={pending}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" /> Retry
                    </button>
                  )}
                  {!!m.actions?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.actions.map((a) => (
                        <Link
                          key={a.href}
                          to={a.href}
                          onClick={() => window.innerWidth < 640 && setOpen(false)}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {!!m.sources?.length && (
                    <div className="mt-3 border-t border-ink-100 pt-2.5">
                      <p className="mb-1.5 flex items-center gap-1 text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase">
                        <BookOpen className="size-3" aria-hidden="true" /> Sources
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {m.sources.map((s) => (
                          <li key={s.document_id} className="rounded-md bg-ink-100 px-2 py-0.5 text-[0.6875rem] text-ink-600">
                            {s.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AssistantBubble>
              ),
            )}

            {pending && (
              <AssistantBubble>
                <span className="flex items-center gap-1 py-1" role="status" aria-label="Assistant is typing">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="size-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </AssistantBubble>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-ink-100 bg-white p-3 sm:rounded-b-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-1.5 pl-3.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
              <label htmlFor="chat-input" className="sr-only">
                Ask a question about the clinic
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about services, doctors, timings…"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || pending}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500 text-white transition-colors hover:bg-accent-600 disabled:bg-ink-200"
                aria-label="Send message"
              >
                <ArrowUp className="size-4.5" />
              </button>
            </div>
            <p className="mt-1.5 flex justify-between px-1 text-[0.6875rem] text-ink-400">
              <span>Enter to send · Shift+Enter for a new line</span>
              <span aria-live="polite">{input.length > MAX_CHARS - 80 ? `${MAX_CHARS - input.length} left` : ''}</span>
            </p>
          </form>
        </div>
      )}
    </>
  )
}

function AssistantBubble({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'error' | 'emergency' | 'safety'
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
          tone === 'emergency' || tone === 'error' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700',
        )}
        aria-hidden="true"
      >
        {tone === 'emergency' || tone === 'error' ? <AlertTriangle className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-6 shadow-sm ring-1',
          tone === 'default' && 'bg-white text-ink-800 ring-ink-100',
          tone === 'safety' && 'bg-amber-50 text-amber-950 ring-amber-200',
          (tone === 'emergency' || tone === 'error') && 'bg-red-50 text-red-950 ring-red-200',
        )}
      >
        <span className="sr-only">Assistant: </span>
        {children}
      </div>
    </div>
  )
}
