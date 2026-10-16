import { AlertTriangle, ArrowRight, BookOpenText, Gauge, Inbox, MessagesSquare, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Card } from '@/components/ui/Layout'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import { adminApi } from '@/services/endpoints'
import type { ChatStatus } from '@/types'
import { parseDate } from '@/utils/format'

// Single-series magnitude charts: one validated hue (passes lightness, chroma and 3:1 contrast on white).
const BAR = '#0a9396'
const GRID = '#ebf0f5'
const AXIS_TEXT = '#5a7598'

const OUTCOMES: { status: ChatStatus; label: string; help: string }[] = [
  { status: 'answered', label: 'Answered', help: 'Answered from clinic information' },
  { status: 'fallback', label: 'Answered (backup)', help: 'AI model unavailable; quoted clinic information instead' },
  { status: 'no_context', label: "Couldn't answer", help: 'Not covered by the knowledge base; visitor given contact details' },
  { status: 'safety_redirect', label: 'Medical advice declined', help: 'Diagnosis or treatment question; redirected to a doctor' },
  { status: 'emergency', label: 'Emergency guidance', help: 'Possible emergency; told to call 112 / go to hospital' },
]

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm shadow-lift">
      <p className="text-ink-500">{label}</p>
      <p className="font-semibold text-ink-900">
        {payload[0].value} question{payload[0].value === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const overview = useApi('admin:overview', adminApi.overview, { cache: false })

  if (overview.loading) return <PageLoader label="Loading dashboard…" />
  if (overview.error || !overview.data) return <ErrorState message={overview.error?.message ?? 'No data'} onRetry={overview.reload} />

  const { chat, knowledge, unread_messages, active_doctors, active_services } = overview.data
  const days = chat.per_day.map((d) => ({
    label: parseDate(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    count: d.count,
  }))
  const outcomes = OUTCOMES.map((o) => ({ ...o, count: chat.by_status[o.status] ?? 0 }))
  const isAdmin = user?.role === 'admin'
  const isDoctor = user?.role === 'doctor'

  return (
    <>
      <AdminPageHeader
        title={isDoctor ? `Doctor Portal: Welcome, ${user?.full_name}` : 'Dashboard'}
        description={
          isDoctor
            ? 'Monitor incoming patient consultation requests, clinic schedule, and AI assistant inquiries.'
            : 'How the AI assistant is being used, and the health of its knowledge base.'
        }
      />

      {isDoctor && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-900 p-6 text-white shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                <span>🩺 Outpatient Consultant</span>
                <span>•</span>
                <span>Cedarline Multispeciality</span>
              </div>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">{user?.full_name}</h2>
              <p className="mt-1 text-sm text-brand-100 max-w-xl">
                You have <strong className="text-white underline">{unread_messages} patient appointment request{unread_messages === 1 ? '' : 's'}</strong> awaiting your review or front-desk confirmation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/admin/messages"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-900 shadow-sm hover:bg-brand-50 transition-colors"
              >
                <span>View Patient List</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/admin/doctors"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/25 transition-colors"
              >
                <span>Clinic Schedule</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<MessagesSquare className="size-5" />} label="Questions today" value={chat.today} highlight />
        <StatTile icon={<Sparkles className="size-5" />} label={`Questions, last ${chat.window_days} days`} value={chat.total} />
        <StatTile
          icon={<ShieldCheck className="size-5" />}
          label="Answered from clinic information"
          value={chat.answered_rate === null ? '—' : `${Math.round(chat.answered_rate * 100)}%`}
        />
        <StatTile
          icon={<Gauge className="size-5" />}
          label="Average reply time"
          value={chat.avg_latency_ms === null ? '—' : `${(chat.avg_latency_ms / 1000).toFixed(1)} s`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="font-bold">Questions per day</h2>
          <p className="text-sm text-ink-500">Last {days.length} days, all outcomes</p>
          <div className="mt-6 h-64" role="img" aria-label={`Bar chart of chatbot questions per day: ${days.map((d) => `${d.label} ${d.count}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} interval="preserveStartEnd" minTickGap={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f8fb' }} />
                <Bar dataKey="count" fill={BAR} maxBarSize={24} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#23436a" fontSize={12} formatter={(v: unknown) => (v ? String(v) : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">Outcomes</h2>
          <p className="text-sm text-ink-500">Last {chat.window_days} days</p>
          {chat.total === 0 ? (
            <p className="mt-10 text-center text-sm text-ink-500">No questions yet. Try the assistant on the website.</p>
          ) : (
            <div className="mt-6 h-64" role="img" aria-label={`Bar chart of chatbot outcomes: ${outcomes.map((o) => `${o.label} ${o.count}`).join(', ')}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomes} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" dataKey="count" allowDecimals={false} domain={[0, 'dataMax']} tick={false} tickLine={false} axisLine={false} height={4} />
                  <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f5f8fb' }} />
                  <Bar dataKey="count" fill={BAR} maxBarSize={24} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" fill="#23436a" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-bold">Knowledge base</h2>
            {isAdmin && (
              <Link to="/admin/knowledge" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Manage <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <p className="text-sm text-ink-500">What the assistant is allowed to answer from</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Documents" value={knowledge.documents} />
            <Metric label="Ready" value={knowledge.ready} />
            <Metric label="Searchable chunks" value={knowledge.chunks} />
            <Metric label="Doctors · services" value={`${active_doctors} · ${active_services}`} />
          </dl>
          {knowledge.failed > 0 && (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {knowledge.failed} document{knowledge.failed === 1 ? '' : 's'} failed to index. Re-index from Chatbot knowledge.
            </p>
          )}
          <p className="mt-5 flex items-center gap-2 text-xs text-ink-500">
            <BookOpenText className="size-4" aria-hidden="true" /> Embedding model: <code className="font-mono">{knowledge.embedding_model}</code>
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold">What the outcomes mean</h2>
          <ul className="mt-4 divide-y divide-ink-100 text-sm">
            {outcomes.map((o) => (
              <li key={o.status} className="flex items-start justify-between gap-4 py-2.5">
                <div>
                  <p className="font-semibold text-ink-900">{o.label}</p>
                  <p className="text-ink-500">{o.help}</p>
                </div>
                <span className="font-semibold text-ink-900 tabular-nums">{o.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-500">Only the outcome is recorded. Visitors' questions and answers are never stored.</p>
        </Card>
      </div>

      <Link to="/admin/messages" className="mt-6 block">
        <Card className="flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-lift">
          <span className="flex items-center gap-4">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
              <Inbox className="size-5" />
            </span>
            <span>
              <span className="block font-bold text-ink-900">
                {unread_messages} unread contact message{unread_messages === 1 ? '' : 's'}
              </span>
              <span className="block text-sm text-ink-500">From the Contact Us form</span>
            </span>
          </span>
          <ArrowRight className="size-5 text-ink-400" aria-hidden="true" />
        </Card>
      </Link>
    </>
  )
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-ink-50 px-4 py-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-ink-900 tabular-nums">{value}</dd>
    </div>
  )
}

function StatTile({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${highlight ? 'bg-accent-50 text-accent-600' : 'bg-brand-50 text-brand-700'}`} aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-3xl font-bold text-ink-900 tabular-nums">{value}</p>
        <p className="text-sm text-ink-500">{label}</p>
      </div>
    </Card>
  )
}
