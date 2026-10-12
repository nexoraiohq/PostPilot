import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react'
import { subscribeToExperiences } from '@/services/restaurant.service'
import { useMenuData, useRestaurantData } from '@/hooks/data'
import { imgSrcSet, warmCommonRoutes } from '@/app/prefetch'
import { formatKes, todayInTimezone } from '@/utils/format'
import { Badge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/utils/cn'
import type { DiningExperience } from '@/types'
import { DIETARY_LABELS } from '@/types'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=80'
const STORY_IMAGE = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80'

const TODAY_WEEKDAY = new Date().getDay()

const FACTS = [
  { value: '12', label: 'growers and producers we work with by name' },
  { value: 'Weekly', label: 'menu changes guided by the market' },
  { value: '14', label: 'seats in our private dining room' },
  { value: 'Tue–Sun', label: 'lunch and dinner service, closed Mondays' },
]

function SectionHeading({ eyebrow, title, action, index }: { eyebrow: string; title: string; action?: React.ReactNode; index?: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
      <div>
        <p className="label-caps mb-3 flex items-baseline gap-3 text-champagne-text">
          {index && <span className="text-stone/50 tabular-nums">{index}</span>}
          {eyebrow}
        </p>
        <h2 className="text-section max-w-2xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export default function HomePage() {
  const { featured, loading, items } = useMenuData()
  const { restaurant, settings } = useRestaurantData()
  const navigate = useNavigate()
  const [experiences, setExperiences] = useState<DiningExperience[]>([])
  const [guests, setGuests] = useState(2)
  const [date, setDate] = useState(() => todayInTimezone())

  useEffect(() => subscribeToExperiences(setExperiences), [])
  useEffect(() => warmCommonRoutes(), [])

  const signatures = featured.slice(0, 4)
  const todayHours = settings?.openingHours.find((h) => h.day === TODAY_WEEKDAY)

  const hoursLabel = !settings
    ? 'Loading hours…'
    : todayHours?.closed
      ? 'Closed today'
      : `Open ${todayHours?.open} – ${todayHours?.close}`

  return (
    <>
      {/* 01 — Hero */}
      <section aria-label="Introduction" className="editorial-width pt-12 md:pt-16 lg:pt-20">
        <p className="label-caps mb-6 flex items-baseline gap-3 text-stone">
          <span className="text-champagne-text">01</span>
          Nairobi · Kenya
          <span className="text-champagne-text">·</span>
          Est. 2026
        </p>
        <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-8">
          <h1 className="text-hero lg:col-span-8">
            A slower kind
            <br />
            of dining<span className="text-champagne-text">.</span>
          </h1>
          <p className="mt-8 max-w-sm text-lead text-stone lg:col-span-4 lg:mt-0 lg:pb-4">
            {restaurant?.positioning ??
              'Seasonal ingredients. Thoughtful cooking. An evening worth remembering.'}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4 md:mt-12">
          <LinkButton to="/reserve" size="lg">Reserve a Table</LinkButton>
          <Link to="/menu" className="group inline-flex items-center gap-2 text-[15px] font-medium text-ink">
            Explore the Menu
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </Link>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-2xl bg-line/40 md:mt-16">
          <img
            src={HERO_IMAGE}
            srcSet={imgSrcSet(HERO_IMAGE, [800, 1200, 1600, 2000])}
            sizes="(width >= 80rem) 75rem, 100vw"
            alt="The MAISON NOIR dining room set for evening service, with soft light over linen-dressed tables"
            className="aspect-[4/5] w-full object-cover sm:aspect-[16/10] lg:aspect-[21/9]"
            fetchPriority="high"
            width={2000}
            height={857}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/55 via-black/10 to-transparent p-5 md:p-8">
            <p className="flex items-center gap-2 text-[13px] tracking-wide text-white/90">
              <Clock className="size-4" aria-hidden />
              {hoursLabel}
            </p>
            <p className="hidden text-[13px] tracking-wide text-white/90 sm:block">
              {restaurant?.addressLines?.[1]}, {restaurant?.city ?? 'Nairobi'}
            </p>
          </div>
        </div>
      </section>

      {/* 02 — Signature dishes */}
      <section aria-label="Signature dishes" className="editorial-width section-y">
        <SectionHeading
          index="02"
          eyebrow="From the kitchen"
          title="Signature dishes, changing with the season"
          action={
            <Link to="/menu" className="group inline-flex items-center gap-2 text-[15px] font-medium text-ink">
              View full menu
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          }
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : signatures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-8 py-14 text-center">
            <p className="text-card">The menu is being written.</p>
            <p className="mt-2 text-support text-stone">
              Signature dishes appear here as soon as they are added to the kitchen&apos;s menu.
            </p>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
            {/* Lead dish — spans two columns, taller */}
            {signatures[0] && (
              <Link to="/menu" className="group block lg:col-span-6 lg:row-span-2">
                <div className="relative overflow-hidden rounded-2xl bg-line/40">
                  <img
                    src={signatures[0].imageUrl}
                    alt={signatures[0].name}
                    loading="lazy"
                    width={900}
                    height={1125}
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  {signatures[0].tags.length > 0 && (
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {signatures[0].tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="bg-paper/90 text-ink backdrop-blur">
                          {DIETARY_LABELS[tag]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h3 className="text-card transition-colors group-hover:text-stone">{signatures[0].name}</h3>
                  <span className="text-[15px] font-medium tabular-nums whitespace-nowrap">
                    {formatKes(signatures[0].priceKes)}
                  </span>
                </div>
                <p className="mt-1.5 text-support text-stone line-clamp-2">{signatures[0].description}</p>
              </Link>
            )}
            {/* Remaining dishes — smaller, offset */}
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-2">
              {signatures.slice(1, 5).map((dish) => (
                <Link key={dish.id} to="/menu" className="group block">
                  <div className="relative overflow-hidden rounded-2xl bg-line/40">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      loading="lazy"
                      width={900}
                      height={1125}
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    {dish.tags.length > 0 && (
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {dish.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} className="bg-paper/90 text-ink backdrop-blur">
                            {DIETARY_LABELS[tag]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="text-card transition-colors group-hover:text-stone">{dish.name}</h3>
                    <span className="text-[15px] font-medium tabular-nums whitespace-nowrap">
                      {formatKes(dish.priceKes)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-support text-stone line-clamp-2">{dish.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
        {items.length > 4 && (
          <p className="mt-8 text-support text-stone sm:hidden">
            Swipe for more · {items.length} dishes on the menu
          </p>
        )}
      </section>

      {/* 03 — Story */}
      <section aria-label="Our story" className="bg-paper">
        <div className="editorial-width section-y grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl bg-line/40 lg:-mt-16">
              <img
                src={STORY_IMAGE}
                srcSet={imgSrcSet(STORY_IMAGE, [600, 900, 1400])}
                sizes="(width >= 64rem) 37.5rem, 100vw"
                alt="Morning light in the MAISON NOIR dining room, with the bar and open kitchen beyond"
                loading="lazy"
                width={1400}
                height={1750}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="label-caps mb-4 flex items-baseline gap-3 text-champagne-text">
              <span className="text-stone/50 tabular-nums">03</span>
              The restaurant
            </p>
            <h2 className="text-section max-w-xl">
              A small dining room built around one idea: cook what the season gives us.
            </h2>
            <p className="mt-6 max-w-xl text-lead text-stone">
              {restaurant?.storyIntro ??
                'MAISON NOIR is a small dining room built around one idea: cook what the season gives us, and give every table time.'}{' '}
              We buy from twelve growers and producers we know by name, write the menu weekly, and cook over charcoal
              and fire. Nothing rushes; that is the point.
            </p>

            <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-2">
              {FACTS.map((fact) => (
                <div key={fact.value}>
                  <dt className="font-display text-3xl font-medium text-ink">{fact.value}</dt>
                  <dd className="mt-1 text-support text-stone">{fact.label}</dd>
                </div>
              ))}
            </dl>

            <Link to="/story" className="group mt-10 inline-flex items-center gap-2 text-[15px] font-medium text-ink">
              Read our story
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* 04 — Experiences */}
      <section aria-label="Dining experiences" className="editorial-width section-y">
        <SectionHeading
          index="04"
          eyebrow="Ways to dine"
          title="Experiences beyond the à la carte menu"
          action={
            <Link to="/experiences" className="group inline-flex items-center gap-2 text-[15px] font-medium text-ink">
              All experiences
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          }
        />
        {experiences.length === 0 ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
            {experiences.slice(0, 4).map((exp, i) => {
              /* Varied spans: a wide lead, then two standard, then a wide trailing card */
              const span =
                i === 0 ? 'lg:col-span-7' :
                i === 1 ? 'lg:col-span-5 lg:mt-16' :
                i === 2 ? 'lg:col-span-5' :
                'lg:col-span-7 lg:-mt-10'
              return (
                <article key={exp.id} className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper ${span}`}>
                  <div className="overflow-hidden bg-line/40">
                    <img
                      src={exp.imageUrl}
                      alt={exp.name}
                      loading="lazy"
                      width={1200}
                      height={800}
                      className="aspect-[3/2] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-card">{exp.name}</h3>
                    <p className="mt-2 flex-1 text-support text-stone line-clamp-3">{exp.description}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                      <span className="text-support text-stone">
                        {exp.priceFromKes != null ? `From ${formatKes(exp.priceFromKes)}` : 'On enquiry'}
                      </span>
                      <Link
                        to="/experiences"
                        className="text-[13px] font-medium text-ink underline-offset-4 hover:underline"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* 05 — Reservation CTA */}
      <section aria-label="Reserve a table" className="relative bg-ink text-ivory">
        <div className="editorial-width section-y">
          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-6 lg:pt-6">
              <p className="label-caps mb-4 flex items-baseline gap-3 text-champagne">
                <span className="tabular-nums text-ivory/40">05</span>
                Reservations
              </p>
              <h2 className="text-section">
                Your table is
                <br />
                waiting.
              </h2>
              <p className="mt-5 max-w-md text-body text-ivory/65">
                Choose your party size and date, and we will show the seating times we still have open. Requests are
                confirmed by our team.
              </p>
              <p className="mt-8 hidden max-w-xs border-l border-champagne/40 pl-4 text-[13px] leading-relaxed text-ivory/50 lg:block">
                The dining room seats twenty-four. The private room, fourteen. We hold a few tables each night for
                walk-ins at the bar.
              </p>
            </div>
            <div className="mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  navigate(`/reserve?guests=${guests}&date=${date}`)
                }}
                className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label-caps mb-3 block text-ivory/60">Guests</span>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="h-12 w-full rounded-lg border border-white/15 bg-transparent px-4 text-ivory [&>option]:bg-ink"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'guest' : 'guests'}
                        </option>
                      ))}
                      <option value={9}>9+ (call us)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="label-caps mb-3 block text-ivory/60">Date</span>
                    <input
                      type="date"
                      value={date}
                      min={todayInTimezone()}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12 w-full rounded-lg border border-white/15 bg-transparent px-4 text-ivory [color-scheme:dark]"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-6 h-12 w-full rounded-lg bg-champagne text-[15px] font-medium text-ink transition-colors hover:bg-champagne-soft active:scale-[0.99]"
                >
                  Check available times
                </button>
                <p className="mt-3 text-center text-[12px] text-ivory/45">
                  {settings?.reservationNote ?? 'Requests are confirmed by our team.'}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — Visit us */}
      <section aria-label="Visit us" className="editorial-width section-y">
        <SectionHeading index="06" eyebrow="Visit us" title="Find us in Kilimani" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
          <div className="rounded-2xl border border-line bg-paper p-7 md:col-span-2 lg:col-span-6">
            <MapPin className="size-5 text-champagne-text" aria-hidden />
            <h3 className="mt-4 text-card">Address</h3>
            <address className="mt-3 space-y-0.5 text-support text-stone not-italic">
              {(restaurant?.addressLines ?? ['12 Riverside Lane', 'Kilimani']).map((l) => (
                <p key={l}>{l}</p>
              ))}
              <p>
                {restaurant?.city ?? 'Nairobi'}, {restaurant?.country ?? 'Kenya'}
              </p>
            </address>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={restaurant?.mapUrl ?? 'https://www.google.com/maps/search/?api=1&query=Kilimani%2C%20Nairobi'}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium underline-offset-4 hover:underline"
              >
                Open in Maps ↗
              </a>
              <a
                href={restaurant?.mapUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-stone underline-offset-4 hover:text-ink hover:underline"
              >
                Get directions ↗
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-7 lg:col-span-3">
            <Clock className="size-5 text-champagne-text" aria-hidden />
            <h3 className="mt-4 text-card">Opening hours</h3>
            <ul className="mt-3 space-y-1.5">
              {(settings?.openingHours ?? []).map((h) => (
                <li key={h.day} className="flex items-baseline justify-between gap-3 text-support">
                  <span className={cn(h.closed ? 'text-stone/60' : 'text-ink')}>{h.label}</span>
                  <span className="tabular-nums text-stone">
                    {h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                  </span>
                </li>
              ))}
              {!settings && <Skeleton className="h-32 w-full" />}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-paper p-7 lg:col-span-3">
            <Phone className="size-5 text-champagne-text" aria-hidden />
            <h3 className="mt-4 text-card">Contact</h3>
            <div className="mt-3 space-y-2 text-support">
              <p>
                <a href={`tel:${(restaurant?.phone ?? '').replace(/\s/g, '')}`} className="hover:underline">
                  {restaurant?.phone ?? '+254 700 512 846'}
                </a>
              </p>
              <p>
                <a href={`mailto:${restaurant?.email ?? 'hello@maisonnoir.demo'}`} className="hover:underline">
                  {restaurant?.email ?? 'hello@maisonnoir.demo'}
                </a>
              </p>
            </div>
            <p className="mt-5 rounded-xl bg-ivory p-3 text-[12px] leading-relaxed text-stone">
              MAISON NOIR is a fictional restaurant for this demo. Contact details are illustrative.
            </p>
            <Link to="/contact" className="mt-4 inline-block text-[13px] font-medium underline-offset-4 hover:underline">
              Contact &amp; accessibility →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
