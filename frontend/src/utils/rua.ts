import { BRAND } from '@/content/rua'

/** wa.me link that opens WhatsApp with a pre-filled message to RUA. */
export function whatsappLink(message?: string, number: string = BRAND.whatsapp): string {
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** Current wall-clock time in Bengaluru, whatever the visitor's device timezone. */
export function nowInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day'), minutes: get('hour') * 60 + get('minute') }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Both centres keep the same hours every day (Sunday – Saturday, 10am – 8pm). */
export function openStatus(date = new Date()): { open: boolean; label: string; detail: string } {
  const { minutes } = nowInIndia(date)
  const open = toMinutes(BRAND.hours.open)
  const close = toMinutes(BRAND.hours.close)
  if (minutes >= open && minutes < close) {
    return { open: true, label: 'Open now', detail: 'until 8:00 pm today' }
  }
  return { open: false, label: 'Closed now', detail: minutes < open ? 'opens 10:00 am today' : 'opens 10:00 am tomorrow' }
}

/** "10:30" -> "10:30 am" */
export function formatSlot(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}
