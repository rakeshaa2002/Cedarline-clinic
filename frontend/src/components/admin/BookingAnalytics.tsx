import { ArrowRight, CalendarClock, CalendarDays, ClipboardList, IndianRupee, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/Feedback'
import { Card } from '@/components/ui/Layout'
import { useApi } from '@/hooks/useApi'
import { adminApi } from '@/services/endpoints'
import type { AppointmentAnalytics } from '@/types'
import { DEPARTMENT_LABELS, cn, formatPrice } from '@/utils/format'

// Same single validated hue as the assistant charts: every chart here is one series (magnitude).
const BAR = '#0a9396'
const GRID = '#ebf0f5'
const AXIS_TEXT = '#5a7598'

type MonthRow = AppointmentAnalytics['by_month'][number] & { label: string }

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthRow }[] }) {
  if (!active || !payload?.length) return null
  const m = payload[0].payload
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm shadow-lift">
      <p className="font-semibold text-ink-900">
        {m.label}: {m.total} booking{m.total === 1 ? '' : 's'}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        {m.completed} completed · {m.confirmed} confirmed · {m.pending} pending · {m.cancelled} cancelled
      </p>
    </div>
  )
}

const percent = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

/** Booking KPIs, monthly consultations and department demand for the admin dashboard. */
export function BookingAnalytics() {
  const analytics = useApi('admin:appointment-analytics', adminApi.appointmentAnalytics, { cache: false })
  const a = analytics.data

  if (!a) {
    return analytics.error ? null : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }

  const months: MonthRow[] = a.by_month.map((m) => ({
    ...m,
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
  }))
  const maxDept = Math.max(1, ...a.by_department.map((d) => d.total))
  const sources = Object.entries(a.by_source)
  const sourceTotal = sources.reduce((sum, [, n]) => sum + (n ?? 0), 0)

  return (
    <section aria-labelledby="bookings-heading" className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id="bookings-heading" className="text-lg font-bold">Bookings</h2>
        <Link to="/admin/appointments" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
          Open triage queue <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi to="/admin/appointments?status=pending" icon={<ClipboardList className="size-5" />} label="Awaiting triage" value={a.pending} highlight={a.pending > 0} />
        <Kpi icon={<CalendarClock className="size-5" />} label="Visits today" value={a.today} />
        <Kpi icon={<CalendarDays className="size-5" />} label="Booked, next 7 days" value={a.upcoming_7_days} />
        <Kpi icon={<TrendingUp className="size-5" />} label="Booking conversion" value={percent(a.conversion_rate)} hint={`${percent(a.cancellation_rate)} cancelled`} />
        <Kpi icon={<IndianRupee className="size-5" />} label="Consultation fees, this month" value={formatPrice(a.revenue_this_month) ?? '₹0'} hint={`${formatPrice(a.revenue_total)} all time`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h3 className="font-bold">Consultations per month</h3>
          <p className="text-sm text-ink-500">By appointment date, all statuses · hover a bar for the breakdown</p>
          <div
            className="mt-6 h-64"
            role="img"
            aria-label={`Bar chart of bookings per month: ${months.map((m) => `${m.label} ${m.total}`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                <Tooltip content={<MonthTooltip />} cursor={{ fill: '#f5f8fb' }} />
                <Bar dataKey="total" fill={BAR} maxBarSize={32} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="total" position="top" fill="#23436a" fontSize={12} formatter={(v: unknown) => (v ? String(v) : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold">Demand by department</h3>
          <p className="text-sm text-ink-500">All bookings, with fees from visits that went ahead</p>
          {a.by_department.length === 0 ? (
            <p className="mt-10 text-center text-sm text-ink-500">No bookings yet.</p>
          ) : (
            <table className="mt-5 w-full text-sm">
              <caption className="sr-only">Bookings and consultation fees by department</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Department</th>
                  <th scope="col">Bookings</th>
                  <th scope="col">Fees</th>
                </tr>
              </thead>
              <tbody>
                {a.by_department.map((d) => (
                  <tr key={d.department} className="group">
                    <th scope="row" className="w-36 py-2 pr-3 text-left font-medium text-ink-700">{DEPARTMENT_LABELS[d.department]}</th>
                    <td className="py-2">
                      <div className="flex items-center gap-2" title={`${d.total} bookings`}>
                        <div className="h-3 rounded-r-[4px]" style={{ width: `${(d.total / maxDept) * 100}%`, background: BAR, minWidth: 4 }} />
                        <span className="font-semibold text-ink-900 tabular-nums">{d.total}</span>
                      </div>
                    </td>
                    <td className="w-24 py-2 text-right text-ink-500 tabular-nums">{formatPrice(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {sourceTotal > 0 && (
            <p className="mt-5 border-t border-ink-100 pt-4 text-xs text-ink-500">
              Booked via{' '}
              {sources.map(([source, n], i) => (
                <span key={source}>
                  {i > 0 && ' · '}
                  <strong className="text-ink-800">{source === 'chatbot' ? 'AI chat' : source === 'website' ? 'Website' : 'Front desk'}</strong>{' '}
                  {Math.round(((n ?? 0) / sourceTotal) * 100)}%
                </span>
              ))}
            </p>
          )}
        </Card>
      </div>
    </section>
  )
}

function Kpi({ icon, label, value, hint, highlight, to }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; highlight?: boolean; to?: string }) {
  const body = (
    <Card className={cn('flex h-full items-center gap-3 p-4', to && 'transition-shadow hover:shadow-lift')}>
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', highlight ? 'bg-accent-50 text-accent-600' : 'bg-brand-50 text-brand-700')} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl leading-tight font-bold whitespace-nowrap text-ink-900 tabular-nums">{value}</p>
        <p className="text-sm text-ink-500">{label}</p>
        {hint && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}
