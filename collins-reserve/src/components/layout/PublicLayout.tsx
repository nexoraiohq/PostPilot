import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { CartDrawer } from '@/components/ordering/CartDrawer'

function RouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    /* Move focus to the main region on navigation so screen-reader and
       keyboard users land on the new page's content, not the header. */
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-[14px] focus:font-medium focus:text-ivory"
      >
        Skip to content
      </a>
      <RouteFocus />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
    </div>
  )
}
