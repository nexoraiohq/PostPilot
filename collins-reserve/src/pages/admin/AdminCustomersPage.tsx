import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Info, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { OrderStatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { formatKes, formatTimestamp } from '@/utils/format'
import { cn } from '@/utils/cn'
import { subscribeToOrders } from '@/services/orders.service'
import type { Order } from '@/types'
import { Card, PageHead, SearchInput, Toolbar, tableClasses } from '@/pages/admin/_adminui'

interface Customer {
  key: string
  name: string
  email: string
  phone: string
  orders: Order[]
  orderCount: number
  totalSpentKes: number
  lastOrderAt: number
  favourite: string | null
}

type SortKey = 'orders' | 'spent' | 'last'

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to view orders.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function buildCustomers(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>()

  for (const order of orders) {
    const phone = order.customer.phone.replace(/\D/g, '')
    const key = phone || order.customer.email.toLowerCase() || order.customer.name.trim().toLowerCase()
    if (!key) continue

    const existing = map.get(key)
    const spent = order.status === 'cancelled' || order.status === 'rejected' ? 0 : order.totalKes

    if (!existing) {
      map.set(key, {
        key,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        orders: [order],
        orderCount: 1,
        totalSpentKes: spent,
        lastOrderAt: order.createdAt,
        favourite: null,
      })
      continue
    }

    existing.orders.push(order)
    existing.orderCount += 1
    existing.totalSpentKes += spent
    existing.lastOrderAt = Math.max(existing.lastOrderAt, order.createdAt)
    if (order.customer.name.trim()) existing.name = order.customer.name
    if (order.customer.email.trim()) existing.email = order.customer.email
  }

  for (const customer of map.values()) {
    customer.orders.sort((a, b) => b.createdAt - a.createdAt)
    const counts = new Map<string, number>()
    for (const order of customer.orders) {
      for (const line of order.items) {
        counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity)
      }
    }
    let best: string | null = null
    let bestCount = 0
    for (const [name, count] of counts) {
      if (count > bestCount) {
        best = name
        bestCount = count
      }
    }
    customer.favourite = best
  }

  return [...map.values()]
}

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'last', dir: 'desc' })
  const [selected, setSelected] = useState<Customer | null>(null)

  useEffect(() => subscribeToOrders({ dateRange: 'all' }, setOrders, setError), [])

  const customers = useMemo(() => (orders ? buildCustomers(orders) : []), [orders])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.phone.includes(term) ||
            c.email.toLowerCase().includes(term),
        )
      : customers

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      let diff = 0
      if (sort.key === 'orders') diff = a.orderCount - b.orderCount
      else if (sort.key === 'spent') diff = a.totalSpentKes - b.totalSpentKes
      else diff = a.lastOrderAt - b.lastOrderAt
      if (diff === 0) diff = a.name.localeCompare(b.name)
      return sort.dir === 'asc' ? diff : -diff
    })
    return sorted
  }, [customers, search, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  function sortIcon(key: SortKey) {
    if (sort.key !== key) return <ArrowDown className="size-3 opacity-30" aria-hidden />
    return sort.dir === 'desc' ? (
      <ArrowDown className="size-3" aria-hidden />
    ) : (
      <ArrowUp className="size-3" aria-hidden />
    )
  }

  const header = (
    <PageHead title="Customers" subtitle="Who orders from MAISON NOIR, and how often." />
  )

  if (error) {
    return (
      <>
        {header}
        <EmptyState
          title="Couldn’t load customers"
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

  if (orders === null) {
    return (
      <>
        {header}
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </>
    )
  }

  return (
    <>
      {header}

      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-champagne-text" aria-hidden />
          <p className="text-support text-stone">
            Derived from recorded orders. Customer records are not stored separately in this demo.
          </p>
        </div>
      </Card>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          label="Search customers"
          placeholder="Search name, phone or email"
        />
        <span className="text-support text-stone">
          {visible.length} {visible.length === 1 ? 'customer' : 'customers'}
        </span>
      </Toolbar>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" aria-hidden />}
          title="No customers yet"
          description="Customers appear after their first order."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`Nothing matches “${search}”.`}
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <div className={tableClasses.wrap}>
              <table className={cn(tableClasses.table, 'min-w-[46rem]')}>
                <thead>
                  <tr>
                    <th className={tableClasses.th}>Customer</th>
                    <th className={tableClasses.th}>Phone</th>
                    <th className={tableClasses.th}>
                      <button
                        type="button"
                        onClick={() => toggleSort('orders')}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        Orders {sortIcon('orders')}
                      </button>
                    </th>
                    <th className={tableClasses.th}>
                      <button
                        type="button"
                        onClick={() => toggleSort('spent')}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        Spent {sortIcon('spent')}
                      </button>
                    </th>
                    <th className={tableClasses.th}>
                      <button
                        type="button"
                        onClick={() => toggleSort('last')}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        Last order {sortIcon('last')}
                      </button>
                    </th>
                    <th className={tableClasses.th}>Favourite</th>
                    <th className={cn(tableClasses.th, 'text-right')}> </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((customer) => (
                    <tr key={customer.key} className="transition-colors hover:bg-ivory/60">
                      <td className={tableClasses.td}>
                        <p className="font-medium text-ink">{customer.name || '—'}</p>
                        <p className="text-support text-stone">{customer.email || 'No email'}</p>
                      </td>
                      <td className={cn(tableClasses.td, 'whitespace-nowrap tabular-nums')}>{customer.phone || '—'}</td>
                      <td className={cn(tableClasses.td, 'tabular-nums')}>{customer.orderCount}</td>
                      <td className={cn(tableClasses.td, 'whitespace-nowrap font-medium tabular-nums')}>
                        {formatKes(customer.totalSpentKes)}
                      </td>
                      <td className={cn(tableClasses.td, 'whitespace-nowrap text-stone')}>
                        {formatTimestamp(customer.lastOrderAt)}
                      </td>
                      <td className={cn(tableClasses.td, 'max-w-40 truncate text-stone')}>
                        {customer.favourite ?? '—'}
                      </td>
                      <td className={cn(tableClasses.td, 'text-right')}>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(customer)}>
                          View orders
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {visible.map((customer) => (
              <Card key={customer.key} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{customer.name || '—'}</p>
                    <p className="truncate text-support text-stone">{customer.phone || customer.email || '—'}</p>
                  </div>
                  <Badge tone="ink">{customer.orderCount} orders</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
                  <div>
                    <dt className="label-caps text-stone">Spent</dt>
                    <dd className="mt-1 text-[15px] font-medium tabular-nums">{formatKes(customer.totalSpentKes)}</dd>
                  </div>
                  <div>
                    <dt className="label-caps text-stone">Last order</dt>
                    <dd className="mt-1 text-support text-stone">{formatTimestamp(customer.lastOrderAt)}</dd>
                  </div>
                </dl>
                <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setSelected(customer)}>
                  View orders
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? selected.name || selected.phone : 'Orders'}
        wide
      >
        {selected && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="label-caps text-stone">Orders</dt>
                <dd className="mt-1 text-lg font-medium tabular-nums">{selected.orderCount}</dd>
              </div>
              <div>
                <dt className="label-caps text-stone">Spent</dt>
                <dd className="mt-1 text-lg font-medium tabular-nums">{formatKes(selected.totalSpentKes)}</dd>
              </div>
              <div>
                <dt className="label-caps text-stone">Phone</dt>
                <dd className="mt-1 text-support tabular-nums">{selected.phone || '—'}</dd>
              </div>
              <div>
                <dt className="label-caps text-stone">Email</dt>
                <dd className="mt-1 truncate text-support">{selected.email || '—'}</dd>
              </div>
            </dl>

            <div>
              <p className="label-caps mb-2 text-stone">Order history</p>
              <ul className="border-t border-line">
                {selected.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
                    <span className="font-medium tabular-nums text-ink">{order.reference}</span>
                    <span className="text-support text-stone">{formatTimestamp(order.createdAt)}</span>
                    <span className="ml-auto whitespace-nowrap font-medium tabular-nums">
                      {formatKes(order.totalKes)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
