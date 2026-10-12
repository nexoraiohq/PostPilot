import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Search, TriangleAlert, X } from 'lucide-react'
import { useMenuData, useRestaurantData } from '@/hooks/data'
import { useCart } from '@/context/cart'
import { DIETARY_LABELS, type MenuItem, type RestaurantSettings } from '@/types'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { DishDetailModal } from '@/components/menu/DishDetailModal'

function serviceDaysLabel(settings: RestaurantSettings | null): string | null {
  if (!settings) return null
  const open = settings.openingHours.filter((h) => !h.closed)
  const closed = settings.openingHours.filter((h) => h.closed)
  if (open.length === 0) return 'Currently closed for service'
  const head =
    open.length === settings.openingHours.length
      ? 'Service days · every day'
      : `Service days · ${open.map((h) => h.label.slice(0, 3)).join(', ')}`
  return closed.length > 0 ? `${head} · closed ${closed.map((h) => h.label.slice(0, 3)).join(', ')}` : head
}

function DishCard({ item, onOpen }: { item: MenuItem; onOpen: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(item.id)} className="group block w-full text-left">
        <div className="relative overflow-hidden rounded-2xl bg-line/40">
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            width={900}
            height={1125}
            className={cn(
              'aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]',
              !item.available && 'grayscale opacity-70',
            )}
          />
          {!item.available && (
            <Badge tone="error" className="absolute left-3 top-3">
              Sold out
            </Badge>
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <h3 className="text-card transition-colors group-hover:text-stone">{item.name}</h3>
          <span className="whitespace-nowrap text-[15px] font-medium tabular-nums">{formatKes(item.priceKes)}</span>
        </div>
        <p className="mt-1.5 text-support text-stone line-clamp-2">{item.description}</p>
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} tone="champagne">
                {DIETARY_LABELS[tag]}
              </Badge>
            ))}
          </div>
        )}
      </button>
    </li>
  )
}

function DishRow({ item, onOpen }: { item: MenuItem; onOpen: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(item.id)} className="flex w-full items-start gap-4 py-4 text-left">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-line/40">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            width={160}
            height={160}
            className={cn('aspect-square size-full object-cover', !item.available && 'grayscale opacity-70')}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[15px] font-medium">{item.name}</h3>
            <span className="shrink-0 text-[14px] font-medium tabular-nums">{formatKes(item.priceKes)}</span>
          </div>
          <p className="mt-1 text-support text-stone line-clamp-2">{item.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!item.available && <Badge tone="error">Sold out</Badge>}
            {item.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} tone="champagne">
                {DIETARY_LABELS[tag]}
              </Badge>
            ))}
          </div>
        </div>
      </button>
    </li>
  )
}

export default function MenuPage() {
  const { categories, items, loading, error: dataError, itemById } = useMenuData()
  const { settings } = useRestaurantData()
  const { itemCount, subtotalKes } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [dismissedError, setDismissedError] = useState<Error | null>(null)
  const [stickyTop, setStickyTop] = useState(92)

  /* Realtime feed errors surface here until acknowledged (retry). */
  const error = dataError && dataError !== dismissedError ? dataError : null

  /* The sticky category bar sits directly beneath the site header,
     whose height changes on scroll (announcement strip + compact bar). */
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('header')
    if (!header || typeof ResizeObserver === 'undefined') return
    const update = () => setStickyTop(Math.round(header.getBoundingClientRect().height))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const term = query.trim().toLowerCase()
  const requestedSlug = searchParams.get('category') ?? 'all'
  const categoryBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories])
  const activeSlug =
    requestedSlug === 'all' || categoryBySlug.has(requestedSlug) || categories.length === 0 ? requestedSlug : 'all'

  const visibleItems = useMemo(() => {
    if (term) return items.filter((item) => item.name.toLowerCase().includes(term))
    if (activeSlug === 'all') return items
    const category = categoryBySlug.get(activeSlug)
    return category ? items.filter((item) => item.categoryId === category.id) : items
  }, [items, term, activeSlug, categoryBySlug])

  const dishId = searchParams.get('dish')
  const dish = dishId ? itemById(dishId) : undefined

  function updateParams(mutate: (next: URLSearchParams) => void) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        mutate(next)
        return next
      },
      { replace: true },
    )
  }

  function selectCategory(slug: string) {
    setQuery('')
    updateParams((next) => {
      if (slug === 'all') next.delete('category')
      else next.set('category', slug)
    })
  }

  function openDish(id: string) {
    updateParams((next) => next.set('dish', id))
  }

  function closeDish() {
    updateParams((next) => next.delete('dish'))
  }

  const daysLabel = serviceDaysLabel(settings)
  const countLabel = loading
    ? 'Loading dishes…'
    : term
      ? `${visibleItems.length} ${visibleItems.length === 1 ? 'dish matches' : 'dishes match'} “${query.trim()}”`
      : `${visibleItems.length} ${visibleItems.length === 1 ? 'dish' : 'dishes'} on the menu`

  return (
    <>
      {/* Page header */}
      <section className="editorial-width pt-10 md:pt-14">
        <p className="label-caps mb-5 text-champagne">À la carte</p>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-page">
              Menu<span className="text-champagne">.</span>
            </h1>
            <p className="mt-5 max-w-xl text-body text-stone">
              Written weekly from the market and cooked over charcoal and fire. Add dishes to your order for pickup or
              delivery, or reserve a table and let the kitchen lead.
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-2 text-support text-stone">
            <Clock className="size-4 text-champagne" aria-hidden />
            {daysLabel ?? (settings === null && loading ? 'Loading service days…' : 'Service days to be confirmed')}
          </p>
        </div>

        <div className="relative mt-8 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
          <Input
            type="text"
            aria-label="Search dishes"
            placeholder="Search the menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 rounded-full pl-11 pr-12"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-stone transition-colors hover:bg-ivory hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <p className="mt-3 text-support text-stone" aria-live="polite">
          {countLabel}
        </p>
      </section>

      {/* Sticky category bar */}
      <div
        className="sticky z-30 border-y border-line bg-ivory/92 backdrop-blur-xl transition-[top] duration-300 ease-out"
        style={{ top: stickyTop }}
      >
        <nav aria-label="Menu categories" className="editorial-width">
          <div className="-mx-5 flex items-stretch gap-1 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:px-0">
            {[{ slug: 'all', name: 'All' }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))].map((tab) => {
              const active = activeSlug === tab.slug
              return (
                <button
                  key={tab.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectCategory(tab.slug)}
                  className={cn(
                    'relative shrink-0 whitespace-nowrap px-3 py-3.5 text-[13px] font-medium tracking-[0.04em] transition-colors duration-200',
                    active ? 'text-ink' : 'text-stone hover:text-ink',
                  )}
                >
                  {tab.name}
                  {active && <span className="absolute inset-x-3 -bottom-px h-px bg-champagne" aria-hidden />}
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Grid */}
      <section className={cn('editorial-width pt-8 pb-16', itemCount > 0 && 'pb-32 sm:pb-16')}>
        {error && (
          <div
            role="alert"
            className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-error/30 bg-error-soft px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
              <div>
                <p className="text-[15px] font-medium text-error">We couldn&apos;t keep the menu live.</p>
                <p className="text-support text-error/80">{error.message}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDismissedError(dataError)}>
              Try again
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" aria-hidden />}
            title={term ? `Nothing matches “${query.trim()}”` : 'This course is empty for now'}
            description={
              term
                ? 'Try another word, or clear the search to see the full menu.'
                : 'Dishes appear here as soon as they are added to the kitchen’s menu.'
            }
            action={
              term ? (
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              ) : (
                <LinkButton to="/reserve" variant="secondary">
                  Reserve a table
                </LinkButton>
              )
            }
          />
        ) : (
          <>
            <ul className="hidden gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <DishCard key={item.id} item={item} onOpen={openDish} />
              ))}
            </ul>
            <ul className="divide-y divide-line border-t border-line sm:hidden">
              {visibleItems.map((item) => (
                <DishRow key={item.id} item={item} onOpen={openDish} />
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-support text-stone">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Menu items update live from the restaurant&apos;s database.
        </p>
      </section>

      {/* Mobile cart bar */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="label-caps text-stone">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-[15px] font-medium tabular-nums">{formatKes(subtotalKes)}</p>
            </div>
            <LinkButton to="/order" size="md">
              View order
            </LinkButton>
          </div>
        </div>
      )}

      <DishDetailModal item={dish ?? null} onClose={closeDish} />
    </>
  )
}
