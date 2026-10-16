import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/Button'
import { Alert, Skeleton } from '@/components/ui/Feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Card } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { useClinicInfo } from '@/hooks/useClinic'
import type { ApiError } from '@/services/api'
import { clinicApi } from '@/services/endpoints'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120).regex(/^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ .'-]+$/, "Use letters, spaces and . ' - only"),
  email: z.string().trim().min(1, 'Please enter your email').email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || (/^\+?[0-9 ()-]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7), 'Enter a valid phone number'),
  subject: z.string().min(3, 'Please choose a subject'),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(2000, 'Please keep it under 2000 characters'),
})
type ContactValues = z.infer<typeof schema>

const SUBJECTS = ['General enquiry', 'Appointments & rescheduling', 'Billing & insurance documents', 'Medical records request', 'Feedback']

export default function ContactPage() {
  const { data: clinic, loading } = useClinicInfo()
  const toast = useToast()
  const [sent, setSent] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
    mode: 'onTouched',
  })

  const onSubmit = async (values: ContactValues) => {
    try {
      const res = await clinicApi.contact({ ...values, phone: values.phone || undefined })
      setSent(res.message)
      reset()
      toast.success('Message sent', 'We will get back to you soon.')
    } catch (err) {
      const e = err as ApiError
      for (const [field, message] of Object.entries(e.fieldErrors ?? {})) setError(field as keyof ContactValues, { message })
      toast.error('Message not sent', e.message)
    }
  }

  const messageLength = useWatch({ control, name: 'message' })?.length ?? 0

  return (
    <>
      <Seo
        title="Contact Us"
        description="Contact Cedarline Multispeciality Clinic in Indiranagar, Bengaluru: phone, email, address, opening hours and directions."
        path="/contact"
      />
      <PageHero
        eyebrow="Contact"
        title="We're here to help"
        description="Questions about services, appointments or billing? Call, email or send us a message and our front desk will reply within one working day."
        crumbs={[{ label: 'Contact Us' }]}
        image="/images/clinic-reception.webp"
      />

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.25fr]">
          <div className="space-y-5">
            {loading || !clinic ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <ContactItem icon={<Phone className="size-5" />} title="Phone">
                  <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="font-semibold text-ink-900 hover:text-brand-700">
                    {clinic.phone}
                  </a>
                  <p className="text-sm text-ink-500">Front desk during opening hours</p>
                </ContactItem>
                <ContactItem icon={<Mail className="size-5" />} title="Email">
                  <a href={`mailto:${clinic.email}`} className="font-semibold text-ink-900 hover:text-brand-700">
                    {clinic.email}
                  </a>
                  <p className="text-sm text-ink-500">We reply within one working day</p>
                </ContactItem>
                <ContactItem icon={<MapPin className="size-5" />} title="Address">
                  <address className="leading-6 text-ink-800 not-italic">
                    {clinic.address_line}
                    <br />
                    {clinic.city}, {clinic.state} {clinic.postal_code}
                  </address>
                </ContactItem>
                <ContactItem icon={<Clock className="size-5" />} title="Opening hours">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Weekly opening hours</caption>
                    <tbody>
                      {clinic.opening_hours.map((h) => (
                        <tr key={h.day} className="border-b border-ink-100 last:border-0">
                          <th scope="row" className="py-1.5 text-left font-medium text-ink-700">
                            {h.day}
                          </th>
                          <td className={h.closed ? 'py-1.5 text-right text-ink-400' : 'py-1.5 text-right text-ink-900'}>
                            {h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ContactItem>
                <Alert tone="warning" title="Medical emergency?">
                  {clinic.emergency_note}
                </Alert>
              </>
            )}
          </div>

          <div className="space-y-8">
            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Send us a message</h2>
              <p className="mt-2 text-sm text-ink-500">Please don't include sensitive medical details. To book, call the front desk or see How to book.</p>
              {sent && (
                <Alert tone="success" className="mt-6" title="Message sent">
                  {sent}
                </Alert>
              )}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required error={errors.name?.message}>
                  {(a) => <Input {...a} autoComplete="name" {...register('name')} />}
                </Field>
                <Field label="Email" required error={errors.email?.message}>
                  {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  {(a) => <Input {...a} type="tel" autoComplete="tel" {...register('phone')} />}
                </Field>
                <Field label="Subject" required error={errors.subject?.message}>
                  {(a) => (
                    <Select {...a} {...register('subject')}>
                      <option value="">Choose a subject</option>
                      {SUBJECTS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Message" required error={errors.message?.message} hint={`${messageLength}/2000`} className="sm:col-span-2">
                  {(a) => <Textarea {...a} rows={5} maxLength={2000} {...register('message')} />}
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" loading={isSubmitting} icon={<Send className="size-4" aria-hidden="true" />}>
                    Send message
                  </Button>
                </div>
              </form>
            </Card>

            {clinic?.map_embed_url && (
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-ink-100 shadow-card">
                <iframe
                  title="Map showing the clinic's area"
                  src={clinic.map_embed_url}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-80 w-full"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function ContactItem({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="flex gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-1 text-sm font-semibold text-ink-500">{title}</h2>
        {children}
      </div>
    </Card>
  )
}
