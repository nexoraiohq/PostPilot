import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bike, Copy, CreditCard, Mail, MapPin, Phone, RefreshCw, Store, User } from 'lucide-react'
import { ORDER_STATUS_LABELS, type Order } from '@/types'
import { subscribeToOrder, updateOrderStatus } from '@/services/orders.service'
import { formatKes, formatTimestamp } from '@/utils/format'
import { OrderStatusBadge } from '@/components/ui/StatusBadge'
import { Button, LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/context/toast'
import {
  Card,
  ConfirmDialog,
  ORDER_ACTIONS,
  PageHead,
  errorMessage,
  isOrderClosed,
  tableClasses,
  type OrderAction,
} from './_adminui'
import { Textarea } from '@/components/ui/Field'

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ id: string; error: Error } | null>(null)
  const [epoch, setEpoch] = useState(0)

  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<OrderAction | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    return subscribeToOrder(
      id,
      (next) => {
        setOrder(next)
        setLoadedId(id)
        setFailure(null)
      },
      (error) => setFailure({ id, error }),
    )
  }, [id, epoch])

  const error = failure && failure.id === id ? failure.error : null
  const loading = Boolean(id) && !error && loadedId !== id

  function retry() {
    setFailure(null)
    setLoadedId(null)
    setEpoch((e) => e + 1)
  }

  const trackUrl = useMemo(() => (id ? `${window.location.origin}/order/${id}` : ''), [id])

  async function runAction(action: OrderAction, note?: string) {
    if (!order) return
    setBusy(true)
    try {
      await updateOrderStatus(order.id, action.to, note)
      toast(`${order.reference} → ${ORDER_STATUS_LABELS[action.to]}`, 'success')
      setPending(null)
      setReason('')
      setReasonError(null)
    } catch (err) {
      toast(errorMessage(err, `Could not update ${order.reference}.`), 'error')
    } finally {
      setBusy(false)
    }
  }

  function requestAction(action: OrderAction) {
    setPending(action)
    setReason('')
    setReasonError(null)
  }

  function confirmPending() {
    if (!pending) return
    const trimmed = reason.trim()
    if (pending.reasonRequired && !trimmed) {
      setReasonError('A reason is required for this action.')
      return
    }
    void runAction(pending, trimmed || undefined)
  }

  async function copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(trackUrl)
      setCopied(true)
      toast('Tracking link copied', 'success')
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      toast('Could not copy the link to your clipboard.', 'error')
    }
  }

  if (error) {
    return (
      <>
        <PageHead title="Order" />
        <Card className="flex flex-col items-start gap-4">
          <p className="text-support text-error">{error.message || 'Could not load this order.'}</p>
          <Button variant="secondary" onClick={retry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </Card>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <PageHead title="Order" subtitle="Loading order…" />
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <PageHead title="Order not found" />
        <EmptyState
          title="No order with that reference"
          description="The order may have been removed, or the link is incorrect."
          action={<LinkButton to="/admin/orders" variant="secondary">Back to orders</LinkButton>}
        />
      </>
    )
  }

  const actions = ORDER_ACTIONS[order.status]
  const closed = isOrderClosed(order.status)
  const latest = order.timeline[order.timeline.length - 1]

  return (
    <>
      <PageHead
        title={order.reference}
        subtitle={`${order.type === 'pickup' ? 'Pickup' : 'Delivery'} · placed ${formatTimestamp(order.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper py-1.5 pr-1.5 pl-3.5">
              <span className="max-w-40 truncate text-[13px] text-stone sm:max-w-72">{trackUrl}</span>
              <Button variant="secondary" size="sm" className="min-h-9" onClick={() => void copyTrackingLink()}>
                <Copy className="size-3.5" aria-hidden />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <LinkButton to="/admin/orders" variant="quiet" size="sm" className="min-h-10">
              ← Back
            </LinkButton>
          </div>
        }
      />

      {/* Status banner */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <span className="text-support text-stone">
              Last update {formatTimestamp(order.statusUpdatedAt ?? order.updatedAt)}
              {latest ? ` · ${ORDER_STATUS_LABELS[latest.status]}` : ''}
            </span>
          </div>
          <span className="text-kpi tabular-nums">{formatKes(order.totalKes)}</span>
        </div>
        {order.cancelReason && (
          <p className="mt-4 rounded-xl border border-error/20 bg-error-soft px-4 py-3 text-support text-error">
            Reason recorded: {order.cancelReason}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          {closed ? (
            <p className="text-support text-stone">This order is closed — no further actions are available.</p>
          ) : (
            actions.map((action) => (
              <Button
                key={action.to}
                variant={action.variant}
                size="md"
                className="min-h-10"
                loading={busy && pending?.to === action.to}
                onClick={() => requestAction(action)}
              >
                {action.label}
              </Button>
            ))
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <p className="label-caps text-stone">Items</p>
            <div className={`${tableClasses.wrap} mt-4`}>
              <table className={tableClasses.table}>
                <thead>
                  <tr>
                    <th className={tableClasses.th}>Dish</th>
                    <th className={`${tableClasses.th} text-right`}>Qty</th>
                    <th className={`${tableClasses.th} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((line, index) => (
                    <tr key={`${line.itemId}-${index}`}>
                      <td className={tableClasses.td}>
                        <span className="block text-ink">{line.name}</span>
                        {(line.variantName || line.addons.length > 0) && (
                          <span className="block text-support text-stone">
                            {line.variantName}
                            {line.variantName && line.addons.length > 0 ? ' · ' : ''}
                            {line.addons.map((a) => a.name).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className={`${tableClasses.td} text-right tabular-nums`}>{line.quantity}</td>
                      <td className={`${tableClasses.td} text-right tabular-nums`}>{formatKes(line.lineTotalKes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-5 ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between gap-4 text-stone">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatKes(order.subtotalKes)}</dd>
              </div>
              {order.deliveryFeeKes > 0 && (
                <div className="flex justify-between gap-4 text-stone">
                  <dt>Delivery fee</dt>
                  <dd className="tabular-nums">{formatKes(order.deliveryFeeKes)}</dd>
                </div>
              )}
              {order.serviceChargeKes > 0 && (
                <div className="flex justify-between gap-4 text-stone">
                  <dt>Service charge</dt>
                  <dd className="tabular-nums">{formatKes(order.serviceChargeKes)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatKes(order.totalKes)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <p className="label-caps text-stone">Timeline</p>
            <ol className="mt-4 space-y-4 border-l border-line pl-5">
              {[...order.timeline].reverse().map((event, index) => (
                <li key={`${event.status}-${event.at}-${index}`} className="relative">
                  <span
                    className="absolute top-1.5 -left-[23px] size-2 rounded-full bg-ink ring-4 ring-paper"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm font-medium text-ink">{ORDER_STATUS_LABELS[event.status]}</span>
                    <span className="text-support text-stone tabular-nums">{formatTimestamp(event.at)}</span>
                  </div>
                  {event.note && <p className="mt-1 text-support text-stone">{event.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <p className="label-caps text-stone">Customer</p>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2 text-ink">
                <User className="size-4 shrink-0 text-stone" aria-hidden />
                {order.customer.name}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-stone" aria-hidden />
                <a
                  href={`tel:${order.customer.phone}`}
                  className="text-ink underline-offset-4 tabular-nums hover:underline"
                >
                  {order.customer.phone}
                </a>
              </p>
              {order.customer.email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0 text-stone" aria-hidden />
                  <a
                    href={`mailto:${order.customer.email}`}
                    className="truncate text-ink underline-offset-4 hover:underline"
                  >
                    {order.customer.email}
                  </a>
                </p>
              )}
            </div>

            {order.delivery && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="label-caps text-stone">Delivery</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-ink">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-stone" aria-hidden />
                  <span>
                    {order.delivery.address}
                    {order.delivery.area && <span className="block text-support text-stone">{order.delivery.area}</span>}
                    {order.delivery.notes && (
                      <span className="mt-1 block text-support text-stone">{order.delivery.notes}</span>
                    )}
                  </span>
                </p>
              </div>
            )}
          </Card>

          <Card>
            <p className="label-caps text-stone">Fulfilment</p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              <li className="flex items-center gap-2">
                {order.type === 'pickup' ? <Store className="size-4 text-stone" aria-hidden /> : <Bike className="size-4 text-stone" aria-hidden />}
                {order.type === 'pickup' ? 'Pickup from the restaurant' : 'Delivery to guest'}
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="size-4 text-stone" aria-hidden />
                {order.paymentMethod || 'Not specified'}
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `${pending.label} ${order.reference}?` : ''}
        message={
          pending
            ? pending.reason
              ? `This moves ${order.reference} to “${ORDER_STATUS_LABELS[pending.to]}” and records the reason on the timeline.`
              : `This moves ${order.reference} to “${ORDER_STATUS_LABELS[pending.to]}”. The change is written to the order timeline.`
            : ''
        }
        confirmLabel={pending?.label}
        destructive={pending?.variant === 'danger'}
        loading={busy}
        onConfirm={confirmPending}
        onClose={() => {
          setPending(null)
          setReason('')
          setReasonError(null)
        }}
        error={reasonError ?? undefined}
      >
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Reason{pending?.reasonRequired ? ' ' : ' (optional)'}
          </span>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonError) setReasonError(null)
            }}
            placeholder="e.g. Guest called to cancel, item sold out…"
            invalid={Boolean(reasonError)}
            className="min-h-24 text-sm"
          />
        </label>
      </ConfirmDialog>
    </>
  )
}
