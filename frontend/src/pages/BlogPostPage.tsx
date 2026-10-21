import { ArrowLeft, CalendarCheck, Clock } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BlogCard, DoctorPhoto } from '@/components/site/Cards'
import { Markdown } from '@/components/site/Markdown'
import { Seo } from '@/components/site/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Badge, Breadcrumbs } from '@/components/ui/Layout'
import { SITE_URL, absoluteUrl } from '@/content/site'
import { useApi } from '@/hooks/useApi'
import { assetUrl } from '@/services/api'
import { clinicApi } from '@/services/endpoints'
import { formatLongDate } from '@/utils/format'


export default function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = useApi(`blog-post:${slug}`, () => clinicApi.blogPost(slug))
  const related = useApi(post.data ? `blog:related:${post.data.category}` : null, () =>
    clinicApi.blog({ page: 1, page_size: 4, category: post.data!.category }),
  )

  if (post.loading) return <PageLoader label="Loading article…" />
  if (post.error?.status === 404)
    return (
      <div className="container-page section">
        <Seo title="Article not found" description="This article could not be found." path={`/blog/${slug}`} noindex />
        <EmptyState title="Article not found" description="It may have been moved or removed." action={<ButtonLink to="/blog">Browse all articles</ButtonLink>} />
      </div>
    )
  if (post.error || !post.data)
    return (
      <div className="container-page section">
        <ErrorState message={post.error?.message ?? 'Unknown error'} onRetry={post.reload} />
      </div>
    )

  const a = post.data
  const others = related.data?.items.filter((p) => p.slug !== a.slug).slice(0, 3) ?? []

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: a.title,
    description: a.excerpt,
    url: `${SITE_URL}/blog/${a.slug}`,
    image: a.cover_image ? absoluteUrl(a.cover_image) : undefined,
    datePublished: a.published_at,
    inLanguage: 'en-IN',
    author: a.author
      ? {
          '@type': 'Physician',
          name: a.author.full_name,
          jobTitle: a.author.specialization,
          url: `${SITE_URL}/doctors`,
        }
      : undefined,
    publisher: {
      '@type': 'MedicalClinic',
      name: 'Cedarline Multispeciality Clinic',
      url: SITE_URL,
    },
  }

  return (
    <>
      <Seo
        title={a.title}
        description={a.excerpt}
        path={`/blog/${a.slug}`}
        image={a.cover_image ? absoluteUrl(a.cover_image) : undefined}
        schema={articleSchema}
      />
      <article>
        <header className="bg-ink-50/70">
          <div className="container-page max-w-3xl pt-10 pb-12 sm:pt-14">
            <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Blog', to: '/blog' }, { label: a.title }]} />
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-ink-500">
              <Badge tone="brand">{a.category}</Badge>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" /> {a.reading_minutes} min read
              </span>
              <time dateTime={a.published_at}>{formatLongDate(a.published_at)}</time>
            </div>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold sm:text-5xl">{a.title}</h1>
            <p className="mt-5 text-xl leading-8 text-ink-600">{a.excerpt}</p>
            {a.author && (
              <div className="mt-8 flex items-center gap-3">
                <DoctorPhoto doctor={a.author} className="size-12 rounded-full" />
                <div className="text-sm">
                  <p className="font-semibold text-ink-900">{a.author.full_name}</p>
                  <p className="text-ink-500">{a.author.specialization}</p>
                </div>
              </div>
            )}
          </div>
        </header>
        {a.cover_image && (
          <div className="container-page -mt-2 max-w-4xl">
            <img src={assetUrl(a.cover_image)} alt="" width={1200} height={750} className="aspect-[16/9] w-full rounded-[2rem] object-cover" />
          </div>
        )}
        <div className="container-page max-w-3xl py-12">
          <Markdown content={a.content} />
          <div className="mt-12 flex flex-col gap-4 rounded-3xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="font-display text-lg font-bold text-ink-900">Have a question about your own health?</p>
              <p className="mt-1 text-sm text-ink-600">Book a consultation and talk it through with one of our doctors.</p>
            </div>
            <ButtonLink to="/appointments" variant="accent" icon={<CalendarCheck className="size-4" aria-hidden="true" />}>
              Book an appointment
            </ButtonLink>
          </div>
          <Link to="/blog" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to all articles
          </Link>
        </div>
      </article>

      {others.length > 0 && (
        <section className="section border-t border-ink-100 bg-ink-50/70" aria-labelledby="related-title">
          <div className="container-page">
            <h2 id="related-title" className="mb-8 text-2xl font-bold">
              Related articles
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {others.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
