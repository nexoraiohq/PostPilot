import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Settings,
  Store,
  Table2,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/auth'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/ui/States'
import { buttonStyles } from '@/components/ui/Button'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/admin/menu', label: 'Menu', icon: Tag },
  { to: '/admin/tables', label: 'Tables', icon: Table2 },
  { to: '/admin/availability', label: 'Availability', icon: Store },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: ChartNoAxesColumn },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

function NavItems({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors duration-150',
              isActive
                ? 'bg-champagne/15 text-champagne'
                : compact
                  ? 'text-ivory/65 hover:bg-white/10 hover:text-ivory'
                  : 'text-ivory/55 hover:bg-white/[0.07] hover:text-ivory',
            )
          }
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    if (!mobileNav) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNav(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileNav])

  return (
    <AdminGuard>
      <div className="flex min-h-dvh bg-ivory">
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-[14px] focus:font-medium focus:text-ivory"
        >
          Skip to content
        </a>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-ink lg:flex">
          <div className="border-b border-white/10 px-5 py-5">
            <Link to="/" className="block">
              <span className="font-display text-[13px] font-medium uppercase tracking-[0.3em] text-ivory">Maison Noir</span>
              <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-champagne">Operations</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavItems />
          </div>
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-[12px] text-ivory/60">{profile?.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <Link to="/" className={buttonStyles('secondary', 'sm', 'flex-1 border-white/25 text-ivory hover:border-white/50 hover:bg-white/10')}>
                <ArrowLeft className="size-3.5" aria-hidden />
                Site
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className={buttonStyles('ghost', 'sm', 'text-ivory hover:bg-white/10')}
                aria-label="Sign out"
              >
                <LogOut className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ivory/92 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              aria-label="Open admin menu"
              className="rounded-md p-2 hover:bg-ink/5"
            >
              <MenuIcon className="size-5" aria-hidden />
            </button>
            <span className="font-display text-[13px] font-medium uppercase tracking-[0.28em]">Maison Noir</span>
            <Link to="/" className="rounded-md p-2 text-stone hover:bg-ink/5 hover:text-ink" aria-label="View site">
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          </div>

          <main id="admin-main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
        </div>

        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setMobileNav(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink text-ivory">
              <div className="flex items-center justify-between px-5 py-5">
                <span className="font-display text-[13px] font-medium uppercase tracking-[0.3em]">Maison Noir</span>
                <button type="button" aria-label="Close" onClick={() => setMobileNav(false)} className="rounded-md p-2 hover:bg-white/10">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <NavItems compact onNavigate={() => setMobileNav(false)} />
              </div>
              <div className="border-t border-white/10 p-4">
                <p className="truncate text-[12px] text-ivory/60">{profile?.email}</p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ivory/80 hover:bg-white/10"
                >
                  <LogOut className="size-4" aria-hidden /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}
