import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Clock, MapPin, Phone } from 'lucide-react'
import { subscribeToExperiences } from '@/services/restaurant.service'
import { useMenuData, useRestaurantData } from '@/hooks/data'
import { formatKes, todayInTimezone } from '@/utils/format'
import { Badge } from '@/components/ui/Badge'
import { LinkButton, buttonStyles } from '@/components/ui/Button'
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

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
      <div>
        <p className="label-caps mb-3 text-champagne">{eyebrow}</p>
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
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-caps mb-6 text-stone">
              Nairobi · Kenya
              <span className="mx-3 text-champagne">·</span>
              Est. 2026
            </p>
            <h1 className="text-hero max-w-4xl">
              A slower kind
              <br />
              of dining<span className="text-champagne">.</span>
            </h1>
          </div>
          <div className="max-w-sm shrink-0 md:pb-3">
            <p className="text-body text-stone">
              {restaurant?.positioning ??
                'Seasonal ingredients. Thoughtful cooking. An evening worth remembering.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <LinkButton to="/reserve" size="lg">Reserve a Table</LinkButton>
              <LinkButton to="/menu" variant="secondary" size="lg">
                Explore the Menu
                <ArrowUpRight className="size-4" aria-hidden />
              </LinkButton>
            </div>
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-2xl bg-line/40 md:mt-14 md:rounded-3xl">
          <img
            src={HERO_IMAGE}
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
          eyebrow="From the kitchen"
          title="Signature dishes, changing with the season"
          action={
            <Link to="/menu" className={buttonStyles('secondary', 'md')}>
              View full menu
              <ArrowUpRight className="size-4" aria-hidden />
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
              Signature dishes appear here as soon as they are added to the kitchen's menu.
            </p>
          </div>
        ) : (
          <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {signatures.map((dish) => (
              <li key={dish.id} className="w-[78vw] shrink-0 snap-start sm:w-auto">
                <Link to={`/menu?dish=${dish.id}`} className="group block">
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
                    <h3 className="text-card group-hover:text-stone transition-colors">{dish.name}</h3>
                    <span className="text-[15px] font-medium tabular-nums whitespace-nowrap">
                      {formatKes(dish.priceKes)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-support text-stone line-clamp-2">{dish.description}</p>
                </Link>
              </li>
            ))}
          </ul>
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
            <div className="overflow-hidden rounded-2xl bg-line/40 lg:rounded-3xl">
              <img
                src={STORY_IMAGE}
                alt="Morning light in the MAISON NOIR dining room, with the bar and open kitchen beyond"
                loading="lazy"
                width={1400}
                height={1750}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="label-caps mb-4 text-champagne">The restaurant</p>
            <h2 className="text-section max-w-xl">
              A small dining room built around one idea: cook what the season gives us.
            </h2>
            <p className="mt-6 max-w-xl text-body text-stone">
              {restaurant?.storyIntro ??
                'MAISON NOIR is a small dining room built around one idea: cook what the season gives us, and give every table time.'}{' '}
              We buy from twelve growers and producers we know by name, write the menu weekly, and cook over charcoal
              and fire. Nothing rushes; that is the point.
            </p>

            <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-2">
              {FACTS.map((fact) => (
                <div key={fact.value}>
                  <dt className="font-display text-3xl font-light text-ink">{fact.value}</dt>
                  <dd className="mt-1 text-support text-stone">{fact.label}</dd>
                </div>
              ))}
            </dl>

            <Link to="/story" className={buttonStyles('secondary', 'md', 'mt-10')}>
              Read our story
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* 04 — Experiences */}
      <section aria-label="Dining experiences" className="editorial-width section-y">
        <SectionHeading
          eyebrow="Ways to dine"
          title="Experiences beyond the à la carte menu"
          action={
            <Link to="/experiences" className={buttonStyles('ghost', 'md')}>
              All experiences
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          }
        />
        {experiences.length === 0 ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.slice(0, 4).map((exp) => (
              <article key={exp.id} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper">
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
            ))}
          </div>
        )}
      </section>

      {/* 05 — Reservation CTA */}
      <section aria-label="Reserve a table" className="bg-ink text-ivory">
        <div className="editorial-width section-y">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <p className="label-caps mb-4 text-champagne">Reservations</p>
              <h2 className="text-section">
                Your table is
                <br />
                waiting.
              </h2>
              <p className="mt-5 max-w-md text-body text-ivory/65">
                Choose your party size and date, and we will show the seating times we still have open. Requests are
                confirmed by our team.
              </p>
            </div>
            <div className="lg:col-span-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  navigate(`/reserve?guests=${guests}&date=${date}`)
                }}
                className="rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label-caps mb-3 block text-ivory/60">Guests</span>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-ivory [&>option]:bg-ink"
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
                      className="h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 text-ivory [color-scheme:dark]"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-6 h-12 w-full rounded-full bg-champagne text-[15px] font-medium text-ink transition-colors hover:bg-champagne-soft active:scale-[0.99]"
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
        <SectionHeading eyebrow="Visit us" title="Find us in Kilimani" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-paper p-7">
            <MapPin className="size-5 text-champagne" aria-hidden />
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

          <div className="rounded-2xl border border-line bg-paper p-7">
            <Clock className="size-5 text-champagne" aria-hidden />
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

          <div className="rounded-2xl border border-line bg-paper p-7">
            <Phone className="size-5 text-champagne" aria-hidden />
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
