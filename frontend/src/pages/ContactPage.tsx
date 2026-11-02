import { Clock, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CentreCard, CtaBand } from '@/components/rua/cards'
import { FaqList, MapEmbed, OpenStatus, PageHero, Reveal, SectionHeader, SocialIcon } from '@/components/rua/ui'
import { Seo } from '@/components/site/Seo'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { BRAND, CENTRES, GENERAL_FAQS } from '@/content/rua'
import { contactMeta } from '@/content/rua/seo'
import { SITE_URL } from '@/content/site'
import { track } from '@/utils/analytics'
import { cn } from '@/utils/format'
import { whatsappLink } from '@/utils/rua'

/** The options on RUA's existing "How can we help you?" form. */
const HELP_OPTIONS = ['Medical Dermatology', 'Dermatosurgery', 'Advanced Cosmetic Dermatology', 'Hair Treatments', 'Hair Transplantation']
const PHONE = /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/

export default function ContactPage() {
  const [help, setHelp] = useState(HELP_OPTIONS[0])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [centre, setCentre] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = 'Please enter your name.'
    if (!PHONE.test(phone.trim())) next.phone = 'Please enter a valid 10-digit Indian mobile number.'
    setErrors(next)
    if (Object.keys(next).length) return
    const centreName = CENTRES.find((c) => c.slug === centre)?.name
    const text = [
      'Hello RUA Skin & Hair Center,',
      `I need help with: ${help}.`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      centreName ? `Preferred centre: ${centreName}` : '',
      message.trim() ? `Message: ${message.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    track('generate_lead', { concern: help, centre: centre || undefined, method: 'whatsapp_form' })
    window.open(whatsappLink(text), '_blank', 'noopener')
    setSent(true)
  }

  return (
    <>
      <Seo meta={contactMeta(SITE_URL)} />
      <PageHero
        crumbs={[{ label: 'Contact' }]}
        eyebrow="Get in touch with us!"
        title="We’re here to help"
        lead={`Call, WhatsApp or visit either RUA centre — open ${BRAND.hours.days}, ${BRAND.hours.label}.`}
      >
        <OpenStatus tone="light" className="mt-8" />
      </PageHero>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <form onSubmit={submit} noValidate className="rounded-[2rem] bg-white p-7 shadow-card ring-1 ring-ink-100 sm:p-10">
              <p className="eyebrow">Send us a message</p>
              <h2 className="mt-3 text-3xl">How can we help you?</h2>
              <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="How can we help you?">
                {HELP_OPTIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={help === o}
                    onClick={() => setHelp(o)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold ring-1 transition',
                      help === o ? 'bg-brand-800 text-cream ring-brand-800' : 'bg-white text-ink-700 ring-ink-200 hover:ring-brand-300',
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <Field label="Your name" required error={errors.name}>
                  {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12" />}
                </Field>
                <Field label="Phone number" required error={errors.phone}>
                  {(p) => <Input {...p} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxx xxxxx" className="h-12" />}
                </Field>
                <Field label="Preferred centre" className="sm:col-span-2">
                  {(p) => (
                    <Select {...p} value={centre} onChange={(e) => setCentre(e.target.value)} className="h-12">
                      <option value="">Either centre</option>
                      {CENTRES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Message" className="sm:col-span-2">
                  {(p) => <Textarea {...p} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />}
                </Field>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg" icon={<WhatsAppIcon className="size-5" aria-hidden="true" />}>
                  Let’s talk — continue on WhatsApp
                </Button>
                {sent && (
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
                    <Send className="size-4" aria-hidden="true" /> WhatsApp opened with your message — just tap send.
                  </p>
                )}
              </div>
              <p className="mt-4 text-xs text-ink-500">We use your details only to reply to your enquiry.</p>
            </form>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-5">
              <div className="surface-cocoa relative isolate overflow-hidden rounded-[2rem] p-7 text-cream">
                <div className="slats absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
                <p className="flex items-center gap-2 font-display text-2xl">
                  <Clock className="size-5 text-accent-300" aria-hidden="true" /> Business hours
                </p>
                <p className="mt-3 text-cream/80">
                  {BRAND.hours.days}
                  <br />
                  {BRAND.hours.label}
                </p>
                <a
                  href={whatsappLink('Hello RUA Skin & Hair Center, I have an enquiry.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white"
                >
                  <WhatsAppIcon className="size-4" aria-hidden="true" /> {BRAND.whatsappDisplay}
                </a>
                <div className="mt-6 flex gap-2.5">
                  {BRAND.social.map((s) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`RUA on ${s.label}`} className="grid size-10 place-items-center rounded-full ring-1 ring-cream/25 hover:bg-cream hover:text-brand-800">
                      <SocialIcon id={s.id} className="size-4" />
                    </a>
                  ))}
                </div>
              </div>
              {CENTRES.map((c) => (
                <CentreCard key={c.slug} centre={c} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-cream">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          {CENTRES.map((c) => (
            <div key={c.slug}>
              <p className="mb-3 font-display text-xl text-ink-900">{c.name}</p>
              <MapEmbed src={c.mapEmbedUrl} title={`Map showing ${c.name}`} className="h-80" />
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="FAQs" title="Before you visit" />
          <FaqList faqs={GENERAL_FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  )
}
