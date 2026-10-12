import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { RESERVATION_STATUS_LABELS, type Reservation, type ReservationStatus } from '@/types'
import { subscribeToReservations, updateReservationStatus } from '@/services/reservations.service'
import { formatDateShort, formatTime12h, todayInTimezone } from '@/utils/format'
import { ReservationStatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
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
  tableClasses,
} from './_adminui'
import { cn } from '@/utils/cn'
import type { SeatingPreference } from '@/types'

type ViewTab = 'list' | 'calendar'
type ScopeTab = 'today' | 'upcoming' | 'all'
type StatusTab = 'all' | ReservationStatus

interface PendingAction {
  reservation: Reservation
  to: ReservationStatus
  label: string
  message: string
  destructive: boolean
}

const VIEW_TABS: { value: ViewTab; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
]

const SCOPE_OPTIONS: { value: ScopeTab; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'all', label: 'All dates' },
]

const STATUS_OPTIONS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No show' },
]

const SEATING_LABELS: Record<SeatingPreference, string> = {
  any: 'No preference',
  indoor: 'Indoor',
  terrace: 'Terrace',
  window: 'Window',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AdminReservationsPage() {
  const { toast } = useToast()
  const today = todayInTimezone()

  const [reservations, setReservations] = useState<Reservation[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [epoch, setEpoch] = useState(0)

  const [view, setView] = useState<ViewTab>('list')
  const [scope, setScope] = useState<ScopeTab>('today')
  const [status, setStatus] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  useEffect(() => {
    const unsub = subscribeToReservations({ dateRange: 'all' }, setReservations, setError)
    return unsub
  }, [epoch])

  const loading = reservations === null

  const searchFiltered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (reservations ?? []).filter(
      (r) =>
        !term ||
        r.reference.toLowerCase().includes(term) ||
        r.guestName.toLowerCase().includes(term) ||
        r.guestPhone.includes(term),
    )
  }, [reservations, search])

  const statusFiltered = useMemo(
    () => searchFiltered.filter((r) => status === 'all' || r.status === status),
    [searchFiltered, status],
  )

  const listRows = useMemo(() => {
    const rows = statusFiltered.filter((r) => {
      if (scope === 'today') return r.date === today
      if (scope === 'upcoming') return r.date >= today
      return true
    })
    return rows.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
  }, [statusFiltered, scope, today])

  const stats = useMemo(() => {
    const all = reservations ?? []
    const coversToday = all
      .filter((r) => r.date === today && r.status === 'confirmed')
      .reduce((sum, r) => sum + r.partySize, 0)
    const pendingCount = all.filter((r) => r.status === 'pending').length
    return { coversToday, pendingCount }
  }, [reservations, today])

  /* ------------------------------ calendar ------------------------------ */

  const byDate = useMemo(() => {
    const map = new Map<string, { total: number; confirmed: number; pending: number; covers: number }>()
    for (const r of statusFiltered) {
      const entry = map.get(r.date) ?? { total: 0, confirmed: 0, pending: 0, covers: 0 }
      entry.total += 1
      if (r.status === 'confirmed') {
        entry.confirmed += 1
        entry.covers += r.partySize
      } else if (r.status === 'pending') {
        entry.pending += 1
      }
      map.set(r.date, entry)
    }
    return map
  }, [statusFiltered])

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(format(new Date(year, month, day), 'yyyy-MM-dd'))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [monthCursor])

  const agenda = useMemo(
    () =>
      statusFiltered
        .filter((r) => r.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [statusFiltered, selectedDate],
  )

  /* ------------------------------ actions ------------------------------- */

  async function apply(reservation: Reservation, to: ReservationStatus) {
    setBusyId(reservation.id)
    try {
      await updateReservationStatus(reservation.id, to)
      toast(`${reservation.reference} · ${RESERVATION_STATUS_LABELS[to]}`, 'success')
      setPending(null)
    } catch (err) {
      toast(errorMessage(err, `Could not update ${reservation.reference}.`), 'error')
    } finally {
      setBusyId(null)
    }
  }

  function ask(reservation: Reservation, to: PendingAction['to'], label: string, message: string) {
    setPending({ reservation, to, label, message, destructive: true })
  }

  function renderActions(reservation: Reservation, align: 'start' | 'end' = 'start') {
    const busy = busyId === reservation.id
    if (reservation.status === 'pending') {
      return (
        <div className={cn('flex flex-wrap gap-2', align === 'end' && 'justify-end')}>
          <Button size="sm" className="min-h-10" loading={busy} onClick={() => void apply(reservation, 'confirmed')}>
            Confirm
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="min-h-10"
            onClick={() =>
              ask(
                reservation,
                'cancelled',
                'Decline',
                `Decline ${reservation.reference} for ${reservation.guestName} on ${formatDateShort(reservation.date)} at ${formatTime12h(reservation.time)}? The reserved seats will be released.`,
              )
            }
          >
            Decline
          </Button>
        </div>
      )
    }
    if (reservation.status === 'confirmed') {
      return (
        <div className={cn('flex flex-wrap gap-2', align === 'end' && 'justify-end')}>
          <Button size="sm" className="min-h-10" loading={busy} onClick={() => void apply(reservation, 'completed')}>
            Mark arrived
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-10"
            onClick={() =>
              ask(
                reservation,
                'no_show',
                'No show',
                `Record ${reservation.reference} for ${reservation.guestName} as a no show? This cannot be undone.`,
              )
            }
          >
            No show
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="min-h-10"
            onClick={() =>
              ask(
                reservation,
                'cancelled',
                'Cancel',
                `Cancel ${reservation.reference} for ${reservation.guestName} on ${formatDateShort(reservation.date)}? The reserved seats will be released.`,
              )
            }
          >
            Cancel
          </Button>
        </div>
      )
    }
    return null
  }

  function changeView(next: ViewTab) {
    setView(next)
    if (next === 'calendar' && !selectedDate) setSelectedDate(today)
  }

  const hasFilters = search.trim() !== '' || status !== 'all' || scope !== 'today'

  if (error && reservations === null) {
    return (
      <>
        <PageHead title="Reservations" />
        <Card className="flex flex-col items-start gap-4">
          <p className="text-support text-error">{error.message || 'Could not load reservations.'}</p>
          <Button variant="secondary" onClick={() => { setError(null); setEpoch((e) => e + 1) }}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHead
        title="Reservations"
        subtitle={loading ? 'Loading reservations…' : `${listRows.length} booking${listRows.length === 1 ? '' : 's'} in this view`}
        actions={
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-line bg-paper px-4 py-2">
              <p className="label-caps text-stone">Covers today</p>
              <p className="mt-1 text-lg leading-none font-medium text-ink tabular-nums">{loading ? '–' : stats.coversToday}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper px-4 py-2">
              <p className="label-caps text-stone">Pending</p>
              <p className="mt-1 text-lg leading-none font-medium text-champagne-text tabular-nums">
                {loading ? '–' : stats.pendingCount}
              </p>
            </div>
          </div>
        }
      />

      <Toolbar>
        <SegmentedTabs options={VIEW_TABS} value={view} onChange={changeView} />
        {view === 'list' && (
          <FilterSelect value={scope} onChange={setScope} options={SCOPE_OPTIONS} label="Date scope" />
        )}
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} label="Status" />
        <SearchInput value={search} onChange={setSearch} label="Search reservations" placeholder="Name, phone or reference" />
      </Toolbar>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={view === 'calendar' ? 'h-96 rounded-2xl' : 'h-20 rounded-2xl'} />
          ))}
        </div>
      ) : view === 'calendar' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="min-h-10 rounded-lg border border-line px-3 text-stone transition-colors hover:border-stone/50 hover:text-ink"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <p className="text-card">{format(monthCursor, 'MMMM yyyy')}</p>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="min-h-10 rounded-lg border border-line px-3 text-stone transition-colors hover:border-stone/50 hover:text-ink"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 border-b border-line pb-2">
              {WEEKDAYS.map((day) => (
                <span key={day} className="label-caps text-center text-stone">
                  {day.slice(0, 1)}
                  <span className="hidden sm:inline">{day.slice(1)}</span>
                </span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarCells.map((date, index) => {
                if (!date) return <span key={`empty-${index}`} aria-hidden />
                const info = byDate.get(date)
                const dayNumber = Number(date.slice(8, 10))
                const isSelected = date === selectedDate
                const isToday = date === today
                const confirmedDots = Math.min(info?.confirmed ?? 0, 3)
                const pendingDots = Math.min(info?.pending ?? 0, 3 - confirmedDots)
                const dots: ('confirmed' | 'pending')[] = [
                  ...Array.from({ length: confirmedDots }, () => 'confirmed' as const),
                  ...Array.from({ length: pendingDots }, () => 'pending' as const),
                ]
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    aria-label={`${formatDateShort(date)}${info ? `, ${info.total} reservations` : ''}`}
                    className={cn(
                      'flex min-h-16 flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors sm:min-h-20',
                      isSelected
                        ? 'border-ink bg-ink text-ivory'
                        : info && info.total > 0
                          ? 'border-line bg-paper hover:border-stone/50'
                          : 'border-transparent hover:bg-line/50',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[13px] font-medium tabular-nums',
                        isToday && !isSelected && 'text-champagne-text',
                        isSelected && 'text-ivory',
                      )}
                    >
                      {dayNumber}
                    </span>
                    <span className="flex flex-wrap items-center gap-1">
                      {dots.map((kind, i) => (
                        <span
                          key={i}
                          className={cn('size-1.5 rounded-full', kind === 'confirmed' ? 'bg-success' : 'bg-champagne')}
                          aria-hidden
                        />
                      ))}
                      {info && info.total > 3 && (
                        <span className={cn('text-[10px] tabular-nums', isSelected ? 'text-ivory/70' : 'text-stone')}>
                          +{info.total - 3}
                        </span>
                      )}
                    </span>
                    {info && info.total > 0 && (
                      <span className={cn('text-[11px] tabular-nums', isSelected ? 'text-ivory/70' : 'text-stone')}>
                        {info.total} bk · {info.covers}p
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-support text-stone">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" aria-hidden /> Confirmed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-champagne" aria-hidden /> Pending
              </span>
              <span>· p = covers</span>
            </div>
          </Card>

          <Card>
            <p className="label-caps text-stone">{selectedDate ? formatDateShort(selectedDate) : 'Day agenda'}</p>
            {selectedDate === null ? (
              <p className="mt-4 text-support text-stone">Choose a day in the calendar to see its bookings.</p>
            ) : agenda.length === 0 ? (
              <EmptyState
                title="No bookings on this day"
                description="Nothing matches the current status or search filters."
                className="mt-4 border-0 bg-transparent py-10"
              />
            ) : (
              <div className={`${tableClasses.wrap} mt-4`}>
                <table className={tableClasses.table}>
                  <thead>
                    <tr>
                      <th className={tableClasses.th}>Time</th>
                      <th className={tableClasses.th}>Guest</th>
                      <th className={tableClasses.th}>Party</th>
                      <th className={tableClasses.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenda.map((r) => (
                      <tr key={r.id}>
                        <td className={`${tableClasses.td} whitespace-nowrap tabular-nums`}>{formatTime12h(r.time)}</td>
                        <td className={tableClasses.td}>
                          <span className="block text-ink">{r.guestName}</span>
                          <span className="block text-support text-stone tabular-nums">{r.guestPhone}</span>
                        </td>
                        <td className={`${tableClasses.td} whitespace-nowrap tabular-nums`}>{r.partySize} guests</td>
                        <td className={tableClasses.td}>
                          <ReservationStatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : listRows.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No reservations match these filters' : 'No reservations yet'}
          description={
            hasFilters
              ? 'Widen the date scope or clear the search to see more bookings.'
              : 'Bookings made on the restaurant site appear here the moment they are placed.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setScope('all')
                  setStatus('all')
                  setSearch('')
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className={`${tableClasses.wrap} hidden rounded-2xl border border-line bg-paper px-5 md:block`}>
            <table className={tableClasses.table}>
              <thead>
                <tr>
                  <th className={tableClasses.th}>Date &amp; time</th>
                  <th className={tableClasses.th}>Reference</th>
                  <th className={tableClasses.th}>Guest</th>
                  <th className={tableClasses.th}>Party</th>
                  <th className={tableClasses.th}>Seating</th>
                  <th className={tableClasses.th}>Notes</th>
                  <th className={tableClasses.th}>Status</th>
                  <th className={`${tableClasses.th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className={`${tableClasses.td} whitespace-nowrap`}>
                      <span className="block text-ink tabular-nums">{formatDateShort(r.date)}</span>
                      <span className="block text-support text-stone tabular-nums">{formatTime12h(r.time)}</span>
                    </td>
                    <td className={`${tableClasses.td} whitespace-nowrap text-ink tabular-nums`}>{r.reference}</td>
                    <td className={tableClasses.td}>
                      <span className="block text-ink">{r.guestName}</span>
                      <span className="block text-support text-stone tabular-nums">{r.guestPhone}</span>
                    </td>
                    <td className={`${tableClasses.td} whitespace-nowrap tabular-nums`}>{r.partySize} guests</td>
                    <td className={`${tableClasses.td} whitespace-nowrap text-stone`}>{SEATING_LABELS[r.seatingPreference]}</td>
                    <td className={`${tableClasses.td} max-w-48`}>
                      <span className="block text-support text-stone line-clamp-2">{r.notes || '—'}</span>
                    </td>
                    <td className={tableClasses.td}>
                      <ReservationStatusBadge status={r.status} />
                    </td>
                    <td className={`${tableClasses.td} text-right`}>{renderActions(r, 'end')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {listRows.map((r) => {
              const actions = renderActions(r)
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-paper p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink tabular-nums">
                        {formatDateShort(r.date)} · {formatTime12h(r.time)}
                      </p>
                      <p className="mt-0.5 text-support text-stone tabular-nums">{r.reference}</p>
                    </div>
                    <ReservationStatusBadge status={r.status} />
                  </div>
                  <p className="mt-3 text-sm text-ink">{r.guestName}</p>
                  <p className="text-support text-stone tabular-nums">
                    {r.guestPhone} · {r.partySize} guests · {SEATING_LABELS[r.seatingPreference]}
                  </p>
                  {r.notes && <p className="mt-2 text-support text-stone line-clamp-2">{r.notes}</p>}
                  {actions && <div className="mt-3">{actions}</div>}
                </li>
              )
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `${pending.label} ${pending.reservation.reference}?` : ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.label}
        destructive={pending?.destructive}
        loading={busyId !== null}
        onConfirm={() => {
          if (!pending) return
          void apply(pending.reservation, pending.to)
        }}
        onClose={() => setPending(null)}
      />
    </>
  )
}
