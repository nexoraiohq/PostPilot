import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu as MenuIcon, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/context/cart'
import { useRestaurantData } from '@/hooks/data'
import { useLockBody, useScrolled } from '@/hooks/ui'
import { cn } from '@/utils/cn'
import { formatTime12h } from '@/utils/format'
import { LinkButton } from '@/components/ui/Button'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/story', label: 'Our Story' },
  { to: '/experiences', label: 'Experiences' },
]

const SITE_YEAR = new Date().getFullYear()

function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span
        className={cn(
          'font-display font-medium uppercase tracking-[0.32em] text-ink',
          compact ? 'text-[13px]' : 'text-[15px] sm:text-[17px]',
        )}
      >
        Maison Noir
      </span>
      {!compact && (
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.34em] text-stone">Est. 2026</span>
      )}
    </span>
  )
}

function AnnouncementStrip() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('mn-announce-dismissed') === '1')
  if (dismissed) return null
  const message = 'Seasonal tasting menu now booking · Six courses · Thursday to Saturday evenings'
  return (
    <div className="relative bg-ink text-ivory">
      <div className="flex h-9 items-center overflow-hidden">
        <div className="flex w-max animate-marquee gap-16 pl-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="label-caps whitespace-nowrap text-champagne-soft/90">
              {message}
              {' · '}
              {message}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem('mn-announce-dismissed', '1')
          setDismissed(true)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ivory/70 transition-colors hover:bg-white/10 hover:text-ivory"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

export function SiteHeader() {
  const scrolled = useScrolled(32)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { itemCount, openCart } = useCart()
  const { settings } = useRestaurantData()

  useLockBody(mobileOpen)

  return (
    <header className="sticky top-0 z-40">
      <AnnouncementStrip />
      <div
        className={cn(
          'border-b transition-all duration-300 ease-out',
          scrolled ? 'border-line bg-ivory/92 backdrop-blur-xl' : 'border-transparent bg-ivory',
        )}
      >
        <div
          className={cn(
            'editorial-width flex items-center justify-between gap-6 transition-all duration-300',
            scrolled ? 'h-14' : 'h-16 sm:h-[68px]',
          )}
        >
          <Link to="/" aria-label="MAISON NOIR home" className="shrink-0">
            <Wordmark compact={scrolled} />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-full px-4 py-2 text-[13px] font-medium tracking-[0.04em] transition-colors duration-200',
                    isActive ? 'text-ink' : 'text-stone hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="absolute inset-x-4 -bottom-px h-px bg-champagne" aria-hidden />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openCart}
              className="relative rounded-full p-2.5 text-ink transition-colors hover:bg-ink/5"
              aria-label={`Open cart, ${itemCount} items`}
            >
              <ShoppingBag className="size-[18px]" aria-hidden />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-ivory">
                  {itemCount}
                </span>
              )}
            </button>
            <LinkButton to="/order" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Order Online
            </LinkButton>
            <LinkButton to="/reserve" size="sm" className="hidden sm:inline-flex">
              Reserve a Table
            </LinkButton>
            <button
              type="button"
              className="rounded-full p-2.5 text-ink transition-colors hover:bg-ink/5 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink text-ivory lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setMobileOpen(false)
          }}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <span className="font-display text-[15px] font-medium uppercase tracking-[0.32em]">Maison Noir</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-full p-2 text-ivory/80 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-1 px-6 pb-24">
            {NAV_ITEMS.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'font-display py-3 text-5xl font-light tracking-tight transition-colors',
                    isActive ? 'text-champagne' : 'text-ivory/90 hover:text-ivory',
                  )
                }
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              <LinkButton to="/reserve" size="lg" className="bg-champagne text-ink hover:bg-champagne-soft">
                Reserve a Table
              </LinkButton>
              <LinkButton
                to="/order"
                size="lg"
                variant="secondary"
                className="border-ivory/25 text-ivory hover:border-ivory/60"
              >
                Order Online
              </LinkButton>
              <Link to="/contact" className="mt-2 text-center text-[13px] tracking-[0.08em] text-ivory/60 uppercase hover:text-ivory">
                Contact &amp; Visit
              </Link>
            </div>
          </nav>
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 px-6 py-4 text-center">
            <p className="text-[12px] tracking-[0.14em] text-ivory/50 uppercase">
              {settings ? 'Nairobi · Kenya' : 'Nairobi · Kenya'}
            </p>
          </div>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  const { restaurant, settings } = useRestaurantData()
  const hours = settings?.openingHours ?? []

  return (
    <footer className="bg-ink text-ivory">
      <div className="editorial-width section-y grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="font-display text-xl font-medium uppercase tracking-[0.32em]">Maison Noir</p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.34em] text-champagne">Est. 2026</p>
          <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-ivory/65">
            A slower kind of dining. Seasonal ingredients, thoughtful cooking, and an evening worth remembering.
          </p>
          <p className="mt-8 text-[11px] leading-relaxed tracking-[0.08em] text-ivory/40 uppercase">
            Fictional restaurant · Demo experience
          </p>
        </div>

        <nav aria-label="Footer" className="md:col-span-2">
          <p className="label-caps text-champagne">Explore</p>
          <ul className="mt-5 space-y-3 text-[14px] text-ivory/70">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/order" className="transition-colors hover:text-ivory">
                Order Online
              </Link>
            </li>
            <li>
              <Link to="/reserve" className="transition-colors hover:text-ivory">
                Reservations
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition-colors hover:text-ivory">
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="label-caps text-champagne">Visit</p>
          <address className="mt-5 space-y-1 text-[14px] not-italic leading-relaxed text-ivory/70">
            {(restaurant?.addressLines ?? ['12 Riverside Lane', 'Kilimani']).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              {restaurant?.city ?? 'Nairobi'}, {restaurant?.country ?? 'Kenya'}
            </p>
          </address>
          <p className="mt-4 text-[14px] text-ivory/70">
            <a href={`tel:${(restaurant?.phone ?? '+254 700 000 000').replace(/\s/g, '')}`} className="hover:text-ivory">
              {restaurant?.phone ?? '+254 700 000 000'}
            </a>
          </p>
          <p className="text-[14px] text-ivory/70">
            <a href={`mailto:${restaurant?.email ?? 'hello@maisonnoir.demo'}`} className="hover:text-ivory">
              {restaurant?.email ?? 'hello@maisonnoir.demo'}
            </a>
          </p>
          {restaurant?.instagramUrl && (
            <p className="mt-4 text-[14px]">
              <a
                href={restaurant.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-ivory/70 transition-colors hover:text-ivory"
              >
                Instagram ↗
              </a>
            </p>
          )}
        </div>

        <div className="md:col-span-3">
          <p className="label-caps text-champagne">Hours</p>
          <ul className="mt-5 space-y-1.5 text-[14px] text-ivory/70">
            {(hours.length > 0
              ? hours
              : [
                { day: 1, label: 'Monday', closed: true, open: '', close: '' },
                { day: 2, label: 'Tuesday', closed: false, open: '12:00', close: '15:00' },
                { day: 3, label: 'Wednesday', closed: false, open: '12:00', close: '15:00' },
                { day: 4, label: 'Thursday', closed: false, open: '12:00', close: '22:30' },
                { day: 5, label: 'Friday', closed: false, open: '12:00', close: '23:00' },
                { day: 6, label: 'Saturday', closed: false, open: '12:00', close: '23:00' },
                { day: 0, label: 'Sunday', closed: false, open: '12:00', close: '16:00' },
              ]
            ).map((h) => (
              <li key={h.label} className="flex items-baseline justify-between gap-4">
                <span>{h.label}</span>
                <span className="tabular-nums text-ivory/50">
                  {h.closed ? 'Closed' : `${formatTime12h(h.open)} – ${formatTime12h(h.close)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="editorial-width flex flex-col items-center justify-between gap-3 py-6 text-[12px] tracking-[0.06em] text-ivory/45 sm:flex-row">
          <p>© {SITE_YEAR} MAISON NOIR — fictional demo restaurant.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-ivory/80">Privacy</Link>
            <Link to="/terms" className="hover:text-ivory/80">Terms</Link>
            <Link to="/cancellation-policy" className="hover:text-ivory/80">Cancellation</Link>
          </div>
          <p>Digital experience by Collins Maiko</p>
        </div>
      </div>
    </footer>
  )
}
