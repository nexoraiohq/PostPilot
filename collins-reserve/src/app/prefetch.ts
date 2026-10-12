/* Route module prefetching — warms the lazy chunk on hover/focus/idle so
   navigation feels instant. Each loader matches the router's lazy import. */
const loaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/public/HomePage'),
  '/menu': () => import('@/pages/public/MenuPage'),
  '/story': () => import('@/pages/public/StoryPage'),
  '/experiences': () => import('@/pages/public/ExperiencesPage'),
  '/reserve': () => import('@/pages/public/ReservePage'),
  '/order': () => import('@/pages/public/OrderPage'),
  '/contact': () => import('@/pages/public/ContactPage'),
}

export function prefetchRoute(path: string) {
  loaders[path]?.()
}

/** Warm the two highest-intent pages once the browser is idle. */
export function warmCommonRoutes() {
  const run = () => {
    prefetchRoute('/menu')
    prefetchRoute('/reserve')
  }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback
  if (idle) idle(run, { timeout: 3000 })
  else window.setTimeout(run, 1500)
}

/** Unsplash URL → srcset across the widths the layout actually renders. */
export function imgSrcSet(url: string, widths: number[]): string | undefined {
  if (!url.includes('images.unsplash.com') || !/[?&]w=\d+/.test(url)) return undefined
  return widths.map((w) => `${url.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`).join(', ')
}
