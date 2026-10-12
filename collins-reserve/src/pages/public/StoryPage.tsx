import { ArrowUpRight } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

const PHILOSOPHY_IMAGE = 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1400&q=80'
const GROWERS_IMAGE = 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1400&q=80'
const ROOM_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80'

interface BandProps {
  eyebrow: string
  title: string
  image: string
  alt: string
  reverse?: boolean
  children: React.ReactNode
}

function Band({ eyebrow, title, image, alt, reverse = false, children }: BandProps) {
  return (
    <section aria-label={eyebrow} className="editorial-width section-y">
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
        <div className={cn('lg:col-span-5', reverse ? 'lg:order-2' : 'lg:order-1')}>
          <div className="overflow-hidden rounded-2xl bg-line/40 lg:rounded-3xl">
            <img
              src={image}
              alt={alt}
              loading="lazy"
              width={1400}
              height={1750}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
        </div>
        <div className={cn('lg:col-span-6', reverse ? 'lg:order-1' : 'lg:order-2')}>
          <p className="label-caps mb-4 text-champagne">{eyebrow}</p>
          <h2 className="text-section max-w-xl">{title}</h2>
          <div className="mt-6 max-w-xl space-y-4 text-body text-stone">{children}</div>
        </div>
      </div>
    </section>
  )
}

function PullQuote({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="editorial-width pb-2 pt-4">
      <blockquote className="mx-auto max-w-3xl border-t border-line pt-10 text-center text-section">
        {children}
      </blockquote>
      <figcaption className="label-caps mt-5 text-center text-stone">{caption}</figcaption>
    </figure>
  )
}

export default function StoryPage() {
  return (
    <>
      {/* 01 — Header */}
      <section aria-label="Our story" className="editorial-width pt-12 md:pt-16 lg:pt-20">
        <p className="label-caps mb-6 text-stone">
          Our story
          <span className="mx-3 text-champagne">·</span>
          Maison Noir
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="text-page max-w-3xl">
            The long way
            <br />
            to the table<span className="text-champagne">.</span>
          </h1>
          <p className="max-w-sm shrink-0 text-support text-stone md:pb-3">
            A small dining room in Kilimani, cooking what the season gives us and giving every table time.
          </p>
        </div>
        <div className="mt-10 border-t border-line pt-8 md:mt-14">
          <p className="max-w-2xl text-body text-ink/80">
            MAISON NOIR is a fictional restaurant built for this demo, but the way it thinks is deliberate: buy well,
            cook simply, and look after people properly. This is how the room, the menu and the service came together.
          </p>
        </div>
      </section>

      {/* 02 — Philosophy */}
      <Band
        eyebrow="Philosophy"
        title="Cook the season, not the schedule."
        image={PHILOSOPHY_IMAGE}
        alt="A cook preparing vegetables at a wooden bench in the MAISON NOIR kitchen"
      >
        <p>
          We write the menu once a week, on Monday, after the market and the growers have had their say. If the
          tomatoes are not worth eating, there are no tomatoes that week. If the tilapia from Lake Victoria arrives
          late, it waits for the next service rather than the other way round.
        </p>
        <p>
          Fire does the rest — charcoal on the grill, a wood oven for bread, one heavy pan for the sauces. Fewer
          techniques, applied patiently, so an ingredient still tastes like itself when it reaches the table.
        </p>
      </Band>

      <PullQuote caption="From the kitchen">A kitchen that knows its growers by name never cooks the same way twice.</PullQuote>

      {/* 03 — Ingredients & growers */}
      <Band
        eyebrow="Ingredients & growers"
        title="Twelve names on the wall, not a supply chain."
        image={GROWERS_IMAGE}
        alt="A plate of just-dressed greens and seasonal produce from the morning market"
        reverse
      >
        <p>
          We buy from twelve growers and producers we know by name — a vegetable farm above Tigoni, a dairy near
          Naivasha, a beekeeper on the Kinangop slopes, fishers on Lake Victoria, and a roaster two streets from the
          door. Most of what arrives was picked or made the day before we serve it.
        </p>
        <p>
          Because we buy this way, the menu moves constantly. A dish may run for three weeks or three days. We would
          rather explain why something has disappeared than serve it a month past its best.
        </p>
      </Band>

      {/* 04 — The room */}
      <Band
        eyebrow="The room"
        title="A townhouse dining room with the lights kept low."
        image={ROOM_IMAGE}
        alt="The MAISON NOIR dining room at dusk, with oak tables, linen and warm pendant lighting"
      >
        <p>
          The dining room sits on the ground floor of a 1970s townhouse off Riverside Lane. Plaster walls are left
          imperfect, tables are oak, linen appears only where it helps, and the light drops low enough that the room
          quietly disappears by the second course.
        </p>
        <p>
          Beyond it: a terrace for long lunches, and a private room that seats fourteen for tastings, small
          celebrations, and the kind of dinner that runs past midnight with the team&apos;s blessing.
        </p>
      </Band>

      <PullQuote caption="Hospitality">The best evenings are the ones where nobody looks at the time.</PullQuote>

      {/* 05 — Hospitality */}
      <section aria-label="Hospitality" className="editorial-width section-y">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="label-caps mb-4 text-champagne">Hospitality</p>
            <h2 className="text-section">Service that reads the table.</h2>
          </div>
          <div className="space-y-4 text-body text-stone lg:col-span-7 lg:col-start-6">
            <p>
              We seat you, and then we leave you to it. Courses arrive when you are ready rather than when a timer
              says so, tastes come before full glasses, and if you want to talk between courses for twenty minutes,
              that is a perfectly good way to spend an evening.
            </p>
            <p>
              Tell us about allergies, dietary needs and celebrations when you book — we plan for them properly
              instead of improvising at the pass. Every table gets the same attention, whether it is a Tuesday for two
              or a Saturday for twelve.
            </p>
          </div>
        </div>
      </section>

      {/* 06 — Continue */}
      <section aria-label="Continue" className="border-t border-line">
        <div className="editorial-width section-y text-center">
          <p className="label-caps mb-4 text-champagne">Next</p>
          <h2 className="mx-auto max-w-2xl text-section">
            Read the menu, or take a seat at one.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton to="/menu" variant="secondary" size="md">
              View the menu
              <ArrowUpRight className="size-4" aria-hidden />
            </LinkButton>
            <LinkButton to="/reserve" size="md">
              Reserve a table
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  )
}
