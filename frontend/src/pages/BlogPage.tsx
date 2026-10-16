import { BookOpen } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { BlogCard } from '@/components/site/Cards'
import { PageHero } from '@/components/site/PageHero'
import { Seo } from '@/components/site/Seo'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Layout'
import { useApi } from '@/hooks/useApi'
import { clinicApi } from '@/services/endpoints'
import { cn } from '@/utils/format'

const PAGE_SIZE = 6

export default function BlogPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = params.get('category') ?? ''
  const categories = useApi('blog:categories', clinicApi.blogCategories)
  const posts = useApi(`blog:${category}:${page}`, () =>
    clinicApi.blog({ page, page_size: PAGE_SIZE, category: category || undefined }),
  )

  const update = (next: { page?: number; category?: string }) => {
    const p = new URLSearchParams()
    const cat = next.category ?? category
    if (cat) p.set('category', cat)
    if ((next.page ?? 1) > 1) p.set('page', String(next.page))
    setParams(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Seo
        title="Blog & Patient Education"
        description="Practical, doctor-written articles on dental care, skin care, hair health, children's health and preparing for your appointment."
        path="/blog"
      />
      <PageHero
        eyebrow="Patient education"
        title="Health articles from our doctors"
        description="Clear, practical information to help you look after yourself and prepare for your visit. General information only — not a substitute for medical advice."
        crumbs={[{ label: 'Blog' }]}
        image="/images/blog/health-records.webp"
      />

      <section className="section">
        <div className="container-page">
          <div role="group" aria-label="Filter articles by category" className="mb-10 flex flex-wrap gap-2">
            {['', ...(categories.data ?? [])].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                aria-pressed={category === c}
                onClick={() => update({ category: c, page: 1 })}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  category === c ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200',
                )}
              >
                {c || 'All articles'}
              </button>
            ))}
          </div>

          {posts.error ? (
            <ErrorState message={posts.error.message} onRetry={posts.reload} />
          ) : posts.loading && !posts.data ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          ) : posts.data && posts.data.items.length === 0 ? (
            <EmptyState icon={<BookOpen className="size-6" aria-hidden="true" />} title="No articles yet" description="Check back soon for new articles in this category." />
          ) : (
            posts.data && (
              <>
                <div className={cn('grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4', posts.loading && 'opacity-60')}>
                  {posts.data.items.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
                <Pagination page={posts.data.page} pages={posts.data.pages} onChange={(p) => update({ page: p })} />
              </>
            )
          )}
        </div>
      </section>
    </>
  )
}
