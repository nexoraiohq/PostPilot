import type { Order, OrderLine, OrderStatus, RestaurantSettings } from '@/types'
import { ORDER_TRANSITIONS } from '@/types'

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to)
}

/** Generates a human-friendly order reference, e.g. MN-483920. */
export function generateOrderReference(restaurantCode = 'MN'): string {
  const digits = Math.floor(100000 + Math.random() * 900000)
  return `${restaurantCode}-${digits}`
}

export function generateReservationReference(restaurantCode = 'MN'): string {
  const digits = Math.floor(100000 + Math.random() * 900000)
  return `${restaurantCode}-R${digits}`
}

export function computeOrderTotals(
  lines: Pick<OrderLine, 'lineTotalKes' | 'quantity'>[],
  settings: Pick<RestaurantSettings, 'deliveryFeeKes' | 'freeDeliveryOverKes' | 'serviceChargePercent'> | null,
  type: 'pickup' | 'delivery',
) {
  const subtotalKes = lines.reduce((sum, line) => sum + line.lineTotalKes, 0)
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  let deliveryFeeKes = 0
  if (type === 'delivery' && settings) {
    const freeOver = settings.freeDeliveryOverKes
    deliveryFeeKes = freeOver != null && subtotalKes >= freeOver ? 0 : settings.deliveryFeeKes
  }
  const serviceChargeKes = settings
    ? Math.round((subtotalKes * settings.serviceChargePercent) / 100)
    : 0
  const totalKes = subtotalKes + deliveryFeeKes + serviceChargeKes
  return { subtotalKes, itemCount, deliveryFeeKes, serviceChargeKes, totalKes }
}

/** Reserved for future order-status helpers that need the timeline shape. */
export function latestTimelineStatus(order: Order): OrderStatus {
  return order.timeline.at(-1)?.status ?? order.status
}
