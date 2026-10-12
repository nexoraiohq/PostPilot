import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, RefreshCw, Store } from 'lucide-react'
import { ORDER_STATUS_LABELS, type FulfillmentMethod, type Order } from '@/types'
import { subscribeToOrders, updateOrderStatus } from '@/services/orders.service'
import { formatKes, formatTimestamp } from '@/utils/format'
import { OrderStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/context/toast'
import {
  Card,
  ConfirmDialog,
  FilterSelect,
  PageHead,
  SearchInput,
  SegmentedTabs,
  Toolbar,
  errorMessage,
  isOrderClosed,
  quickOrderActions,
  type OrderAction,
} from './_adminui'

type StatusTab = 'all' | 'received' | 'accepted' | 'preparing' | 'ready' | 'closed'
type DateTab = 'today' | 'week' | 'all'
type TypeTab = 'all' | FulfillmentMethod

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'closed', label: 'Closed' },
]

const DATE_OPTIONS: { value: DateTab; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'all', label: 'All time' },
]

const TYPE_OPTIONS: { value: TypeTab; label: string }[] = [
  { value: 'all', label: 'Pickup & delivery' },
  { value: 'pickup', label: 'Pickup only' },
  { value: 'delivery', label: 'Delivery only' },
]

const COUNT_PILLS: { key: StatusTab; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'closed', label: 'Closed' },
]

function startOfLocalDay(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export default function AdminOrdersPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [epoch, setEpoch] = useState(0)

  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [dateTab, setDateTab] = useState<DateTab>('today')
  const [typeTab, setTypeTab] = useState<TypeTab>('all')
  const [search, setSearch] = useState('')

  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ order: Order; action: OrderAction } | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeToOrders({ dateRange: 'all' }, setOrders, setError)
    return unsub
  }, [epoch])

  const base = useMemo(() => {
    const dayStart = startOfLocalDay()
    const term = search.trim().toLowerCase()
    return (orders ?? []).filter((order) => {
      if (dateTab === 'today' && order.createdAt < dayStart) return false
      if (dateTab === 'week' && order.createdAt < dayStart - 6 * 86400000) return false
      if (typeTab !== 'all' && order.type !== typeTab) return false
      if (
        term &&
        !order.reference.toLowerCase().includes(term) &&
        !order.customer.name.toLowerCase().includes(term) &&
        !order.customer.phone.includes(term)
      ) {
        return false
      }
      return true
    })
  }, [orders, dateTab, typeTab, search])

  const counts = useMemo(() => {
    const map: Record<StatusTab, number> = { all: base.length, received: 0, accepted: 0, preparing: 0, ready: 0, closed: 0 }
    for (const order of base) {
      if (isOrderClosed(order.status)) map.closed += 1
      else map[order.status as Exclude<StatusTab, 'all' | 'closed'>] += 1
    }
    return map
  }, [base])

  const rows = useMemo(() => {
    if (statusTab === 'all') return base
    if (statusTab === 'closed') return base.filter((o) => isOrderClosed(o.status))
    return base.filter((o) => o.status === statusTab)
  }, [base, statusTab])

  async function runAction(order: Order, action: OrderAction, note?: string) {
    setBusyId(order.id)
    try {
      await updateOrderStatus(order.id, action.to, note)
      toast(`${order.reference} → ${ORDER_STATUS_LABELS[action.to]}`, 'success')
      setPending(null)
      setReason('')
      setReasonError(null)
    } catch (err) {
      toast(errorMessage(err, `Could not update ${order.reference}.`), 'error')
    } finally {
      setBusyId(null)
    }
  }

  function requestAction(order: Order, action: OrderAction) {
    if (action.reason) {
      setPending({ order, action })
      setReason('')
      setReasonError(null)
      return
    }
    void runAction(order, action)
  }

  function confirmPending() {
    if (!pending) return
    const trimmed = reason.trim()
    if (pending.action.reasonRequired && !trimmed) {
      setReasonError('A reason is required for this action.')
      return
    }
    void runAction(pending.order, pending.action, trimmed || undefined)
  }

  if (error && orders === null) {
    return (
      <>
        <PageHead title="Orders" />
        <Card className="flex flex-col items-start gap-4">
          <p className="text-support text-error">{error.message || 'Could not load the order queue.'}</p>
          <Button variant="secondary" onClick={() => { setError(null); setEpoch((e) => e + 1) }}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </Card>
      </>
    )
  }

  const loading = orders === null

  return (
    <>
      <PageHead
        title="Orders"
        subtitle={loading ? 'Connecting to the live queue…' : `${rows.length} of ${orders?.length ?? 0} orders shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {COUNT_PILLS.map((pill) => (
              <span
                key={pill.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium tracking-[0.1em] text-stone uppercase"
              >
                {pill.label}
                <span className="text-ink tabular-nums">{loading ? '–' : counts[pill.key]}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] text-success uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
              Live
            </span>
          </div>
        }
      />

      <Toolbar>
        <SegmentedTabs options={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        <SearchInput value={search} onChange={setSearch} label="Search orders" placeholder="Reference, name or phone" />
        <FilterSelect value={dateTab} onChange={setDateTab} options={DATE_OPTIONS} label="Date range" />
        <FilterSelect value={typeTab} onChange={setTypeTab} options={TYPE_OPTIONS} label="Fulfilment type" />
      </Toolbar>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={search ? 'No orders match your search' : 'No orders in this view'}
          description={
            search
              ? 'Try a different reference, customer name or phone number.'
              : 'New orders land here the moment they are placed. Adjust the filters to widen the search.'
          }
          action={
            search || statusTab !== 'all' || dateTab !== 'all' || typeTab !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setStatusTab('all')
                  setDateTab('all')
                  setTypeTab('all')
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((order) => {
            const actions = quickOrderActions(order.status)
            const closed = isOrderClosed(order.status)
            const busy = busyId === order.id
            const extra = order.items.length - 2
            return (
              <li key={order.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/admin/orders/${order.id}`)
                    }
                  }}
                  className="grid cursor-pointer gap-4 rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-stone/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink tabular-nums">{order.reference}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-ivory px-2 py-0.5 text-[11px] text-stone">
                        {order.type === 'pickup' ? (
                          <Store className="size-3" aria-hidden />
                        ) : (
                          <Bike className="size-3" aria-hidden />
                        )}
                        {order.type === 'pickup' ? 'Pickup' : 'Delivery'}
                      </span>
                    </div>
                    <p className="mt-1 text-support text-stone tabular-nums">{formatTimestamp(order.createdAt)}</p>
                    <p className="mt-1 truncate text-sm text-ink">{order.customer.name}</p>
                    <p className="truncate text-support text-stone tabular-nums">{order.customer.phone}</p>
                  </div>

                  <div className="min-w-0 border-line/70 md:border-l md:pl-4">
                    <p className="text-sm text-ink">
                      {order.items.slice(0, 2).map((line) => `${line.quantity}× ${line.name}`).join(', ')}
                      {extra > 0 && <span className="text-stone"> +{extra} more</span>}
                    </p>
                    <p className="mt-1 text-support text-stone tabular-nums">
                      {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {formatKes(order.subtotalKes)} subtotal
                    </p>
                    {order.cancelReason && (
                      <p className="mt-2 text-support text-error">Reason: {order.cancelReason}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span className="text-lg font-medium text-ink tabular-nums">{formatKes(order.totalKes)}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {closed ? (
                        <Button variant="quiet" size="sm" className="min-h-10" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                          View
                        </Button>
                      ) : (
                        actions.map((action) => (
                          <Button
                            key={action.to}
                            variant={action.variant}
                            size="sm"
                            className="min-h-10"
                            loading={busy}
                            onClick={() => requestAction(order, action)}
                          >
                            {action.label}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `${pending.action.label} ${pending.order.reference}?` : ''}
        message={
          pending
            ? `This moves ${pending.order.reference} for ${pending.order.customer.name} to “${ORDER_STATUS_LABELS[pending.action.to]}” and records it on the order timeline.`
            : ''
        }
        confirmLabel={pending?.action.label}
        destructive={pending?.action.variant === 'danger'}
        loading={busyId !== null}
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
            Reason{pending?.action.reasonRequired ? ' ' : ' (optional)'}
          </span>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonError) setReasonError(null)
            }}
            placeholder="e.g. Guest called to cancel, kitchen at capacity…"
            invalid={Boolean(reasonError)}
            className="min-h-24 text-sm"
          />
        </label>
      </ConfirmDialog>
    </>
  )
}
