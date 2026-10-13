import { useCallback, useEffect, useState } from 'react'
import { ListPlus, PlusCircle, Settings as SettingsIcon } from 'lucide-react'
import { getKey } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Login } from '@/components/Login'
import { Queue } from '@/components/Queue'
import { Composer } from '@/components/Composer'
import { Detail } from '@/components/Detail'
import { SettingsPage } from '@/components/SettingsPage'
import { SharePage } from '@/components/SharePage'

type Route =
  | { name: 'share'; id: string }
  | { name: 'queue' }
  | { name: 'composer' }
  | { name: 'detail'; id: string }
  | { name: 'settings' }

function parseRoute(): Route {
  const path = window.location.pathname
  const share = path.match(/^\/share\/([A-Za-z0-9_-]+)/)
  if (share) return { name: 'share', id: share[1] }
  if (path.startsWith('/settings')) return { name: 'settings' }
  if (path.startsWith('/new')) return { name: 'composer' }
  const detail = path.match(/^\/item\/([A-Za-z0-9_-]+)/)
  if (detail) return { name: 'detail', id: detail[1] }
  return { name: 'queue' }
}

function initRoute(): Route {
  const params = new URLSearchParams(window.location.search)
  if (params.get('tiktok')) {
    window.history.replaceState({}, '', window.location.pathname)
    return { name: 'settings' }
  }
  return parseRoute()
}

function initNotice(): string {
  const params = new URLSearchParams(window.location.search)
  const tt = params.get('tiktok')
  if (tt === 'connected') return 'TikTok account connected successfully.'
  if (tt === 'error') return 'TikTok connect was cancelled or failed — check your app keys.'
  return ''
}

export function App() {
  const [route, setRoute] = useState<Route>(initRoute)
  const [unlocked, setUnlocked] = useState(() => Boolean(getKey()))
  const [notice] = useState(initNotice)

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path)
    setRoute(parseRoute())
  }, [])

  useEffect(() => {
    const onPop = () => setRoute(parseRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (route.name === 'share') {
    return <SharePage id={route.id} />
  }

  if (!unlocked) {
    return <Login onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 font-bold tracking-tight"
          >
            <img src="/favicon.svg" alt="" className="size-7 rounded-md" />
            PostPilot
          </button>
          <div className="flex items-center gap-1">
            <NavBtn
              active={route.name === 'queue'}
              onClick={() => navigate('/')}
              icon={<ListPlus className="size-4" aria-hidden />}
              label="Queue"
            />
            <NavBtn
              active={route.name === 'composer'}
              onClick={() => navigate('/new')}
              icon={<PlusCircle className="size-4" aria-hidden />}
              label="New post"
            />
            <NavBtn
              active={route.name === 'settings'}
              onClick={() => navigate('/settings')}
              icon={<SettingsIcon className="size-4" aria-hidden />}
              label="Settings"
            />
          </div>
        </div>
      </nav>

      {route.name === 'queue' && (
        <Queue
          onOpen={(id) => navigate(`/item/${id}`)}
          onCompose={() => navigate('/new')}
        />
      )}
      {route.name === 'composer' && (
        <Composer
          onBack={() => navigate('/')}
          onSaved={(item) => navigate(`/item/${item.id}`)}
        />
      )}
      {route.name === 'detail' && (
        <Detail id={route.id} onBack={() => navigate('/')} onDeleted={() => navigate('/')} />
      )}
      {route.name === 'settings' && <SettingsPage notice={notice} />}
    </div>
  )
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
        active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
