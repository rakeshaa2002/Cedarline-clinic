import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  Copy,
  MapPin,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkle,
  Stethoscope,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ChatBookingStart } from '@/components/chat/ChatBooking'
import { Spinner } from '@/components/ui/Feedback'
import { useVoiceInput } from '@/components/chat/useVoiceInput'
import { DoctorPhoto } from '@/components/site/Cards'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { OPEN_CHAT_EVENT } from '@/components/chat/openChat'
import { RichText } from '@/components/chat/RichText'
import { toApiError } from '@/services/api'
import { chatApi } from '@/services/endpoints'
import type { BookingConfirmation, ChatDoctor, ChatResponse, ChatTurn } from '@/types'
import { cn, formatDate, formatPrice, formatTime } from '@/utils/format'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  status?: ChatResponse['status']
  sources?: ChatResponse['sources']
  actions?: ChatResponse['actions']
  doctors?: ChatResponse['doctors']
  suggestions?: ChatResponse['suggestions']
  booking?: BookingConfirmation // set on the confirmation message after an in-chat booking
  error?: boolean
}

const STORAGE_KEY = 'cedarline.chat.v2'
const MAX_CHARS = 500
const WHATSAPP_NUMBER = '919483541927'

const WELCOME = [
  "Hi there! 👋 I'm **Cedarline AI**, your clinic concierge. I can help you with:",
  '',
  '- Clinic **timings & location**',
  '- **Doctors**, departments & consultation fees',
  '- **Dental, skin & hair** treatments',
  '- Or **book an appointment** in under 2 minutes!',
].join('\n')

// Shown under the welcome message until the first question is asked.
const STARTERS = [
  { label: '🕒 Timings & Location', question: 'What are the clinic timings and where is the clinic located?' },
  { label: '👩‍⚕️ Doctors & Fees', question: 'Which doctors are available and what are the consultation fees?' },
  { label: '🦷 Dental Care & Braces', question: 'What dental treatments do you offer, and how much do braces cost?' },
  { label: '✨ Skin Treatments', question: 'What skin treatments are available at the clinic?' },
  { label: '💇 Hair & Scalp Care', question: 'What hair and scalp treatments do you offer?' },
  { label: '📅 Book an Appointment', question: 'How do I book an appointment?' },
]

// Always visible above the composer.
const QUICK = [
  { label: '📅 Book now', question: null },
  { label: '🕒 Timings', question: 'What are the clinic timings today?' },
  { label: '👩‍⚕️ Doctors', question: 'Which doctors are available at the clinic?' },
  { label: '🦷 Dental', question: 'What dental treatments do you offer?' },
  { label: '✨ Skin', question: 'What skin treatments are available at the clinic?' },
  { label: '💇 Hair', question: 'What hair and scalp treatments do you offer?' },
  { label: '📍 Location', question: 'Where is the clinic located?' },
]

// The booking flow pulls in form libraries, so it's only downloaded when a patient starts booking.
const ChatBooking = lazy(() => import('@/components/chat/ChatBooking').then((m) => ({ default: m.ChatBooking })))

const uid = () => Math.random().toString(36).slice(2, 10)
const plain = (text: string) => text.replace(/\*\*/g, '')
const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`

function scrollToBooking() {
  setTimeout(() => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
  }, 50)
}

/** Booking links land on the form itself; "/appointments?doctor=x" keeps the doctor pre-selected. */
const linkTarget = (href: string) => (href.startsWith('/appointments') && !href.includes('#') ? `${href}#book` : href)

function actionIcon(href: string): LucideIcon {
  if (href.startsWith('/appointments')) return Calendar
  if (href.startsWith('/doctors')) return UsersRound
  if (href.startsWith('/contact')) return MapPin
  return Stethoscope
}

/** Query string doctor (e.g. "/appointments?doctor=arjun-nair") of a booking link, if any. */
const bookingDoctor = (href: string) => new URLSearchParams(href.split('?')[1]?.split('#')[0] ?? '').get('doctor')

const bookingSummary = (b: BookingConfirmation) =>
  `${b.reference} with ${b.doctor.full_name} on ${formatDate(b.appointment_date, { weekday: 'short', day: 'numeric', month: 'short' })} at ${formatTime(b.start_time)}`

/** A pre-filled WhatsApp message so reception sees what the patient already asked the assistant. */
function consultationSummary(messages: Message[]): string {
  const booking = [...messages].reverse().find((m) => m.booking)?.booking
  const questions = messages.filter((m) => m.role === 'user').slice(-3).map((m) => `• ${m.content}`)
  return [
    'Hello Cedarline Clinic, I was chatting with your website assistant.',
    booking && `My booking: ${bookingSummary(booking)}.`,
    questions.length ? `I'd like help with:\n${questions.join('\n')}` : 'I would like to speak with reception.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

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
  const [openedAt, setOpenedAt] = useState(0)
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const [showTeaser, setShowTeaser] = useState(false)
  const [booking, setBooking] = useState<(ChatBookingStart & { key: number }) | null>(null)
  const voice = useVoiceInput(setInput)

  const dismissTeaser = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setShowTeaser(false)
    try {
      sessionStorage.setItem('cedarline.chat.teaser_dismissed', 'true')
    } catch {
      /* storage unavailable */
    }
  }, [])

  const openPanel = useCallback(() => {
    dismissTeaser()
    setOpenedAt(Date.now())
    setOpen(true)
  }, [dismissTeaser])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      /* storage unavailable: history simply isn't kept */
    }
  }, [messages])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, open, booking])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    launcherRef.current?.focus()
  }, [])

  const restart = () => {
    setMessages([])
    setInput('')
    setOpenedAt(Date.now())
    inputRef.current?.focus()
  }

  const send = useCallback(
    async (text: string, base?: Message[]) => {
      const question = text.trim().slice(0, MAX_CHARS)
      if (!question || pending) return
      const prior = base ?? messages
      const userMsg: Message = { id: uid(), role: 'user', content: question, createdAt: Date.now() }
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
          {
            id: uid(),
            role: 'assistant',
            content: res.answer,
            createdAt: Date.now(),
            status: res.status,
            sources: res.sources,
            actions: res.actions,
            doctors: res.doctors,
            suggestions: res.suggestions,
          },
        ])
      } catch (err) {
        const e = toApiError(err)
        const content =
          e.status === 429
            ? 'You are sending messages a little too quickly. Please wait a moment and try again.'
            : e.status === 503
              ? e.message
              : 'Sorry, I could not reach the clinic assistant. Please check your connection and try again.'
        setMessages((m) => [...m, { id: uid(), role: 'assistant', content, createdAt: Date.now(), error: true }])
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
      openPanel()
      const question = (e as CustomEvent<string | undefined>).detail
      if (question) void sendRef.current(question)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [openPanel])

  // A new key restarts the flow even if one is already open (e.g. "Book now" on another doctor).
  const bookingRuns = useRef(0)
  const startBooking = (start: ChatBookingStart = {}) => setBooking({ ...start, key: ++bookingRuns.current })

  const finishBooking = (b: BookingConfirmation) => {
    setBooking(null)
    const fee = b.consultation_fee !== null ? `\n- **Consultation fee:** ${formatPrice(b.consultation_fee)} (paid at the clinic)` : ''
    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: 'assistant',
        createdAt: Date.now(),
        status: 'answered',
        booking: b,
        content:
          `**✅ Slot reserved · ${b.reference}**\n\n` +
          `- **Doctor:** ${b.doctor.full_name} (${b.doctor.specialization})\n` +
          `- **When:** ${formatDate(b.appointment_date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${formatTime(b.start_time)}` +
          fee +
          `\n\nThe front desk will confirm by email at **${b.patient_email}** with a calendar invite. Please arrive 10 minutes early.`,
        suggestions: [
          { label: 'Clinic location', message: 'Where is the clinic located?' },
          { label: 'What to bring', message: 'What should I bring to my appointment?' },
        ],
      },
    ])
  }

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
            onClick={openPanel}
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
            href={whatsappUrl('Hello Cedarline Clinic, I would like to enquire about an appointment.')}
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
            onClick={() => (open ? close() : openPanel())}
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
          className="fixed inset-0 z-[65] flex animate-pop flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 sm:inset-auto sm:right-6 sm:bottom-28 sm:h-[min(660px,calc(100vh-8.5rem))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-ink-100 sm:shadow-[0_20px_60px_-15px_rgba(13,33,57,0.3)]"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-ink-950 via-brand-900 to-brand-600 px-4 py-3 text-white">
            <span className="relative shrink-0">
              <span className="block size-10 overflow-hidden rounded-full bg-white ring-2 ring-white/40">
                <img src="/images/medical-ai-logo.jpg" alt="" className="size-full object-cover" />
              </span>
              <span className="absolute right-0 bottom-0 size-3 rounded-full bg-emerald-400 ring-2 ring-ink-950" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate font-display text-[1.0625rem] font-extrabold leading-tight tracking-tight text-white">
                Cedarline AI Concierge
              </h2>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-white/85">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="font-semibold text-emerald-300">Online</span>
                <span aria-hidden="true">•</span>
                <span className="truncate">Cedarline Clinic Bengaluru</span>
              </p>
            </div>
            <button
              type="button"
              onClick={restart}
              disabled={pending}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-default disabled:opacity-50"
              aria-label="Start a new conversation"
              title="Start a new conversation"
            >
              <RotateCcw className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={close}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Minimise chat"
              title="Minimise chat"
            >
              <ChevronDown className="size-5" />
            </button>
          </div>

          <p className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-50/90 px-4 py-1.5 text-[0.6875rem] leading-4 text-amber-900">
            <ShieldCheck className="size-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            Not medical advice. In an emergency, call 112.
          </p>

          {/* Messages */}
          <div ref={logRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-5 overflow-y-auto bg-ink-50/60 px-4 py-5">
            <AssistantMessage at={messages[0]?.createdAt ?? openedAt} copyText={plain(WELCOME)}>
              <RichText text={WELCOME} onNavigate={() => setOpen(false)} />
            </AssistantMessage>

            {messages.length === 0 && (
              <div role="group" aria-label="Suggested questions" className="flex flex-wrap gap-1.5 pl-9">
                {STARTERS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void send(s.question)}
                    className="cursor-pointer rounded-full border border-ink-200 bg-white px-3 py-1.5 text-left text-[0.8125rem] font-medium text-ink-800 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 hover:shadow-sm active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex flex-col items-end animate-fade-up">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-white shadow-md">
                    <span className="sr-only">You said: </span>
                    {m.content}
                  </p>
                  <span className="mt-1.5 pr-1 text-[0.6875rem] font-medium text-ink-400">
                    <MessageTime key={m.createdAt} at={m.createdAt} />
                  </span>
                </div>
              ) : (
                <Fragment key={m.id}>
                <AssistantMessage
                  at={m.createdAt}
                  copyText={m.error ? undefined : plain(m.content)}
                  tone={m.error ? 'error' : m.status === 'emergency' ? 'emergency' : m.status === 'safety_redirect' ? 'safety' : 'default'}
                >
                  <RichText text={m.content} onNavigate={() => setOpen(false)} />
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
                  {m.booking && (
                    <a
                      href={whatsappUrl(`Hello Cedarline Clinic, I just booked in your website chat: ${bookingSummary(m.booking)}. Please confirm my slot.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#20bd5a]"
                    >
                      <WhatsAppIcon className="size-4.5" /> Fast-track on WhatsApp
                    </a>
                  )}
                  {!!m.doctors?.length && (
                    <div className="mt-3.5 space-y-2.5">
                      {m.doctors.map((d) => (
                        <DoctorCard key={d.slug} doctor={d} onBook={() => startBooking({ doctorSlug: d.slug })} />
                      ))}
                    </div>
                  )}
                  {!!m.sources?.length && (
                    <p className="mt-3 flex items-start gap-1.5 text-[0.6875rem] leading-4 text-ink-400">
                      <BookOpen className="mt-px size-3 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-ink-500">Sources:</span> {m.sources.map((s) => s.title).join(' · ')}
                      </span>
                    </p>
                  )}
                  {!!m.actions?.length && (
                    <div className="mt-3.5 space-y-2 border-t border-ink-100 pt-3.5">
                      {m.actions.map((a, index) => {
                        const Icon = actionIcon(a.href)
                        const className = cn(
                          'group/action flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]',
                          index === 0
                            ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:shadow-md'
                            : 'bg-white text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50 hover:ring-brand-300',
                        )
                        const body = (
                          <>
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="flex-1 text-left">{a.label}</span>
                            <ArrowRight className="size-4 shrink-0 transition-transform group-hover/action:translate-x-0.5" aria-hidden="true" />
                          </>
                        )
                        // Booking happens right here in the chat; other links open their page.
                        return a.href.startsWith('/appointments') ? (
                          <button key={a.href} type="button" className={className} onClick={() => startBooking({ doctorSlug: bookingDoctor(a.href) })}>
                            {body}
                          </button>
                        ) : (
                          <Link key={a.href} to={linkTarget(a.href)} onClick={() => setOpen(false)} className={className}>
                            {body}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </AssistantMessage>
                {i === messages.length - 1 && !pending && !!m.suggestions?.length && (
                  <div role="group" aria-label="Follow-up questions" className="-mt-2 flex flex-wrap gap-1.5 pl-9">
                    {m.suggestions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => void send(s.message)}
                        className="cursor-pointer rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 hover:shadow-sm active:scale-95"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                </Fragment>
              ),
            )}

            {booking && !pending && (
              <Suspense fallback={<Spinner label="Opening booking" />}>
                <ChatBooking
                  key={booking.key}
                  start={booking}
                  onDone={finishBooking}
                  onCancel={() => setBooking(null)}
                  onLeave={() => {
                    setBooking(null)
                    setOpen(false)
                    scrollToBooking()
                  }}
                />
              </Suspense>
            )}

            {pending && (
              <AssistantMessage>
                <span className="flex items-center gap-1.5 py-1" role="status" aria-label="Assistant is typing">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="size-2 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </AssistantMessage>
            )}
          </div>

          {/* Quick questions */}
          <div className="border-t border-ink-100 bg-ink-50">
            <div role="group" aria-label="Quick questions" className="flex items-center gap-2 overflow-x-auto px-3 pt-2.5 pb-2 whitespace-nowrap">
              <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-bold tracking-wider text-brand-800 uppercase">
                <span aria-hidden="true">✨</span> Quick:
              </span>
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => (q.question ? void send(q.question) : startBooking())}
                  className="shrink-0 cursor-pointer rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-800 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:scale-95"
                >
                  {q.label}
                </button>
              ))}
              <a
                href={whatsappUrl(consultationSummary(messages))}
                title="Continue on WhatsApp with a summary of this chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition-all duration-150 hover:border-emerald-300 hover:bg-emerald-50 active:scale-95"
              >
                <WhatsAppIcon className="size-3.5 text-[#25D366]" /> WhatsApp
              </a>
            </div>
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="bg-white px-3 pt-2.5 pb-2.5">
            <div className="flex items-end gap-2 rounded-2xl border-2 border-brand-500/60 bg-white py-1.5 pr-1.5 pl-3.5 transition-all duration-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
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
                placeholder={voice.listening ? 'Listening… speak now' : 'Ask about doctors, fees, treatments…'}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={voice.listening ? voice.stop : voice.start}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? 'Stop voice input' : 'Speak your question'}
                  title={voice.listening ? 'Stop listening' : 'Speak your question'}
                  className={cn(
                    'grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl transition-all',
                    voice.listening ? 'animate-pulse bg-red-500 text-white shadow-md' : 'text-ink-500 hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  <Mic className="size-4.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || pending}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-brand-500 text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md active:scale-95 disabled:cursor-default disabled:bg-ink-300 disabled:shadow-none"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[0.6875rem]">
              <span className="flex min-w-0 items-center gap-1 truncate font-medium text-ink-500">
                <span aria-hidden="true">✨</span> Cedarline AI Concierge
                {voice.error && <span className="text-red-700">· {voice.error}</span>}
                <span aria-live="polite" className="text-amber-700">
                  {input.length > MAX_CHARS - 80 ? `· ${MAX_CHARS - input.length} left` : ''}
                </span>
              </span>
              <Link
                to="/appointments#book"
                onClick={() => {
                  setOpen(false)
                  scrollToBooking()
                }}
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-600 transition-colors hover:text-brand-800 hover:underline"
              >
                <CalendarCheck className="size-3.5" aria-hidden="true" /> Book Online
              </Link>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

/** Compact doctor profile inside an answer: photo, specialty, schedule, fee and a direct booking link. */
function DoctorCard({ doctor, onBook }: { doctor: ChatDoctor; onBook: () => void }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-[0_4px_14px_-6px_rgba(13,33,57,0.18)] ring-1 ring-ink-100">
      <DoctorPhoto doctor={doctor} className="size-14 shrink-0 rounded-xl text-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-5 font-bold text-ink-900">{doctor.full_name}</p>
        <p className="text-xs leading-4 text-ink-500">
          {doctor.specialization} · {doctor.experience_years} yrs exp.
        </p>
        <p className="mt-1 flex items-start gap-1 text-[0.6875rem] leading-4 text-ink-500">
          <Clock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {doctor.schedule}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap text-brand-800 ring-1 ring-brand-100">
            {doctor.consultation_fee !== null ? `Consultation: ${formatPrice(doctor.consultation_fee)}` : 'Fee at front desk'}
          </span>
          <button
            type="button"
            onClick={onBook}
            className="shrink-0 cursor-pointer text-xs font-bold text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline"
            aria-label={`Book an appointment with ${doctor.full_name}`}
          >
            Book now →
          </button>
        </div>
      </div>
    </div>
  )
}

/** "Just now" for the first minute, then the clock time (e.g. 5:06 PM). */
function MessageTime({ at }: { at: number }) {
  const [fresh, setFresh] = useState(() => Date.now() - at < 60_000)

  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(() => setFresh(false), Math.max(0, at + 60_000 - Date.now()))
    return () => clearTimeout(t)
  }, [at, fresh])

  return (
    <time dateTime={new Date(at).toISOString()}>
      {fresh ? 'Just now' : new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
    </time>
  )
}

function AssistantMessage({
  children,
  tone = 'default',
  at,
  copyText,
}: {
  children: ReactNode
  tone?: 'default' | 'error' | 'emergency' | 'safety'
  at?: number
  copyText?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
    } catch {
      /* clipboard unavailable (e.g. insecure context) */
    }
  }

  const alert = tone === 'emergency' || tone === 'error'

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-2.5">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-xl shadow-sm',
            alert ? 'bg-red-100 text-red-700' : 'bg-gradient-to-br from-brand-600 to-brand-900 text-white',
          )}
          aria-hidden="true"
        >
          {alert ? <AlertTriangle className="size-4" /> : <Sparkle className="size-4 fill-current" />}
        </span>
        <div
          className={cn(
            'max-w-[85%] min-w-0 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-6 shadow-sm ring-1 transition-all',
            tone === 'default' && 'bg-white text-ink-800 ring-ink-100/90 shadow-[0_2px_8px_-2px_rgba(13,33,57,0.06)]',
            tone === 'safety' && 'bg-amber-50 text-amber-950 ring-amber-200/90 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.08)]',
            alert && 'bg-red-50 text-red-950 ring-red-200/90 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.08)]',
          )}
        >
          <span className="sr-only">Assistant: </span>
          {children}
        </div>
      </div>
      {at !== undefined && (
        <div className="mt-1.5 flex items-center gap-3 pl-1 text-[0.6875rem] font-medium text-ink-400">
          <MessageTime key={at} at={at} />
          {copyText && (
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-brand-700"
              aria-label={copied ? 'Copied to clipboard' : 'Copy message'}
            >
              {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
