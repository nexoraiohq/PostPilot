import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MenuItem, MenuItemAddon, MenuItemVariant } from '@/types'

export interface CartLine {
  key: string
  itemId: string
  name: string
  imageUrl: string
  unitPriceKes: number
  quantity: number
  variantId: string | null
  variantName: string | null
  addons: MenuItemAddon[]
}

export interface AddToCartOptions {
  quantity?: number
  variant?: MenuItemVariant | null
  addons?: MenuItemAddon[]
}

interface CartContextValue {
  lines: CartLine[]
  itemCount: number
  subtotalKes: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addLine: (item: MenuItem, options?: AddToCartOptions) => void
  setQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'collins-reserve-cart-v1'

function lineKey(itemId: string, variantId: string | null, addonIds: string[]): string {
  return [itemId, variantId ?? '', [...addonIds].sort().join('+')].join('|')
}

function loadStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CartLine[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadStored())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const addLine = useCallback((item: MenuItem, options: AddToCartOptions = {}) => {
    const quantity = Math.max(1, options.quantity ?? 1)
    const variant = options.variant ?? null
    const addons = options.addons ?? []
    const key = lineKey(item.id, variant?.id ?? null, addons.map((a) => a.id))
    const unitPriceKes = item.priceKes + (variant?.priceDeltaKes ?? 0) + addons.reduce((s, a) => s + a.priceKes, 0)

    setLines((prev) => {
      const existing = prev.find((l) => l.key === key)
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l,
        )
      }
      return [
        ...prev,
        {
          key,
          itemId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          unitPriceKes,
          quantity,
          variantId: variant?.id ?? null,
          variantName: variant?.name ?? null,
          addons,
        },
      ]
    })
  }, [])

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l)),
    )
  }, [])

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
    const subtotalKes = lines.reduce((sum, l) => sum + l.unitPriceKes * l.quantity, 0)
    return {
      lines,
      itemCount,
      subtotalKes,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addLine,
      setQuantity,
      removeLine,
      clear,
    }
  }, [lines, isOpen, addLine, setQuantity, removeLine, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
