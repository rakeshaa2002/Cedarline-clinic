import { CalendarCheck } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DoctorPhoto } from '@/components/site/Cards'
import type { Doctor } from '@/types'
import { DEPARTMENT_LABELS, WEEKDAYS, formatTime } from '@/utils/format'

export function DoctorProfileModal({ doctor, onClose }: { doctor: Doctor | null; onClose: () => void }) {
  return (
    <Modal
      open={doctor !== null}
      onClose={onClose}
      title={doctor?.full_name ?? ''}
      description={doctor ? `${doctor.specialization} · ${DEPARTMENT_LABELS[doctor.department]}` : undefined}
      size="lg"
      footer={
        doctor && (
          <ButtonLink to={`/appointments?doctor=${doctor.slug}`} variant="accent" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
            Book with {doctor.full_name.replace('Dr. ', 'Dr ')}
          </ButtonLink>
        )
      }
    >
      {doctor && (
        <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
          <DoctorPhoto doctor={doctor} className="aspect-[5/6] w-full rounded-2xl" />
          <div>
            <p className="leading-7 text-ink-700">{doctor.bio}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-500">Qualifications</dt>
                <dd className="font-medium text-ink-900">{doctor.qualifications}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Experience</dt>
                <dd className="font-medium text-ink-900">{doctor.experience_years} years</dd>
              </div>
              <div>
                <dt className="text-ink-500">Languages</dt>
                <dd className="font-medium text-ink-900">{doctor.languages.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Typical consultation</dt>
                <dd className="font-medium text-ink-900">{doctor.slot_minutes} minutes</dd>
              </div>
            </dl>
            <h3 className="mt-6 text-sm font-semibold text-ink-900">Weekly consultation schedule</h3>
            <ul className="mt-2 grid grid-cols-7 gap-1.5 text-center text-xs">
              {WEEKDAYS.map((day, i) => {
                const on = doctor.consultation_days.includes(i)
                return (
                  <li
                    key={day}
                    className={on ? 'rounded-lg bg-brand-50 py-2 font-semibold text-brand-700 ring-1 ring-brand-100' : 'rounded-lg bg-ink-50 py-2 text-ink-400'}
                  >
                    <span className="sr-only">{day}: {on ? 'consulting' : 'not consulting'}</span>
                    <span aria-hidden="true">{day.slice(0, 3)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-sm text-ink-600">
              {formatTime(doctor.start_time)} – {formatTime(doctor.end_time)} on consultation days
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
