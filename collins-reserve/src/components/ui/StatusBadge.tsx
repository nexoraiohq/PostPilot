import type { OrderStatus, ReservationStatus } from '@/types'
import { ORDER_STATUS_LABELS, RESERVATION_STATUS_LABELS } from '@/types'
import { Badge } from '@/components/ui/Badge'

const orderTone: Record<OrderStatus, 'neutral' | 'info' | 'champagne' | 'success' | 'error'> = {
  received: 'neutral',
  accepted: 'info',
  preparing: 'champagne',
  ready: 'info',
  completed: 'success',
  rejected: 'error',
  cancelled: 'error',
}

const reservationTone: Record<ReservationStatus, 'neutral' | 'info' | 'champagne' | 'success' | 'error'> = {
  pending: 'champagne',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'info',
  no_show: 'error',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTone[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge tone={reservationTone[status]}>{RESERVATION_STATUS_LABELS[status]}</Badge>
}
