import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/services/firebase'
import {
  RESTAURANT_ID,
  type FulfillmentMethod,
  type Order,
  type OrderLine,
  type RestaurantSettings,
} from '@/types'
import { ORDER_TRANSITIONS } from '@/types'
import { computeOrderTotals, generateOrderReference } from '@/utils/order'

export interface OrderLineInput {
  itemId: string
  quantity: number
  variantId?: string | null
  addonIds?: string[]
}

export interface CreateOrderInput {
  type: FulfillmentMethod
  lines: OrderLineInput[]
  customer: { name: string; phone: string; email: string }
  delivery?: { address: string; area: string; notes: string } | null
  paymentMethod: string
}

export const MAX_ORDER_LINES = 8

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Submits an order in a transaction.
 * Prices, fees and totals are recomputed from live Firestore menu data —
 * the browser's totals are never trusted (Security Rules re-verify this).
 * The order document id IS the human reference (e.g. MN-483920).
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (input.lines.length === 0) throw new Error('Your order is empty.')
  if (input.lines.length > MAX_ORDER_LINES) {
    throw new Error(`A single order can contain at most ${MAX_ORDER_LINES} different dishes.`)
  }
  const phone = normalizePhone(input.customer.phone)
  if (phone.length < 9) throw new Error('Please enter a valid phone number.')

  const db = getDb()
  const settingsRef = doc(db, 'settings', RESTAURANT_ID)

  return runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef)
    const settings = settingsSnap.exists()
      ? (settingsSnap.data() as RestaurantSettings)
      : null

    if (settings) {
      if (input.type === 'pickup' && !settings.acceptPickup) {
        throw new Error('Pickup ordering is currently unavailable.')
      }
      if (input.type === 'delivery' && !settings.acceptDelivery) {
        throw new Error('Delivery ordering is currently unavailable.')
      }
    }

    const lines: OrderLine[] = []
    for (const line of input.lines) {
      const itemSnap = await tx.get(doc(db, 'menuItems', line.itemId))
      if (!itemSnap.exists()) throw new Error('One of the selected dishes is no longer available.')
      const item = { id: itemSnap.id, ...itemSnap.data() } as { id: string } & Record<string, unknown>
      if (item.available !== true) throw new Error(`"${String(item.name)}" is sold out right now.`)
      if (item.restaurantId !== RESTAURANT_ID) throw new Error('Invalid menu item.')

      const quantity = Math.max(1, Math.min(20, Math.floor(line.quantity)))
      const priceKes = Number(item.priceKes)

      let unit = priceKes
      let variantName: string | null = null
      if (line.variantId) {
        const variant = (item.variants as { id: string; name: string; priceDeltaKes: number }[] | undefined)?.find(
          (v) => v.id === line.variantId,
        )
        if (!variant) throw new Error(`Invalid option for "${String(item.name)}".`)
        unit += variant.priceDeltaKes
        variantName = variant.name
      }

      const addons = (line.addonIds ?? [])
        .map((id) => (item.addons as { id: string; name: string; priceKes: number }[] | undefined)?.find((a) => a.id === id))
        .filter((a): a is { id: string; name: string; priceKes: number } => Boolean(a))
        .map((a) => ({ id: a.id, name: a.name, priceKes: a.priceKes }))
      const addonsTotal = addons.reduce((sum, a) => sum + a.priceKes, 0)

      lines.push({
        itemId: line.itemId,
        name: String(item.name),
        unitPriceKes: unit,
        quantity,
        variantId: line.variantId ?? null,
        variantName,
        addons,
        lineTotalKes: (unit + addonsTotal) * quantity,
      })
    }

    const totals = computeOrderTotals(lines, settings, input.type)

    let reference = generateOrderReference()
    for (let i = 0; i < 5; i++) {
      const existing = await tx.get(doc(db, 'orders', reference))
      if (!existing.exists()) break
      reference = generateOrderReference()
    }

    const now = Date.now()
    const order: Order = {
      id: reference,
      restaurantId: RESTAURANT_ID,
      reference,
      type: input.type,
      items: lines,
      itemCount: totals.itemCount,
      subtotalKes: totals.subtotalKes,
      deliveryFeeKes: totals.deliveryFeeKes,
      serviceChargeKes: totals.serviceChargeKes,
      totalKes: totals.totalKes,
      customer: {
        name: input.customer.name.trim(),
        phone,
        email: input.customer.email.trim().toLowerCase(),
      },
      delivery:
        input.type === 'delivery'
          ? {
              address: (input.delivery?.address ?? '').trim(),
              area: (input.delivery?.area ?? '').trim(),
              notes: (input.delivery?.notes ?? '').trim(),
            }
          : null,
      paymentMethod: input.paymentMethod,
      status: 'received',
      cancelReason: null,
      timeline: [{ status: 'received', at: now }],
      statusUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    }

    tx.set(doc(db, 'orders', reference), { ...order, createdAtTs: serverTimestamp() })
    return order
  })
}

export function subscribeToOrder(
  orderId: string,
  cb: (order: Order | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'orders', orderId),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null),
    (e) => onError?.(e as Error),
  )
}

export interface OrderFilters {
  status?: string | null
  /** 'today' | 'week' | 'all' or a YYYY-MM-DD date */
  dateRange?: 'today' | 'week' | 'all' | string
  type?: FulfillmentMethod | null
  search?: string
}

/** Realtime admin order queue. Filters beyond status/date are applied client-side. */
export function subscribeToOrders(
  filters: OrderFilters,
  cb: (orders: Order[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const constraints = [where('restaurantId', '==', RESTAURANT_ID), orderBy('createdAt', 'desc'), limit(300)]
  return onSnapshot(
    query(collection(getDb(), 'orders'), ...constraints),
    (snap) => {
      let orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      if (filters.status) orders = orders.filter((o) => o.status === filters.status)
      if (filters.type) orders = orders.filter((o) => o.type === filters.type)
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        if (filters.dateRange === 'today') {
          orders = orders.filter((o) => o.createdAt >= startOfDay)
        } else if (filters.dateRange === 'week') {
          orders = orders.filter((o) => o.createdAt >= startOfDay - 6 * 86400000)
        } else {
          orders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === filters.dateRange)
        }
      }
      if (filters.search?.trim()) {
        const term = filters.search.trim().toLowerCase()
        orders = orders.filter(
          (o) =>
            o.reference.toLowerCase().includes(term) ||
            o.customer.name.toLowerCase().includes(term) ||
            o.customer.phone.includes(term),
        )
      }
      cb(orders)
    },
    (e) => onError?.(e as Error),
  )
}

/** Admin-only status transition. Invalid jumps are rejected locally and by Security Rules. */
export async function updateOrderStatus(orderId: string, to: Order['status'], note?: string): Promise<void> {
  const db = getDb()
  const ref = doc(db, 'orders', orderId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Order not found.')
    const order = { id: snap.id, ...snap.data() } as Order
    if (!ORDER_TRANSITIONS[order.status].includes(to)) {
      throw new Error(`An order cannot move from “${order.status}” to “${to}”.`)
    }
    const now = Date.now()
    tx.update(ref, {
      status: to,
      statusUpdatedAt: now,
      updatedAt: now,
      cancelReason: to === 'cancelled' || to === 'rejected' ? (note ?? order.cancelReason ?? '') : null,
      timeline: [...order.timeline, { status: to, at: now, ...(note ? { note } : {}) }],
    })
    tx.set(doc(collection(db, 'orders', orderId, 'events')), {
      status: to,
      at: now,
      note: note ?? null,
      createdAtTs: serverTimestamp(),
    })
  })
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(getDb(), 'orders', orderId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null
}
