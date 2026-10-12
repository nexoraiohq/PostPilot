import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { subscribeToCategories, subscribeToMenuItems } from '@/services/menu.service'
import { subscribeToRestaurant, subscribeToSettings } from '@/services/restaurant.service'
import type { MenuCategory, MenuItem, Restaurant, RestaurantSettings } from '@/types'

interface MenuDataValue {
  categories: MenuCategory[]
  items: MenuItem[]
  featured: MenuItem[]
  loading: boolean
  error: Error | null
  itemById: (id: string) => MenuItem | undefined
}

interface RestaurantDataValue {
  restaurant: Restaurant | null
  settings: RestaurantSettings | null
  loading: boolean
  error: Error | null
}

const MenuDataContext = createContext<MenuDataValue | null>(null)
const RestaurantDataContext = createContext<RestaurantDataValue | null>(null)

export function MenuDataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [ready, setReady] = useState({ categories: false, items: false })
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fail = (err: Error) => {
      setError(err)
      setReady({ categories: true, items: true })
    }
    const unsubs = [
      subscribeToCategories(
        (value) => {
          setCategories(value)
          setReady((prev) => ({ ...prev, categories: true }))
        },
        fail,
      ),
      subscribeToMenuItems(
        (value) => {
          setItems(value)
          setReady((prev) => ({ ...prev, items: true }))
        },
        fail,
      ),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const loading = !(ready.categories && ready.items)

  const value = useMemo<MenuDataValue>(() => {
    const byId = new Map(items.map((i) => [i.id, i]))
    return {
      categories,
      items,
      featured: items.filter((i) => i.featured && i.available),
      loading,
      error,
      itemById: (id) => byId.get(id),
    }
  }, [categories, items, loading, error])

  return <MenuDataContext.Provider value={value}>{children}</MenuDataContext.Provider>
}

export function RestaurantDataProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const unsubs = [
      subscribeToRestaurant(setRestaurant, setError),
      subscribeToSettings(setSettings, setError),
    ]
    const t = window.setTimeout(() => setLoading(false), 800)
    return () => {
      unsubs.forEach((u) => u())
      window.clearTimeout(t)
    }
  }, [])

  const value = useMemo<RestaurantDataValue>(
    () => ({ restaurant, settings, loading, error }),
    [restaurant, settings, loading, error],
  )

  return <RestaurantDataContext.Provider value={value}>{children}</RestaurantDataContext.Provider>
}

export function useMenuData(): MenuDataValue {
  const ctx = useContext(MenuDataContext)
  if (!ctx) throw new Error('useMenuData must be used inside MenuDataProvider')
  return ctx
}

export function useRestaurantData(): RestaurantDataValue {
  const ctx = useContext(RestaurantDataContext)
  if (!ctx) throw new Error('useRestaurantData must be used inside RestaurantDataProvider')
  return ctx
}
