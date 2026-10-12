import { describe, expect, it } from 'vitest'
import { ORDER_TRANSITIONS, type Order, type OrderStatus, type RestaurantSettings } from '@/types'
import {
  canTransition,
  computeOrderTotals,
  generateOrderReference,
  generateReservationReference,
  latestTimelineStatus,
} from './order'

const settings: Pick<
  RestaurantSettings,
  'deliveryFeeKes' | 'freeDeliveryOverKes' | 'serviceChargePercent'
> = { deliveryFeeKes: 350, freeDeliveryOverKes: 5000, serviceChargePercent: 5 }

const line = (lineTotalKes: number, quantity = 1) => ({ lineTotalKes, quantity })

describe('computeOrderTotals', () => {
  it('sums subtotal and item count across lines', () => {
    const totals = computeOrderTotals([line(5000, 2), line(1500, 1), line(750, 3)], settings, 'pickup')
    expect(totals.subtotalKes).toBe(7250)
    expect(totals.itemCount).toBe(6)
    expect(totals.deliveryFeeKes).toBe(0)
    expect(totals.serviceChargeKes).toBe(363)
    expect(totals.totalKes).toBe(7613)
  })

  it('matches the Firestore rules service-charge rounding exactly', () => {
    const subtotals = [0, 1, 499, 1000, 5350, 12345, 999999]
    const percents = [0, 5, 10, 15, 20]
    for (const subtotalKes of subtotals) {
      for (const serviceChargePercent of percents) {
        const totals = computeOrderTotals([line(subtotalKes)], { ...settings, serviceChargePercent }, 'pickup')
        const rulesValue = Math.floor((subtotalKes * serviceChargePercent + 50) / 100)
        expect(totals.serviceChargeKes).toBe(rulesValue)
        expect(totals.serviceChargeKes).toBe(Math.round((subtotalKes * serviceChargePercent) / 100))
        expect(totals.totalKes).toBe(subtotalKes + rulesValue)
      }
    }
  })

  it('charges delivery below the free threshold and waives it at or above', () => {
    expect(computeOrderTotals([line(4999)], settings, 'delivery').deliveryFeeKes).toBe(350)
    expect(computeOrderTotals([line(5000)], settings, 'delivery').deliveryFeeKes).toBe(0)
    expect(computeOrderTotals([line(12000)], settings, 'delivery').deliveryFeeKes).toBe(0)
  })

  it('charges delivery whenever there is no free threshold', () => {
    expect(computeOrderTotals([line(12000)], { ...settings, freeDeliveryOverKes: null }, 'delivery').deliveryFeeKes).toBe(350)
  })

  it('never charges delivery for pickup', () => {
    expect(computeOrderTotals([line(500)], settings, 'pickup').deliveryFeeKes).toBe(0)
  })

  it('returns zero fees without settings', () => {
    expect(computeOrderTotals([line(5000)], null, 'delivery')).toEqual({
      subtotalKes: 5000,
      itemCount: 1,
      deliveryFeeKes: 0,
      serviceChargeKes: 0,
      totalKes: 5000,
    })
  })
})

describe('canTransition', () => {
  it('allows the happy path', () => {
    expect(canTransition('received', 'accepted')).toBe(true)
    expect(canTransition('accepted', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready')).toBe(true)
    expect(canTransition('ready', 'completed')).toBe(true)
  })

  it('allows cancellation only while the order is live', () => {
    expect(canTransition('received', 'cancelled')).toBe(true)
    expect(canTransition('accepted', 'cancelled')).toBe(true)
    expect(canTransition('preparing', 'cancelled')).toBe(true)
    expect(canTransition('ready', 'cancelled')).toBe(false)
    expect(canTransition('completed', 'cancelled')).toBe(false)
  })

  it('rejects skips, reversals and terminal escapes', () => {
    expect(canTransition('received', 'completed')).toBe(false)
    expect(canTransition('accepted', 'received')).toBe(false)
    expect(canTransition('completed', 'accepted')).toBe(false)
    expect(canTransition('rejected', 'accepted')).toBe(false)
    expect(canTransition('cancelled', 'received')).toBe(false)
  })

  it('has no outgoing edges from terminal statuses', () => {
    const terminal: OrderStatus[] = ['completed', 'rejected', 'cancelled']
    for (const status of terminal) expect(ORDER_TRANSITIONS[status]).toEqual([])
  })
})

describe('generateOrderReference', () => {
  it('produces MN-XXXXXX references', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateOrderReference()).toMatch(/^MN-\d{6}$/)
    }
  })
})

describe('generateReservationReference', () => {
  it('produces MN-RXXXXXX references', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateReservationReference()).toMatch(/^MN-R\d{6}$/)
    }
  })
})

describe('latestTimelineStatus', () => {
  const makeOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'orders/MN-123456',
    restaurantId: 'maison-noir',
    reference: 'MN-123456',
    type: 'pickup',
    items: [],
    itemCount: 1,
    subtotalKes: 1000,
    deliveryFeeKes: 0,
    serviceChargeKes: 50,
    totalKes: 1050,
    customer: { name: 'A', phone: '0700000000', email: 'a@example.com' },
    delivery: null,
    paymentMethod: 'pay_on_collection',
    status: 'accepted',
    cancelReason: null,
    timeline: [
      { status: 'received', at: 1 },
      { status: 'accepted', at: 2 },
      { status: 'preparing', at: 3 },
    ],
    statusUpdatedAt: 3,
    createdAt: 1,
    updatedAt: 3,
    ...overrides,
  })

  it('returns the last timeline entry', () => {
    expect(latestTimelineStatus(makeOrder())).toBe('preparing')
  })

  it('falls back to the order status when the timeline is empty', () => {
    expect(latestTimelineStatus(makeOrder({ timeline: [] }))).toBe('accepted')
  })
})
