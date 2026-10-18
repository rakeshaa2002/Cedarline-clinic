import { AlertTriangle, ArrowUp, BookOpen, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
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
  '🩺 Which doctor should I consult?',
  '⏰ Today clinic timings & walk-in?',
  '🦷 Dental cleaning & braces cost?',
  '🧴 Skin rash & hair fall specialist?',
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

  const [showTeaser, setShowTeaser] = useState(false)

  const dismissTeaser = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setShowTeaser(false)
    try {
      sessionStorage.setItem('cedarline.chat.teaser_dismissed', 'true')
    } catch {
      /* storage unavailable */
    }
  }, [])

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
      dismissTeaser()
      setOpen(true)
      const question = (e as CustomEvent<string | undefined>).detail
      if (question) void sendRef.current(question)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [dismissTeaser])

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
      {/* Floating Launcher Container */}
      <div
        className={cn(
          'fixed right-4 bottom-4 z-[60] flex flex-col items-end select-none sm:right-6 sm:bottom-6',
          open && 'max-sm:hidden',
        )}
      >
        {/* Floating AI Teaser / Callout Highlight */}
        {!open && showTeaser && (
          <div
            role="status"
            aria-live="polite"
            onClick={() => {
              dismissTeaser()
              setOpen(true)
            }}
            className="group mb-3 flex cursor-pointer items-center gap-2.5 rounded-2xl border border-brand-200/90 bg-white/95 px-4 py-2 text-xs font-medium text-brand-950 shadow-[0_12px_28px_rgba(13,33,57,0.15)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-brand-400 hover:shadow-[0_16px_36px_rgba(20,133,137,0.25)] sm:px-5 sm:py-2.5 sm:text-sm animate-fade-up"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <span className="font-bold text-brand-900">Questions?</span>
            <span className="text-ink-600 font-medium">Ask Cedarline AI 24/7</span>
            <button
              type="button"
              onClick={dismissTeaser}
              className="ml-1.5 -mr-1 grid size-5 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 cursor-pointer"
              aria-label="Dismiss AI prompt"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Floating WhatsApp Quick Action Button */}
        {!open && (
          <a
            href="https://wa.me/919483541927?text=Hello%20Cedarline%20Clinic%2C%20I%20would%20like%20to%20enquire%20about%20an%20appointment."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with reception on WhatsApp"
            title="Chat with reception on WhatsApp"
            className="group/wa relative mb-3 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.48)] transition-all duration-300 hover:scale-110 hover:shadow-[0_14px_36px_rgba(37,211,102,0.7)] active:scale-95 cursor-pointer sm:size-15"
          >
            <WhatsAppIcon className="size-9 text-white drop-shadow-xs sm:size-10" />
            <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-full bg-ink-950/90 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-white shadow-lg opacity-0 backdrop-blur-md transition-all duration-200 group-hover/wa:opacity-100 group-hover/wa:-translate-x-1 sm:right-17">
              WhatsApp Reception
            </span>
          </a>
        )}

        {/* Animated Wrapper with Levitation Float & Ambient Halo */}
        <div className={cn('relative', !open && 'animate-ai-float hover:[animation-play-state:paused]')}>
          {/* Ambient Breathing Aura & Radar Wave */}
          {!open && (
            <>
              {/* Outer soft multi-color glow */}
              <div
                aria-hidden="true"
                className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-emerald-400/40 via-teal-400/50 to-brand-500/40 blur-xl animate-ai-glow pointer-events-none"
              />
              {/* Expanding radar ping wave */}
              <div
                aria-hidden="true"
                className="absolute -inset-1.5 rounded-full border border-emerald-400/45 animate-ai-ping-slow pointer-events-none"
              />
            </>
          )}

          {/* Launcher Button */}
          <button
            ref={launcherRef}
            type="button"
            onClick={() => {
              if (open) {
                close()
              } else {
                dismissTeaser()
                setOpen(true)
              }
            }}
            aria-expanded={open}
            aria-controls="clinic-chat"
            aria-label={open ? 'Close Cedarline AI assistant' : 'Open Cedarline AI assistant chat'}
            className={cn(
              'group relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-full border border-emerald-400/40 bg-gradient-to-r from-brand-950 via-brand-900 to-teal-950 pl-2.5 pr-5 font-bold text-white cursor-pointer select-none sm:h-[4.5rem] sm:gap-3.5 sm:pl-3 sm:pr-6',
              'shadow-[0_14px_40px_rgba(20,133,137,0.55)] transition-all duration-300 ease-out',
              'hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_22px_56px_rgba(20,133,137,0.75)] hover:border-emerald-300/70 active:scale-95',
            )}
          >
            {/* Specular Light Sweep Shimmer */}
            {!open && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg] animate-ai-shimmer"
              />
            )}

            {/* Medical AI Logo Emblem with glowing live status */}
            <span className="relative flex items-center justify-center shrink-0">
              {open ? (
                <div className="grid size-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 sm:size-12">
                  <X className="size-6 transition-transform duration-300 group-hover:rotate-90 sm:size-7" aria-hidden="true" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  {/* Glowing 3D Medical Stethoscope + Cross Emblem */}
                  <div className="relative size-11 overflow-hidden rounded-full ring-2 ring-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,0.55)] transition-transform duration-300 group-hover:scale-105 sm:size-12">
                    <img
                      src="/images/medical-ai-logo.jpg"
                      alt="Medical AI Stethoscope and Cross Emblem"
                      width={48}
                      height={48}
                      className="size-full object-cover"
                    />
                  </div>
                  {/* Pulsing Emerald Live Indicator */}
                  <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-90" />
                    <span className="relative inline-flex size-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-brand-900" />
                  </span>
                </div>
              )}
            </span>

            {/* Intuitive Label for Non-Technical Users */}
            <div className="flex flex-col text-left">
              <span className="font-display text-[0.9375rem] font-extrabold tracking-tight text-white leading-tight flex items-center gap-1.5 sm:text-[1.0625rem]">
                {open ? 'Close' : 'Ask Cedarline AI'}
                {!open && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/25 text-emerald-300 border border-emerald-400/40 uppercase tracking-wider">
                    24/7
                  </span>
                )}
              </span>
              {!open && (
                <span className="text-[11px] font-medium text-emerald-100/90 leading-tight mt-0.5 flex items-center gap-1">
                  <span>Doctor & Clinic Help</span>
                  <span className="inline-block size-1 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Instant</span>
                </span>
              )}
            </div>

            {/* Glowing Heartbeat / ECG Pulse Wave */}
            {!open && (
              <span className="hidden lg:flex items-center ml-1 text-emerald-300/85 transition-all duration-300 group-hover:text-emerald-200 group-hover:scale-110">
                <svg className="size-6 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="clinic-chat"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="fixed inset-0 z-[65] flex animate-pop flex-col bg-white shadow-2xl transition-all duration-300 sm:inset-auto sm:right-6 sm:bottom-28 sm:h-[min(640px,calc(100vh-8.5rem))] sm:w-[420px] sm:rounded-3xl sm:border sm:border-ink-100 sm:shadow-[0_20px_60px_-15px_rgba(13,33,57,0.3)]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-brand-900/40 bg-gradient-to-r from-brand-950 via-brand-900 to-teal-950 px-4 py-3.5 text-white sm:rounded-t-3xl">
            <span className="relative grid size-11 place-items-center rounded-full overflow-hidden ring-2 ring-emerald-400/80 shadow-[0_0_14px_rgba(52,211,153,0.4)]">
              <img
                src="/images/medical-ai-mascot.jpg"
                alt="Medical AI Doctor Robot"
                className="size-full object-cover"
              />
              <span className="absolute right-0 bottom-0 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400 ring-1 ring-brand-900"></span>
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Cedarline Medical AI</span>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  24/7 Doctor AI
                </span>
              </h2>
              <p className="flex items-center gap-1.5 truncate text-xs text-brand-100 font-medium">
                <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
                <span>·</span>
                <span>Ask Doctors, Timings, Symptoms & Fees</span>
              </p>
            </div>
            <a
              href="https://wa.me/919483541927?text=Hello%20Cedarline%20Clinic%2C%20I%20would%20like%20to%20speak%20with%20reception."
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-9 place-items-center rounded-xl text-emerald-300 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Chat with front desk on WhatsApp"
              title="Chat with front desk on WhatsApp"
            >
              <WhatsAppIcon className="size-5.5 text-[#25D366]" />
            </a>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="grid size-9 place-items-center rounded-xl text-brand-100 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="grid size-9 place-items-center rounded-xl text-brand-100 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-5" />
            </button>
          </div>

          <p className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/90 px-4 py-2 text-xs leading-5 text-amber-900">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            General clinic information only — not medical advice. In an emergency, call 112.
          </p>

          {/* Messages */}
          <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-ink-50/80 via-ink-50/40 to-white px-4 py-5">
            <AssistantBubble>
              <p>
                Hello! I can answer questions about Cedarline's <strong>services, doctors, timings, location</strong> and{' '}
                <strong>booking</strong>. How can I help?
              </p>
            </AssistantBubble>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-9" aria-label="Suggested questions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-brand-200/80 bg-white px-3.5 py-1.5 text-left text-xs font-medium text-brand-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:shadow-md cursor-pointer active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end animate-fade-up">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-white shadow-md">
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
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition-all hover:bg-red-50 hover:shadow-xs active:scale-95 cursor-pointer"
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
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-sm active:scale-95"
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
                          <li key={s.document_id} className="rounded-md bg-ink-100/80 px-2 py-0.5 text-[0.6875rem] font-medium text-ink-600">
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
                <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Assistant is typing">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="size-2 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </AssistantBubble>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-ink-100 bg-white p-3 sm:rounded-b-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-ink-200/90 bg-white p-1.5 pl-3.5 shadow-xs transition-all duration-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 focus-within:shadow-sm">
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
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:from-accent-600 hover:to-accent-700 active:scale-95 disabled:from-ink-200 disabled:to-ink-200 disabled:shadow-none disabled:hover:translate-y-0 cursor-pointer"
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
    <div className="flex gap-2.5 animate-fade-up">
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full overflow-hidden shadow-xs ring-1 ring-brand-200/80',
          tone === 'emergency' || tone === 'error' ? 'bg-red-100 text-red-700' : 'bg-brand-50',
        )}
        aria-hidden="true"
      >
        {tone === 'emergency' || tone === 'error' ? (
          <AlertTriangle className="size-3.5" />
        ) : (
          <img
            src="/images/medical-ai-mascot.jpg"
            alt="Doctor AI"
            className="size-full object-cover"
          />
        )}
      </span>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-6 shadow-sm ring-1 transition-all',
          tone === 'default' && 'bg-white text-ink-800 ring-ink-100/90 shadow-[0_2px_8px_-2px_rgba(13,33,57,0.06)]',
          tone === 'safety' && 'bg-amber-50 text-amber-950 ring-amber-200/90 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.08)]',
          (tone === 'emergency' || tone === 'error') && 'bg-red-50 text-red-950 ring-red-200/90 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.08)]',
        )}
      >
        <span className="sr-only">Assistant: </span>
        {children}
      </div>
    </div>
  )
}
