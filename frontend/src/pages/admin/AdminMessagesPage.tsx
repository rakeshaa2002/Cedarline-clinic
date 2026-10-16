import { Check, Inbox, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Badge, Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { useApi } from '@/hooks/useApi'
import { AdminPageHeader } from '@/layouts/AdminLayout'
import type { ApiError } from '@/services/api'
import { adminApi } from '@/services/endpoints'
import { formatDateTime } from '@/utils/format'

export default function AdminMessagesPage() {
  const messages = useApi('admin:messages', adminApi.messages, { cache: false })
  const toast = useToast()

  const markRead = async (id: number) => {
    try {
      await adminApi.markMessageRead(id)
      messages.reload()
    } catch (err) {
      toast.error('Could not update message', (err as ApiError).message)
    }
  }

  if (messages.loading && !messages.data) return <PageLoader />
  if (messages.error) return <ErrorState message={messages.error.message} onRetry={messages.reload} />

  const unread = messages.data?.filter((m) => !m.is_read).length ?? 0
  return (
    <>
      <AdminPageHeader title="Messages" description={`Contact form submissions · ${unread} unread`} />
      {!messages.data?.length ? (
        <EmptyState icon={<Inbox className="size-6" aria-hidden="true" />} title="No messages yet" description="Messages sent from the Contact Us page appear here." />
      ) : (
        <ul className="space-y-4">
          {messages.data.map((m) => (
            <li key={m.id}>
              <Card className={`p-5 ${m.is_read ? '' : 'border-l-4 border-l-accent-500'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">
                      {m.subject} {!m.is_read && <Badge tone="accent">New</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {m.name} · {formatDateTime(m.created_at)}
                    </p>
                  </div>
                  {!m.is_read && (
                    <Button size="sm" variant="outline" onClick={() => markRead(m.id)} icon={<Check className="size-4" aria-hidden="true" />}>
                      Mark as read
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-ink-700">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                    <Mail className="size-4" aria-hidden="true" /> {m.email}
                  </a>
                  {m.phone && (
                    <a href={`tel:${m.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                      <Phone className="size-4" aria-hidden="true" /> {m.phone}
                    </a>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
