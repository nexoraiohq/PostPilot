import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { addDaysToDateString, formatDateShort, formatKes, todayInTimezone } from '@/utils/format'
import { cn } from '@/utils/cn'
import { subscribeToOrders } from '@/services/orders.service'
import { subscribeToReservations } from '@/services/reservations.service'
import { ORDER_STATUS_LABELS, type Order, type OrderStatus, type Reservation } from '@/types'
import { Card, KpiCard, PageHead, SegmentedTabs, tableClasses } from '@/pages/admin/_adminui'

const INK = '#171715'
const CHAMPAGNE = '#c8ad83'
const STONE = '#858177'
const LINE = '#e4e0d7'

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

type Period = '7' | '30' | '90' | 'custom'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'custom', label: 'Custom' },
]

const STATUS_BAR_COLOR: Record<OrderStatus, string> = {
  received: 'bg-stone/60',
  accepted: 'bg-champagne-soft',
  preparing: 'bg-champagne',
  ready: 'bg-ink-soft',
  completed: 'bg-success',
  rejected: 'bg-error',
  cancelled: 'bg-error/45',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  fontSize: 12,
  color: INK,
  boxShadow: '0 8px 24px rgba(23,23,21,0.08)',
}

function dayKey(ms: number): string {
  return DAY_FORMATTER.format(new Date(ms))
}

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to view reports.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function shortLabel(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`
}

interface DayRow {
  day: string
  orders: number
  completed: number
  revenue: number
  avg: number
  cancellations: number
}

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [period, setPeriod] = useState<Period>('7')
  const today = todayInTimezone()
  const [custom, setCustom] = useState(() => ({ from: addDaysToDateString(today, -6), to: today }))

  useEffect(() => {
    const unsubs = [
      subscribeToOrders({ dateRange: 'all' }, setOrders, setError),
      subscribeToReservations({ dateRange: 'all' }, setReservations, setError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const presetDays = period === 'custom' ? null : Number(period)
  const from = presetDays === null ? custom.from : addDaysToDateString(today, -(presetDays - 1))
  const to = presetDays === null ? custom.to : today

  const rangeValid = Boolean(from && to && from <= to)
  const loading = orders === null || reservations === null

  const dayRows = useMemo<DayRow[]>(() => {
    if (!orders || !rangeValid) return []
    const map = new Map<string, DayRow>()
    const days: string[] = []
    let cursor = from
    let guard = 0
    while (cursor <= to && guard < 400) {
      map.set(cursor, { day: cursor, orders: 0, completed: 0, revenue: 0, avg: 0, cancellations: 0 })
      days.push(cursor)
      cursor = addDaysToDateString(cursor, 1)
      guard += 1
    }
    for (const order of orders) {
      const day = dayKey(order.createdAt)
      const row = map.get(day)
      if (!row) continue
      row.orders += 1
      if (order.status === 'completed') {
        row.revenue += order.totalKes
        row.completed += 1
      }
      if (order.status === 'cancelled' || order.status === 'rejected') row.cancellations += 1
    }
    for (const row of map.values()) {
      row.avg = row.completed > 0 ? Math.round(row.revenue / row.completed) : 0
    }
    return days.map((day) => map.get(day)).filter((row): row is DayRow => Boolean(row))
  }, [orders, from, to, rangeValid])

  const ordersInPeriod = useMemo(
    () => (orders && rangeValid ? orders.filter((o) => dayKey(o.createdAt) >= from && dayKey(o.createdAt) <= to) : []),
    [orders, from, to, rangeValid],
  )

  const reservationsInPeriod = useMemo(
    () =>
      reservations && rangeValid
        ? reservations.filter((r) => r.date >= from && r.date <= to)
        : [],
    [reservations, from, to, rangeValid],
  )

  const stats = useMemo(() => {
    const completed = ordersInPeriod.filter((o) => o.status === 'completed')
    const revenue = completed.reduce((sum, o) => sum + o.totalKes, 0)
    const cancelled = ordersInPeriod.filter((o) => o.status === 'cancelled' || o.status === 'rejected').length
    const decided = reservationsInPeriod.filter(
      (r) => r.status === 'completed' || r.status === 'no_show' || r.status === 'confirmed',
    ).length
    const noShows = reservationsInPeriod.filter((r) => r.status === 'no_show').length
    const byStatus = new Map<OrderStatus, number>()
    for (const order of ordersInPeriod) byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1)
    return {
      orderCount: ordersInPeriod.length,
      revenue,
      completedCount: completed.length,
      aov: completed.length > 0 ? revenue / completed.length : 0,
      cancelled,
      cancellationRate: ordersInPeriod.length > 0 ? (cancelled / ordersInPeriod.length) * 100 : 0,
      reservationCount: reservationsInPeriod.length,
      decided,
      noShows,
      noShowRate: decided > 0 ? (noShows / decided) * 100 : null,
      byStatus,
    }
  }, [ordersInPeriod, reservationsInPeriod])

  const topDishes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const order of ordersInPeriod) {
      for (const line of order.items) {
        counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, qty]) => ({ name: name.length > 26 ? `${name.slice(0, 25)}…` : name, qty }))
  }, [ordersInPeriod])

  const revenueSeries = useMemo(
    () => dayRows.map((row) => ({ label: shortLabel(row.day), revenue: row.revenue, orders: row.orders })),
    [dayRows],
  )

  const reservationSeries = useMemo(() => {
    const counts = new Map<string, number>()
    if (reservations && rangeValid) {
      for (const reservation of reservations) {
        if (reservation.date < from || reservation.date > to) continue
        counts.set(reservation.date, (counts.get(reservation.date) ?? 0) + 1)
      }
    }
    const days: string[] = []
    let cursor = from
    let guard = 0
    while (cursor <= to && guard < 400) {
      days.push(cursor)
      cursor = addDaysToDateString(cursor, 1)
      guard += 1
    }
    return days.map((day) => ({ label: shortLabel(day), count: counts.get(day) ?? 0 }))
  }, [reservations, from, to, rangeValid])

  const noData = rangeValid && ordersInPeriod.length === 0 && reservationsInPeriod.length === 0
  const statusTotal = stats.orderCount

  const header = (
    <PageHead title="Reports" subtitle="Live numbers drawn from orders and reservations." />
  )

  if (error) {
    return (
      <>
        {header}
        <EmptyState
          title="Couldn’t load reports"
          description={describeError(error)}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </>
    )
  }

  if (loading) {
    return (
      <>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 rounded-2xl" />
      </>
    )
  }

  return (
    <>
      {header}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SegmentedTabs options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From" className="w-40">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  setCustom({ from: e.target.value, to: presetDays === null ? custom.to : to })
                  setPeriod('custom')
                }}
              />
            )}
          </Field>
          <Field label="To" className="w-40">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={to}
                min={from}
                onChange={(e) => {
                  setCustom({ from: presetDays === null ? custom.from : from, to: e.target.value })
                  setPeriod('custom')
                }}
              />
            )}
          </Field>
        </div>
      </div>

      {!rangeValid && (
        <EmptyState
          title="Choose a valid range"
          description="The start date must be on or before the end date."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setCustom({ from: addDaysToDateString(today, -6), to: today })
                setPeriod('7')
              }}
            >
              Reset to 7 days
            </Button>
          }
        />
      )}

      {rangeValid && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              label="Orders"
              value={stats.orderCount.toLocaleString('en-KE')}
              hint={`${formatDateShort(from)} – ${formatDateShort(to)}`}
            />
            <KpiCard label="Revenue" value={formatKes(stats.revenue)} hint="Completed orders only" />
            <KpiCard label="Average order value" value={formatKes(Math.round(stats.aov))} hint={`${stats.completedCount} completed orders`} />
            <KpiCard
              label="Cancellation rate"
              value={`${stats.cancellationRate.toFixed(1)}%`}
              hint={`${stats.cancelled} cancelled or rejected`}
              tone={stats.cancelled > 0 ? 'error' : undefined}
            />
            <KpiCard label="Reservations" value={String(stats.reservationCount)} hint="By booking date" />
            <KpiCard
              label="No-show rate"
              value={stats.noShowRate === null ? '—' : `${stats.noShowRate.toFixed(1)}%`}
              hint={stats.noShowRate === null ? 'No decided reservations yet' : `${stats.noShows} no shows of ${stats.decided}`}
              tone={stats.noShows > 0 ? 'error' : undefined}
            />
          </div>

          {noData ? (
            <EmptyState
              className="mt-6"
              title="No activity in this period"
              description="Try a wider date range — orders and reservations will appear here as soon as they exist."
            />
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-card">Revenue &amp; orders per day</h2>
                    <p className="flex items-center gap-4 text-support text-stone">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-ink" aria-hidden />
                        Revenue
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-champagne" aria-hidden />
                        Orders
                      </span>
                    </p>
                  </div>
                  <div className="mt-5 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={revenueSeries} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
                        <CartesianGrid stroke={LINE} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: STONE }}
                          axisLine={{ stroke: LINE }}
                          tickLine={false}
                          minTickGap={22}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: STONE }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number | string) =>
                            typeof value === 'number' && value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                          }
                        />
                        <YAxis
                          yAxisId="orders"
                          orientation="right"
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: STONE }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          cursor={{ fill: 'rgba(23,23,21,0.05)' }}
                          formatter={(value, name) =>
                            name === 'revenue'
                              ? `${formatKes(Number(value))}`
                              : `${String(value)} orders`
                          }
                        />
                        <Bar dataKey="revenue" fill={INK} radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Line
                          yAxisId="orders"
                          dataKey="orders"
                          type="monotone"
                          stroke={CHAMPAGNE}
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <h2 className="text-card">Order status</h2>
                  <p className="mt-1 text-support text-stone">Share of orders in this period.</p>
                  {statusTotal === 0 ? (
                    <p className="mt-5 text-support text-stone">No orders in this period.</p>
                  ) : (
                    <>
                      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-line">
                        {[...stats.byStatus.entries()].map(([status, count]) => (
                          <span
                            key={status}
                            className={cn('h-full', STATUS_BAR_COLOR[status])}
                            style={{ width: `${(count / statusTotal) * 100}%` }}
                            title={`${ORDER_STATUS_LABELS[status]}: ${count}`}
                          />
                        ))}
                      </div>
                      <ul className="mt-5 border-t border-line">
                        {[...stats.byStatus.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .map(([status, count]) => (
                            <li key={status} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                              <span className={cn('size-2.5 shrink-0 rounded-full', STATUS_BAR_COLOR[status])} />
                              <span className="text-support text-ink">{ORDER_STATUS_LABELS[status]}</span>
                              <span className="ml-auto tabular-nums text-support text-stone">
                                {count} · {((count / statusTotal) * 100).toFixed(0)}%
                              </span>
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <h2 className="text-card">Top dishes</h2>
                  <p className="mt-1 text-support text-stone">Quantity sold in this period.</p>
                  <div className="mt-5 h-80">
                    {topDishes.length === 0 ? (
                      <p className="text-support text-stone">No dish quantities recorded yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDishes} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 4 }}>
                          <XAxis type="number" hide allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={176}
                            tick={{ fontSize: 11, fill: STONE }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            cursor={{ fill: 'rgba(23,23,21,0.05)' }}
                            formatter={(value) => `${String(value)} sold`}
                          />
                          <Bar dataKey="qty" fill={INK} radius={[0, 4, 4, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-card">Reservations</h2>
                  <p className="mt-1 text-support text-stone">Bookings per day.</p>
                  <div className="mt-5 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reservationSeries} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                        <CartesianGrid stroke={LINE} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: STONE }}
                          axisLine={{ stroke: LINE }}
                          tickLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: STONE }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(23,23,21,0.05)' }} />
                        <Bar dataKey="count" fill={CHAMPAGNE} radius={[3, 3, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card>
                <h2 className="text-card">Daily breakdown</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className={cn(tableClasses.table, 'min-w-[40rem]')}>
                    <thead>
                      <tr>
                        <th className={tableClasses.th}>Date</th>
                        <th className={cn(tableClasses.th, 'text-right')}>Orders</th>
                        <th className={cn(tableClasses.th, 'text-right')}>Revenue</th>
                        <th className={cn(tableClasses.th, 'text-right')}>Avg order</th>
                        <th className={cn(tableClasses.th, 'text-right')}>Cancellations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayRows.map((row) => (
                        <tr key={row.day} className="transition-colors hover:bg-ivory/60">
                          <td className={cn(tableClasses.td, 'whitespace-nowrap font-medium text-ink')}>
                            {formatDateShort(row.day)}
                          </td>
                          <td className={cn(tableClasses.td, 'text-right tabular-nums')}>{row.orders}</td>
                          <td className={cn(tableClasses.td, 'text-right tabular-nums')}>{formatKes(row.revenue)}</td>
                          <td className={cn(tableClasses.td, 'text-right tabular-nums')}>
                            {row.revenue > 0 ? formatKes(row.avg) : '—'}
                          </td>
                          <td className={cn(tableClasses.td, 'text-right tabular-nums')}>{row.cancellations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          <Card className="mt-6">
            <h2 className="text-card">How these numbers are calculated</h2>
            <ul className="mt-4 grid gap-3 text-support text-stone sm:grid-cols-2">
              <li>Revenue counts completed orders only — cancelled and rejected orders are excluded.</li>
              <li>Average order value = revenue ÷ completed orders in the period.</li>
              <li>Cancellation rate = (cancelled + rejected) ÷ all orders in the period.</li>
              <li>Reservations are counted by booking date, not by creation date.</li>
              <li>
                No-show rate = no shows ÷ reservations with a decided outcome (completed, confirmed or no show).
              </li>
              <li>Days are grouped in Africa/Nairobi time. Charts update live from Firestore.</li>
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-support text-stone">
              Every figure above is derived from the live orders and reservations collections — nothing is stored
              separately for reporting.
            </p>
          </Card>
        </>
      )}
    </>
  )
}
