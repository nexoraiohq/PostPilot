import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowUpRight, Check, CreditCard, Mail, Phone, Receipt, Store, TriangleAlert, Truck } from 'lucide-react'
import { subscribeToOrder } from '@/services/orders.service'
import { useRestaurantData } from '@/hooks/data'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, type Order, type OrderStatus } from '@/types'
import { formatKes, formatTimestamp } from '@/utils/format'
import { buttonStyles, Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { OrderStatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/utils/cn'

const STEP_NOTES: Record<OrderStatus, string> = {
  received: 'We have your order and it is in the queue.',
  accepted: 'The restaurant accepted your order.',
  preparing: 'The kitchen is working on it.',
  ready: 'Ready for pickup, or with the rider.',
  completed: 'Finished — thank you.',
  rejected: 'The restaurant could not take this order.',
  cancelled: 'This order was cancelled.',
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  return `${digits.slice(0, 4)}••• ${digits.slice(-3)}`
}

function paymentLabel(method: string): string {
  if (method === 'pay_on_collection') return 'Pay on collection — cash or M-Pesa on pickup or delivery.'
  return method
}

function StepDot({ state, index }: { state: 'done' | 'current' | 'todo'; index: number }) {
  return (
    <span
      className={cn(
        'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors duration-300',
        state === 'done' && 'border-ink bg-ink text-ivory',
        state === 'current' && 'border-2 border-ink bg-paper text-ink shadow-[0_0_0_4px_#e9dcc6]',
        state === 'todo' && 'border-line bg-paper text-stone',
      )}
    >
      {state === 'done' ? <Check className="size-3.5" aria-hidden /> : index + 1}
    </span>
  )
}

function StatusTimeline({ order }: { order: Order }) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status)
  const timeFor = (status: OrderStatus) => order.timeline.find((event) => event.status === status)?.at
  const stateFor = (index: number): 'done' | 'current' | 'todo' =>
    index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'

  return (
    <div className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-stone">Live status</p>
          <h2 className="text-card mt-2">Progress</h2>
        </div>
        <p className="max-w-xs text-support text-stone">{STEP_NOTES[order.status]}</p>
      </div>

      {/* Vertical stepper — mobile */}
      <ol aria-label="Order progress" className="relative mt-7 md:hidden">
        {ORDER_STATUS_FLOW.map((status, index) => {
          const state = stateFor(index)
          const at = timeFor(status)
          const last = index === ORDER_STATUS_FLOW.length - 1
          return (
            <li key={status} className={cn('relative flex gap-4', last ? 'pb-0' : 'pb-6')}>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-0 left-[11.5px] top-6 w-px transition-colors duration-300',
                    index < currentIndex ? 'bg-champagne' : 'bg-line',
                  )}
                />
              )}
              <StepDot state={state} index={index} />
              <div className="min-w-0 pt-0.5">
                <p className={cn('text-[14px]', state === 'todo' ? 'text-stone' : 'font-medium text-ink')}>
                  {ORDER_STATUS_LABELS[status]}
                </p>
                <p className="text-[12px] tabular-nums text-stone">{at ? formatTimestamp(at) : '—'}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Horizontal stepper — desktop */}
      <ol aria-label="Order progress" className="mt-8 hidden md:grid md:grid-cols-5">
        {ORDER_STATUS_FLOW.map((status, index) => {
          const state = stateFor(index)
          const at = timeFor(status)
          const last = index === ORDER_STATUS_FLOW.length - 1
          return (
            <li key={status} className="relative flex flex-col items-center gap-2 px-2 text-center">
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-1/2 top-[11.5px] h-px w-full transition-colors duration-300',
                    index < currentIndex ? 'bg-champagne' : 'bg-line',
                  )}
                />
              )}
              <StepDot state={state} index={index} />
              <p className={cn('text-[13px]', state === 'todo' ? 'text-stone' : 'font-medium text-ink')}>
                {ORDER_STATUS_LABELS[status]}
              </p>
              <p className="text-[11px] tabular-nums text-stone">{at ? formatTimestamp(at) : '—'}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { restaurant, settings } = useRestaurantData()
  const [snapshot, setSnapshot] = useState<{ id: string; order: Order | null } | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!orderId) return
    return subscribeToOrder(
      orderId,
      (live) => {
        setSnapshot({ id: orderId, order: live })
        setError(null)
      },
      (err) => setError(err),
    )
  }, [orderId, attempt])

  /* A snapshot from another reference reads as loading until this one arrives. */
  const order = orderId && snapshot?.id === orderId ? snapshot.order : undefined

  function retry() {
    setSnapshot(null)
    setError(null)
    setAttempt((a) => a + 1)
  }

  const phoneHref = `tel:${(restaurant?.phone ?? '+254 700 512 846').replace(/\s/g, '')}`
  const emailHref = `mailto:${restaurant?.email ?? 'hello@maisonnoir.demo'}`

  /* Loading / connection error (no data yet) */
  if (order === undefined) {
    if (error) {
      return (
        <section className="editorial-width pt-10 pb-16 md:pt-14">
          <div
            role="alert"
            className="max-w-2xl rounded-2xl border border-error/30 bg-error-soft p-6 sm:p-8"
          >
            <TriangleAlert className="size-6 text-error" aria-hidden />
            <h1 className="text-card mt-4 text-error">We lost the live connection.</h1>
            <p className="mt-2 text-support text-error/80">{error.message}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
              <LinkButton to="/menu" variant="ghost">
                Back to the menu
              </LinkButton>
            </div>
          </div>
        </section>
      )
    }
    return (
      <section className="editorial-width space-y-6 pt-10 pb-16 md:pt-14">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </section>
    )
  }

  /* Not found */
  if (order === null) {
    return (
      <section className="editorial-width pt-10 pb-16 md:pt-14">
        <EmptyState
          className="mx-auto max-w-2xl"
          icon={<Receipt className="size-5" aria-hidden />}
          title="We couldn't find an order with that reference."
          description="Check the reference from your confirmation message — it looks like MN-483920."
          action={<LinkButton to="/menu">Browse the menu</LinkButton>}
        />
      </section>
    )
  }

  const isFailed = order.status === 'cancelled' || order.status === 'rejected'
  const isDelivery = order.type === 'delivery'
  const servicePercent = settings?.serviceChargePercent

  return (
    <section className="editorial-width pt-10 pb-16 md:pt-14">
      {/* Reference header */}
      <p className="label-caps text-champagne">Order tracking</p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="text-kpi tabular-nums">{order.reference}</h1>
          <p className="mt-2 text-support text-stone">
            Placed {formatTimestamp(order.createdAt)} · {order.itemCount}{' '}
            {order.itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium tracking-[0.14em] text-stone uppercase">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Live
          </span>
          <OrderStatusBadge status={order.status} />
          <span aria-live="polite" className="sr-only">
            Order status: {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-error/30 bg-error-soft px-5 py-4"
        >
          <p className="text-support text-error">
            Live updates were interrupted — the details below may be out of date.
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-error/40 px-4 py-1.5 text-[13px] font-medium text-error transition-colors hover:bg-error hover:text-white"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Progress or failure */}
      <div className="mt-8">
        {isFailed ? (
          <div role="alert" className="rounded-2xl border border-error/30 bg-error-soft p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <TriangleAlert className="mt-1 size-6 shrink-0 text-error" aria-hidden />
              <div className="min-w-0">
                <p className="label-caps text-error">
                  {order.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                </p>
                <h2 className="text-section mt-2 text-error">
                  {order.status === 'rejected' ? 'The restaurant could not take this order.' : 'This order was cancelled.'}
                </h2>
                <p className="mt-3 max-w-xl text-body text-error/85">
                  {order.cancelReason?.trim() ? order.cancelReason : 'No reason was recorded.'}
                </p>
                <p className="mt-2 text-support text-error/80">
                  If you were charged anything in this demo, you were not — no payment is processed here.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={phoneHref} className={buttonStyles('secondary', 'md')}>
                    <Phone className="size-4" aria-hidden />
                    Contact the restaurant
                  </a>
                  <LinkButton to="/menu" variant="ghost">
                    Order something else
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StatusTimeline order={order} />
        )}
      </div>

      {/* Details */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Fulfilment */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <div className="flex items-center gap-2.5">
              {isDelivery ? (
                <Truck className="size-5 text-champagne" aria-hidden />
              ) : (
                <Store className="size-5 text-champagne" aria-hidden />
              )}
              <h2 className="text-card">{isDelivery ? 'Delivery' : 'Pickup'}</h2>
            </div>

            {isDelivery ? (
              <dl className="mt-4 space-y-2.5 text-support">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-stone">Address</dt>
                  <dd className="text-right">{order.delivery?.address || '—'}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-stone">Area</dt>
                  <dd className="text-right">{order.delivery?.area || '—'}</dd>
                </div>
                {order.delivery?.notes && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 text-stone">Notes</dt>
                    <dd className="text-right">{order.delivery.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="mt-4">
                <address className="text-support text-stone not-italic">
                  {(restaurant?.addressLines ?? ['12 Riverside Lane', 'Kilimani']).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p>
                    {restaurant?.city ?? 'Nairobi'}, {restaurant?.country ?? 'Kenya'}
                  </p>
                </address>
                <p className="mt-3 rounded-xl bg-ivory px-4 py-3 text-support text-stone">
                  Show reference <span className="font-medium text-ink tabular-nums">{order.reference}</span> when you
                  collect.
                </p>
              </div>
            )}

            <div className="mt-4 border-t border-line pt-4">
              <p className="label-caps text-stone">Customer</p>
              <p className="mt-2 text-[15px] font-medium">{order.customer.name}</p>
              <p className="text-support text-stone">
                {maskPhone(order.customer.phone)} · {order.customer.email}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-line bg-paper">
            <div className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-5">
              <h2 className="text-card">Items</h2>
              <span className="text-support text-stone">
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <ul className="divide-y divide-line px-6">
              {order.items.map((line, index) => (
                <li key={`${line.itemId}-${index}`} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium">{line.name}</p>
                    {(line.variantName || line.addons.length > 0) && (
                      <p className="mt-0.5 text-support text-stone">
                        {[line.variantName, ...line.addons.map((a) => a.name)].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-medium tabular-nums">{formatKes(line.lineTotalKes)}</p>
                    <p className="text-support tabular-nums text-stone">
                      {line.quantity} × {formatKes(line.unitPriceKes)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          {/* Totals */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <h2 className="text-card">Totals</h2>
            <dl className="mt-4 space-y-3 text-[15px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-stone">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatKes(order.subtotalKes)}</dd>
              </div>
              {isDelivery && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-stone">Delivery fee</dt>
                  <dd
                    className={cn(
                      'font-medium tabular-nums',
                      order.deliveryFeeKes === 0 && 'text-success',
                    )}
                  >
                    {order.deliveryFeeKes === 0 ? 'Free' : formatKes(order.deliveryFeeKes)}
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-stone">
                  Service charge
                  {servicePercent != null && <span className="text-[12px] text-stone/80"> ({servicePercent}%)</span>}
                </dt>
                <dd className="font-medium tabular-nums">{formatKes(order.serviceChargeKes)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-medium">Total</dt>
                <dd className="text-xl font-medium tabular-nums">{formatKes(order.totalKes)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-support text-stone">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
              <span>{paymentLabel(order.paymentMethod)}</span>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-line bg-paper p-6">
            <h2 className="text-card">Having trouble?</h2>
            <p className="mt-2 text-support text-stone">
              Call or email us and quote <span className="tabular-nums">{order.reference}</span>.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-[15px]">
              <a href={phoneHref} className="flex items-center gap-2.5 hover:underline">
                <Phone className="size-4 shrink-0 text-champagne" aria-hidden />
                {restaurant?.phone ?? '+254 700 512 846'}
              </a>
              <a href={emailHref} className="flex items-center gap-2.5 hover:underline">
                <Mail className="size-4 shrink-0 text-champagne" aria-hidden />
                {restaurant?.email ?? 'hello@maisonnoir.demo'}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Order again */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-paper px-6 py-5">
        <div>
          <p className="text-[15px] font-medium">Hungry again?</p>
          <p className="text-support text-stone">The menu changes with the market.</p>
        </div>
        <LinkButton to="/menu" variant="secondary">
          Order again
          <ArrowUpRight className="size-4" aria-hidden />
        </LinkButton>
      </div>
    </section>
  )
}
