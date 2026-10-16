import { ArrowRight, CalendarDays, Clock3, GraduationCap, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Layout'
import { ServiceIcon } from '@/components/site/ServiceIcon'
import type { BlogPostSummary, Doctor, Service } from '@/types'
import {
  DEPARTMENT_LABELS,
  consultationDaysLabel,
  cn,
  formatDate,
  formatPrice,
  formatTime,
  initials,
} from '@/utils/format'

export function DoctorPhoto({ doctor, className }: { doctor: Pick<Doctor, 'full_name' | 'photo_url'>; className?: string }) {
  if (!doctor.photo_url) {
    return (
      <div className={cn('grid place-items-center bg-brand-100 font-display text-3xl font-bold text-brand-700', className)} aria-hidden="true">
        {initials(doctor.full_name)}
      </div>
    )
  }
  return (
    <img
      src={doctor.photo_url}
      alt={`Portrait of ${doctor.full_name}`}
      loading="lazy"
      decoding="async"
      width={600}
      height={720}
      className={cn('object-cover', className)}
    />
  )
}

export function DoctorCard({ doctor, onViewProfile }: { doctor: Doctor; onViewProfile?: (doctor: Doctor) => void }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-100/90 bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-brand-300/80 hover:shadow-lift">
      <div className="relative aspect-[5/5] overflow-hidden bg-ink-50">
        <DoctorPhoto doctor={doctor} className="size-full transition-transform duration-700 ease-out group-hover:scale-105" />
        <Badge tone="brand" className="absolute top-3 left-3 bg-white/95 backdrop-blur shadow-xs">
          {DEPARTMENT_LABELS[doctor.department]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold group-hover:text-brand-700 transition-colors">{doctor.full_name}</h3>
        <p className="text-sm font-medium text-brand-700">{doctor.specialization}</p>
        <ul className="mt-4 space-y-2 text-sm text-ink-600">
          <li className="flex gap-2">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              {doctor.qualifications} · {doctor.experience_years} yrs
            </span>
          </li>
          <li className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              {consultationDaysLabel(doctor.consultation_days)} · {formatTime(doctor.start_time)}–{formatTime(doctor.end_time)}
            </span>
          </li>
          <li className="flex gap-2">
            <Languages className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>{doctor.languages.join(', ')}</span>
          </li>
        </ul>
        <div className="mt-auto flex gap-2 pt-5">
          <ButtonLink to={`/appointments?doctor=${doctor.slug}`} size="sm" className="flex-1" aria-label={`Book an appointment with ${doctor.full_name}`}>
            Book
          </ButtonLink>
          {onViewProfile && (
            <button
              type="button"
              onClick={() => onViewProfile(doctor)}
              className="h-9 flex-1 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 active:scale-98 cursor-pointer"
              aria-label={`View profile of ${doctor.full_name}`}
            >
              Profile
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function ServiceCard({ service, showDepartment = false }: { service: Service; showDepartment?: boolean }) {
  const price = formatPrice(service.price_from)
  return (
    <article className="group flex h-full flex-col rounded-[var(--radius-card)] border border-ink-100/90 bg-white p-6 shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-brand-300/80 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white group-hover:shadow-md">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>
        {showDepartment && <Badge tone="neutral">{DEPARTMENT_LABELS[service.department]}</Badge>}
      </div>
      <h3 className="mt-5 text-lg font-bold group-hover:text-brand-700 transition-colors">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-ink-600">{service.short_description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-500">
          <Clock3 className="size-4 text-brand-600" aria-hidden="true" /> {service.duration_minutes} min
        </span>
        <span className="font-semibold text-ink-900">{price ? `From ${price}` : 'Price at clinic'}</span>
      </div>
      <Link
        to="/appointments"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-all duration-150 hover:text-brand-800 hover:translate-x-1"
        aria-label={`How to book ${service.name}`}
      >
        Book this service <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </article>
  )
}

export function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink-100/90 bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-brand-300/80 hover:shadow-lift">
      <Link to={`/blog/${post.slug}`} className="block aspect-[16/10] overflow-hidden bg-ink-50" tabIndex={-1} aria-hidden="true">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt=""
            loading="lazy"
            decoding="async"
            width={1200}
            height={750}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <Badge tone="brand">{post.category}</Badge>
          <span>{post.reading_minutes} min read</span>
        </div>
        <h3 className="mt-3 text-lg leading-snug font-bold">
          <Link to={`/blog/${post.slug}`} className="hover:text-brand-700 transition-colors">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ink-600">{post.excerpt}</p>
        <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
          {post.author && <DoctorPhoto doctor={post.author} className="size-9 rounded-full ring-2 ring-brand-100 shadow-xs" />}
          <div className="text-xs">
            <p className="font-semibold text-ink-800">{post.author?.full_name ?? 'Cedarline team'}</p>
            <p className="text-ink-500">
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
