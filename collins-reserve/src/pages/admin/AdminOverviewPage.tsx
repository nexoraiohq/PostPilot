import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, ClipboardList, RefreshCw, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { subscribeToOrders } from '@/services/orders.service'
import { subscribeToReservations } from '@/services/reservations.service'
import { formatKes, formatTime12h, formatTimestamp, todayInTimezone } from '@/utils/format'
import { OrderStatusBadge, ReservationStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { Button } from '@/components/ui/Button'
import { Card, KpiCard, PageHead } from './_adminui'
import type { Order, Reservation } from '@/types'

const ACTIVE_STATUSES = new Set(['received', 'accepted', 'preparing'])
const UPCOMING_STATUSES = new Set(['pending', 'confirmed'])

function startOfLocalDay(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const unsubs = [
      subscribeToOrders({ dateRange: 'all' }, setOrders, setError),
      subscribeToReservations({ dateRange: 'all' }, setReservations, setError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [epoch])

  const loading = orders === null || reservations === null
  const today = todayInTimezone()
  const dayStart = useMemo(() => startOfLocalDay(), [])

  const stats = useMemo(() => {
    const allOrders = orders ?? []
    const allReservations = reservations ?? []
    const todayOrders = allOrders.filter((o) => o.createdAt >= dayStart)
    const completedToday = todayOrders.filter((o) => o.status === 'completed')
    const salesToday = completedToday.reduce((sum, o) => sum + o.totalKes, 0)
    const awaiting = allOrders.filter((o) => ACTIVE_STATUSES.has(o.status)).length
    const reservationsToday = allReservations.filter((r) => r.date === today)
    const upcoming = allReservations.filter((r) => UPCOMING_STATUSES.has(r.status) && r.date >= today).length

    const quantities = new Map<string, number>()
    for (const order of allOrders) {
      for (const line of order.items) {
        quantities.set(line.name, (quantities.get(line.name) ?? 0) + line.quantity)
      }
    }
    const dishes = [...quantities.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    const maxDish = dishes[0]?.qty ?? 1

    const buckets: { key: string; label: string; orders: number; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(dayStart - i * 86400000)
      const key = format(date, 'yyyy-MM-dd')
      const dayOrders = allOrders.filter((o) => format(o.createdAt, 'yyyy-MM-dd') === key)
      buckets.push({
        key,
        label: format(date, 'EEE'),
        orders: dayOrders.length,
        revenue: dayOrders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + o.totalKes, 0),
      })
    }

    return {
      ordersToday: todayOrders.length,
      reservationsToday: reservationsToday.length,
      salesToday,
      completedToday: completedToday.length,
      aov: completedToday.length > 0 ? salesToday / completedToday.length : null,
      awaiting,
      upcoming,
      reservationsTodayRows: reservationsToday.sort((a, b) => a.time.localeCompare(b.time)),
      dishes,
      maxDish,
      buckets,
      weekOrders: buckets.reduce((sum, b) => sum + b.orders, 0),
      weekRevenue: buckets.reduce((sum, b) => sum + b.revenue, 0),
      recent: allOrders.slice(0, 6),
      hasData: allOrders.length > 0 || allReservations.length > 0,
    }
  }, [orders, reservations, dayStart, today])

  if (error && loading) {
    return (
      <>
        <PageHead title="Overview" />
        <Card className="flex flex-col items-start gap-4">
          <p className="text-support text-error">{error.message || 'Could not load live data.'}</p>
          <Button variant="secondary" onClick={() => { setError(null); setEpoch((e) => e + 1) }}>
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
        <PageHead title="Overview" subtitle="Loading live operations data…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </>
    )
  }

  if (!stats.hasData) {
    return (
      <>
        <PageHead title="Overview" subtitle="MAISON NOIR · Live operations" />
        <EmptyState
          title="No recorded activity yet"
          description="Orders and reservations appear here in real time as soon as the first booking or order is placed."
        />
      </>
    )
  }

  return (
    <>
      <PageHead
        title="Overview"
        subtitle={`MAISON NOIR · ${format(dayStart, 'EEEE d MMMM yyyy')}`}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 text-[11px] font-medium tracking-[0.16em] text-success uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />
            Live
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Orders today" value={stats.ordersToday} hint="Placed since midnight" />
        <KpiCard label="Reservations today" value={stats.reservationsToday} hint={`Bookings dated ${today}`} />
        <KpiCard label="Sales today" value={formatKes(stats.salesToday)} hint="Completed orders, today" tone="success" />
        <KpiCard
          label="Average order value"
          value={stats.aov === null ? '—' : formatKes(stats.aov)}
          hint={`Sales ÷ ${stats.completedToday} completed order${stats.completedToday === 1 ? '' : 's'} today`}
        />
        <KpiCard
          label="Awaiting action"
          value={stats.awaiting}
          hint="In the active pipeline"
          tone={stats.awaiting > 0 ? 'champagne' : undefined}
        />
        <KpiCard label="Upcoming reservations" value={stats.upcoming} hint="Pending or confirmed, today onward" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-caps text-stone">Last 7 days</p>
                <p className="mt-2 text-card">{stats.weekOrders} orders</p>
              </div>
              <p className="text-support text-stone">
                Completed revenue{' '}
                <span className="font-medium text-ink tabular-nums">{formatKes(stats.weekRevenue)}</span>
              </p>
            </div>
            <div className="mt-5 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <CartesianGrid vertical={false} stroke="#e4e0d7" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#858177', fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#858177', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(23,23,21,0.04)' }}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e4e0d7',
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: '0 8px 24px rgba(23,23,21,0.08)',
                    }}
                    labelStyle={{ color: '#858177' }}
                    itemStyle={{ color: '#171715' }}
                  />
                  <Bar dataKey="orders" name="Orders" fill="#171715" radius={[3, 3, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-support text-stone">Orders per day, newest on the right.</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-caps text-stone">Top selling dishes</p>
                <p className="mt-2 text-support text-stone">Quantities across all recorded orders</p>
              </div>
              <TrendingUp className="size-4 text-champagne" aria-hidden />
            </div>
            <ul className="mt-5 space-y-3">
              {stats.dishes.map((dish) => (
                <li key={dish.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{dish.name}</span>
                    <span className="shrink-0 font-medium text-ink tabular-nums">{dish.qty}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/70">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{ width: `${Math.max(6, Math.round((dish.qty / stats.maxDish) * 100))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="label-caps text-stone">Recent activity</p>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-[13px] font-medium underline-offset-4 hover:underline"
              >
                All orders <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-line/70">
              {stats.recent.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-stone"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink tabular-nums">{order.reference}</span>
                      <span className="block truncate text-support text-stone">
                        {order.customer.name} · {formatTimestamp(order.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-[13px] font-medium text-ink tabular-nums">{formatKes(order.totalKes)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {stats.recent.length === 0 && <p className="mt-4 text-support text-stone">No orders recorded yet.</p>}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="label-caps text-stone">Today’s reservations</p>
              <Link
                to="/admin/reservations"
                className="inline-flex items-center gap-1 text-[13px] font-medium underline-offset-4 hover:underline"
              >
                All <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-line/70">
              {stats.reservationsTodayRows.map((reservation) => (
                <li key={reservation.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{reservation.guestName}</span>
                    <span className="block text-support text-stone tabular-nums">
                      {formatTime12h(reservation.time)} · party of {reservation.partySize}
                    </span>
                  </span>
                  <ReservationStatusBadge status={reservation.status} />
                </li>
              ))}
            </ul>
            {stats.reservationsTodayRows.length === 0 && (
              <div className="mt-4 flex items-center gap-2 text-support text-stone">
                <CalendarDays className="size-4" aria-hidden />
                No reservations booked for today.
              </div>
            )}
          </Card>

          <Card className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 size-4 shrink-0 text-stone" aria-hidden />
            <p className="text-support text-stone">
              The queue updates automatically — status changes from the kitchen appear here without a refresh.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
