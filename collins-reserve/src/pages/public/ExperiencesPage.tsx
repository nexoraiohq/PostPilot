import { useEffect, useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { subscribeToExperiences } from '@/services/restaurant.service'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { DiningExperience } from '@/types'

function ExperienceRow({ experience, index }: { experience: DiningExperience; index: number }) {
  const reversed = index % 2 === 1
  return (
    <article className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
      <div className={cn('lg:col-span-6', reversed ? 'lg:order-2 lg:-mt-8' : 'lg:order-1 lg:mt-12')}>
        <div className="overflow-hidden rounded-2xl bg-line/40">
          <img
            src={experience.imageUrl}
            alt={experience.name}
            loading="lazy"
            width={1400}
            height={933}
            className={index % 3 === 1 ? 'aspect-[4/5] w-full object-cover' : 'aspect-[3/2] w-full object-cover'}
          />
        </div>
      </div>
      <div className={cn('lg:col-span-6', reversed ? 'lg:order-1' : 'lg:order-2')}>
        <p className="label-caps mb-4 flex items-baseline gap-3 text-champagne-text">
          <span className="tabular-nums text-stone/50">{String(index + 1).padStart(2, '0')}</span>
          Experience
        </p>
        <h2 className="text-section max-w-xl">{experience.name}</h2>
        <p className="mt-5 max-w-xl text-lead text-stone">{experience.description}</p>

        {experience.highlights.length > 0 && (
          <ul className="mt-6 max-w-xl space-y-2.5">
            {experience.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 text-support text-ink/75">
                <Check className="mt-0.5 size-4 shrink-0 text-champagne-text" aria-hidden />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-support text-stone">
            {experience.priceFromKes != null ? `From ${formatKes(experience.priceFromKes)}` : 'On enquiry'}
          </p>
          <LinkButton to="/reserve" size="md">
            Reserve
            <ArrowUpRight className="size-4" aria-hidden />
          </LinkButton>
        </div>
      </div>
    </article>
  )
}

function RowSkeleton({ reversed }: { reversed: boolean }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
      <Skeleton
        className={cn('aspect-[3/2] w-full rounded-2xl lg:rounded-3xl lg:col-span-6', reversed && 'lg:order-2')}
      />
      <div className={cn('space-y-4 lg:col-span-6', reversed && 'lg:order-1')}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-6 h-11 w-36 rounded-full" />
      </div>
    </div>
  )
}

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<DiningExperience[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToExperiences((items) => {
      setExperiences(items)
      setLoading(false)
    })
    const fallback = window.setTimeout(() => setLoading(false), 2000)
    return () => {
      unsub()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <>
      {/* Header */}
      <section aria-label="Experiences" className="editorial-width pt-12 md:pt-16 lg:pt-20">
        <p className="label-caps mb-6 text-stone">
          Experiences
          <span className="mx-3 text-champagne-text">·</span>
          Beyond à la carte
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="text-page max-w-3xl">
            Ways to dine,
            <br />
            made for the occasion<span className="text-champagne-text">.</span>
          </h1>
          <p className="max-w-sm shrink-0 text-support text-stone md:pb-3">
            Private tastings, long-table suppers and chef&apos;s counters — each one bookable, each one a little
            different.
          </p>
        </div>
      </section>

      {/* Experience rows */}
      <section aria-label="Dining experiences" className="editorial-width section-y">
        {loading ? (
          <div className="space-y-16 md:space-y-24">
            <RowSkeleton reversed={false} />
            <RowSkeleton reversed />
            <RowSkeleton reversed={false} />
          </div>
        ) : experiences.length === 0 ? (
          <EmptyState
            title="No experiences published yet"
            description="Our tastings and private dining sessions are being finalised. In the meantime, the à la carte menu is always open."
            action={
              <LinkButton to="/menu" variant="secondary" size="md">
                View the menu
                <ArrowUpRight className="size-4" aria-hidden />
              </LinkButton>
            }
          />
        ) : (
          <div className="space-y-16 md:space-y-24">
            {experiences.map((experience, index) => (
              <ExperienceRow key={experience.id} experience={experience} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Enquiry strip */}
      <section aria-label="Enquiries" className="border-t border-line">
        <div className="editorial-width section-y">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="label-caps mb-3 flex items-baseline gap-3 text-champagne-text">
                <span className="tabular-nums text-stone/50">04</span>
                Something bespoke
              </p>
              <h2 className="text-section">Planning a private evening or an event?</h2>
              <p className="mt-4 max-w-xl text-body text-stone">
                Tell us the date, the occasion and roughly how many seats you need — we will come back with ideas,
                timings and a price.
              </p>
              <div className="mt-8">
                <LinkButton to="/contact" variant="secondary" size="md">
                  Enquire with us
                  <ArrowUpRight className="size-4" aria-hidden />
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
