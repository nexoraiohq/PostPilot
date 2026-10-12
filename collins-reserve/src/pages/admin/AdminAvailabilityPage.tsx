import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarX, Check, Clock, Plus, X } from 'lucide-react'
import { useToast } from '@/context/toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { formatDateShort, todayInTimezone } from '@/utils/format'
import { cn } from '@/utils/cn'
import { subscribeToSettings, updateSettings } from '@/services/restaurant.service'
import type { OpeningHoursDay, RestaurantSettings } from '@/types'
import { Card, PageHead } from '@/pages/admin/_adminui'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const PAYMENT_LABELS: Record<string, string> = {
  pay_on_collection: 'Pay on collection (demo)',
}

type NumberKey =
  | 'seatsPerSlot'
  | 'slotDurationMinutes'
  | 'daysAhead'
  | 'minPartySize'
  | 'maxPartySize'
  | 'deliveryFeeKes'
  | 'serviceChargePercent'
  | 'maxItemsPerOrder'

interface FormState {
  seatsPerSlot: number
  slotTimes: string[]
  slotDurationMinutes: number
  daysAhead: number
  minPartySize: number
  maxPartySize: number
  openingHours: OpeningHoursDay[]
  blockedDates: string[]
  acceptPickup: boolean
  acceptDelivery: boolean
  deliveryFeeKes: number
  freeDeliveryOverKes: number | null
  serviceChargePercent: number
  maxItemsPerOrder: number
  cancellationPolicy: string
  reservationNote: string
}

function toForm(settings: RestaurantSettings): FormState {
  return {
    seatsPerSlot: settings.seatsPerSlot,
    slotTimes: [...settings.slotTimes],
    slotDurationMinutes: settings.slotDurationMinutes,
    daysAhead: settings.daysAhead,
    minPartySize: settings.minPartySize,
    maxPartySize: settings.maxPartySize,
    openingHours: settings.openingHours.map((h) => ({ ...h })),
    blockedDates: [...settings.blockedDates],
    acceptPickup: settings.acceptPickup,
    acceptDelivery: settings.acceptDelivery,
    deliveryFeeKes: settings.deliveryFeeKes,
    freeDeliveryOverKes: settings.freeDeliveryOverKes,
    serviceChargePercent: settings.serviceChargePercent,
    maxItemsPerOrder: settings.maxItemsPerOrder,
    cancellationPolicy: settings.cancellationPolicy,
    reservationNote: settings.reservationNote,
  }
}

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to make this change.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-10 w-[52px] shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-ink' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-1.5 left-1.5 size-7 rounded-full bg-paper shadow-[0_1px_3px_rgba(23,23,21,0.25)] transition-transform duration-200',
          checked && 'translate-x-[22px]',
        )}
      />
    </button>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="text-support text-stone">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function SectionCard({
  title,
  description,
  dirty,
  valid,
  saving,
  saveLabel,
  onSave,
  children,
}: {
  title: string
  description?: string
  dirty: boolean
  valid: boolean
  saving: boolean
  saveLabel: string
  onSave: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-card">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-support text-stone">{description}</p>}
        </div>
        {dirty && <Badge tone="champagne">Unsaved changes</Badge>}
      </div>
      <div className="mt-5">{children}</div>
      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <Button onClick={onSave} loading={saving} disabled={!dirty || !valid || saving}>
          {saveLabel}
        </Button>
      </div>
    </Card>
  )
}

export default function AdminAvailabilityPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [baseline, setBaseline] = useState<FormState | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [newSlot, setNewSlot] = useState('')
  const [newBlocked, setNewBlocked] = useState('')

  useEffect(
    () =>
      subscribeToSettings(
        (value) => {
          setSettings(value)
          setLoaded(true)
        },
        setError,
      ),
    [],
  )

  if (settings && !form) {
    const snapshot = toForm(settings)
    setForm(snapshot)
    setBaseline(snapshot)
  }

  if (error) {
    return (
      <>
        <PageHead title="Availability" subtitle="Seating, opening hours, ordering windows and policies." />
        <EmptyState
          title="Couldn’t load settings"
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

  if (loaded && !settings) {
    return (
      <>
        <PageHead title="Availability" subtitle="Seating, opening hours, ordering windows and policies." />
        <EmptyState
          title="Settings not found"
          description="The settings document for this restaurant has not been seeded yet."
        />
      </>
    )
  }

  if (!loaded || !form || !baseline) {
    return (
      <>
        <PageHead title="Availability" subtitle="Seating, opening hours, ordering windows and policies." />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  const today = todayInTimezone()

  function isDirty(keys: (keyof FormState)[]): boolean {
    if (!form || !baseline) return false
    return keys.some((key) => JSON.stringify(form[key]) !== JSON.stringify(baseline[key]))
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function setNumber(key: NumberKey, raw: string) {
    const parsed = Number(raw)
    update(key, raw.trim() === '' || !Number.isFinite(parsed) ? 0 : parsed)
  }

  async function saveSection(
    section: string,
    keys: (keyof FormState)[],
    build: () => Partial<RestaurantSettings>,
  ) {
    if (!form) return
    setSavingSection(section)
    try {
      await updateSettings(build())
      setBaseline((prev) => {
        const next = { ...(prev ?? form) }
        for (const key of keys) Object.assign(next, { [key]: form[key] })
        return next
      })
      toast(`${section} saved`, 'success')
    } catch (e) {
      toast(describeError(e), 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const seatingKeys: (keyof FormState)[] = [
    'seatsPerSlot',
    'slotTimes',
    'slotDurationMinutes',
    'daysAhead',
    'minPartySize',
    'maxPartySize',
  ]
  const hoursKeys: (keyof FormState)[] = ['openingHours']
  const blockedKeys: (keyof FormState)[] = ['blockedDates']
  const orderingKeys: (keyof FormState)[] = [
    'acceptPickup',
    'acceptDelivery',
    'deliveryFeeKes',
    'freeDeliveryOverKes',
    'serviceChargePercent',
    'maxItemsPerOrder',
  ]
  const policyKeys: (keyof FormState)[] = ['cancellationPolicy', 'reservationNote']

  const seatingValid =
    Number.isInteger(form.seatsPerSlot) &&
    form.seatsPerSlot >= 1 &&
    form.seatsPerSlot <= 500 &&
    Number.isInteger(form.slotDurationMinutes) &&
    form.slotDurationMinutes >= 5 &&
    form.slotDurationMinutes <= 480 &&
    Number.isInteger(form.daysAhead) &&
    form.daysAhead >= 0 &&
    form.daysAhead <= 365 &&
    Number.isInteger(form.minPartySize) &&
    form.minPartySize >= 1 &&
    Number.isInteger(form.maxPartySize) &&
    form.maxPartySize >= form.minPartySize &&
    form.slotTimes.length > 0

  const hoursValid = form.openingHours.every(
    (h) => h.closed || (/^\d{2}:\d{2}$/.test(h.open) && /^\d{2}:\d{2}$/.test(h.close)),
  )

  const orderingValid =
    Number.isInteger(form.deliveryFeeKes) &&
    form.deliveryFeeKes >= 0 &&
    (form.freeDeliveryOverKes === null ||
      (Number.isInteger(form.freeDeliveryOverKes) && form.freeDeliveryOverKes > 0)) &&
    Number.isInteger(form.serviceChargePercent) &&
    form.serviceChargePercent >= 0 &&
    form.serviceChargePercent <= 100 &&
    Number.isInteger(form.maxItemsPerOrder) &&
    form.maxItemsPerOrder >= 1 &&
    form.maxItemsPerOrder <= 50

  function addSlot() {
    if (!form) return
    if (!/^\d{2}:\d{2}$/.test(newSlot)) {
      toast('Pick a time first.', 'error')
      return
    }
    if (form.slotTimes.includes(newSlot)) {
      toast('That seating time is already listed.', 'info')
      return
    }
    update('slotTimes', [...form.slotTimes, newSlot].sort())
    setNewSlot('')
  }

  function addBlockedDate() {
    if (!form || !newBlocked) return
    if (newBlocked < today) {
      toast('Only today or later can be blocked.', 'error')
      return
    }
    if (form.blockedDates.includes(newBlocked)) {
      toast('That date is already blocked.', 'info')
      return
    }
    update('blockedDates', [...form.blockedDates, newBlocked].sort())
    setNewBlocked('')
  }

  function setHours(day: number, patch: Partial<OpeningHoursDay>) {
    if (!form) return
    update(
      'openingHours',
      form.openingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)),
    )
  }

  return (
    <>
      <PageHead
        title="Availability"
        subtitle="Seating capacity, opening hours, blocked dates, ordering windows and policies."
      />

      <div className="space-y-6">
        {/* Seating */}
        <SectionCard
          title="Seating"
          description="How many guests you can seat at once, and the times you offer."
          dirty={isDirty(seatingKeys)}
          valid={seatingValid}
          saving={savingSection === 'Seating'}
          saveLabel="Save seating"
          onSave={() =>
            void saveSection('Seating', seatingKeys, () => ({
              seatsPerSlot: form.seatsPerSlot,
              slotTimes: form.slotTimes,
              slotDurationMinutes: form.slotDurationMinutes,
              daysAhead: form.daysAhead,
              minPartySize: form.minPartySize,
              maxPartySize: form.maxPartySize,
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Seats per slot" hint="Capacity of one seating time" error={!seatingValid && (!Number.isInteger(form.seatsPerSlot) || form.seatsPerSlot < 1 || form.seatsPerSlot > 500) ? 'Enter 1–500 seats.' : undefined}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={1}
                  max={500}
                  value={String(form.seatsPerSlot)}
                  onChange={(e) => setNumber('seatsPerSlot', e.target.value)}
                />
              )}
            </Field>
            <Field label="Slot duration (minutes)" hint="Used for pacing and notes">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={5}
                  max={480}
                  value={String(form.slotDurationMinutes)}
                  onChange={(e) => setNumber('slotDurationMinutes', e.target.value)}
                />
              )}
            </Field>
            <Field label="Days ahead" hint="How far guests may book (0–365)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={0}
                  max={365}
                  value={String(form.daysAhead)}
                  onChange={(e) => setNumber('daysAhead', e.target.value)}
                />
              )}
            </Field>
            <Field label="Minimum party size">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={1}
                  value={String(form.minPartySize)}
                  onChange={(e) => setNumber('minPartySize', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Maximum party size"
              error={form.maxPartySize < form.minPartySize ? 'Must be at least the minimum.' : undefined}
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={1}
                  value={String(form.maxPartySize)}
                  onChange={(e) => setNumber('maxPartySize', e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="label-caps text-stone">Seating times</p>
              <span className="text-support text-stone">{form.slotTimes.length} times offered</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.slotTimes.map((time) => (
                <span
                  key={time}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-ivory pl-4 pr-2 text-[13px] tabular-nums text-ink"
                >
                  {time}
                  <button
                    type="button"
                    aria-label={`Remove ${time}`}
                    onClick={() => update('slotTimes', form.slotTimes.filter((t) => t !== time))}
                    className="inline-flex size-7 items-center justify-center rounded-full text-stone transition-colors hover:bg-paper hover:text-error"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              ))}
              {form.slotTimes.length === 0 && (
                <p className="text-support text-error">Add at least one seating time.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Add a seating time" className="w-44">
                {(id) => (
                  <Input id={id} type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} />
                )}
              </Field>
              <Button type="button" variant="secondary" onClick={addSlot}>
                <Plus className="size-4" aria-hidden />
                Add time
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Opening hours */}
        <SectionCard
          title="Opening hours"
          description="One row per weekday. Closed days disappear from public availability."
          dirty={isDirty(hoursKeys)}
          valid={hoursValid}
          saving={savingSection === 'Opening hours'}
          saveLabel="Save opening hours"
          onSave={() => void saveSection('Opening hours', hoursKeys, () => ({ openingHours: form.openingHours }))}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr>
                  <th className="label-caps border-b border-line py-3 pr-4 text-left text-stone">Day</th>
                  <th className="label-caps border-b border-line py-3 pr-4 text-left text-stone">Closed</th>
                  <th className="label-caps border-b border-line py-3 pr-4 text-left text-stone">Opens</th>
                  <th className="label-caps border-b border-line py-3 text-left text-stone">Closes</th>
                </tr>
              </thead>
              <tbody>
                {DAY_ORDER.map((day) => {
                  const hours = form.openingHours.find((h) => h.day === day)
                  if (!hours) return null
                  return (
                    <tr key={day} className="border-b border-line/70 last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-ink">{hours.label}</td>
                      <td className="py-3 pr-4">
                        <Switch
                          checked={hours.closed}
                          onChange={(next) => setHours(day, { closed: next })}
                          label={`${hours.label} closed`}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="time"
                          value={hours.open}
                          disabled={hours.closed}
                          aria-label={`${hours.label} opening time`}
                          onChange={(e) => setHours(day, { open: e.target.value })}
                          className="h-10 w-32 rounded-xl border border-line bg-paper px-3 text-sm disabled:opacity-40"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="time"
                          value={hours.close}
                          disabled={hours.closed}
                          aria-label={`${hours.label} closing time`}
                          onChange={(e) => setHours(day, { close: e.target.value })}
                          className="h-10 w-32 rounded-xl border border-line bg-paper px-3 text-sm disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Blocked dates */}
        <SectionCard
          title="Blocked dates"
          description="Closed dates disappear from public availability — use them for holidays, private events or maintenance."
          dirty={isDirty(blockedKeys)}
          valid
          saving={savingSection === 'Blocked dates'}
          saveLabel="Save blocked dates"
          onSave={() => void saveSection('Blocked dates', blockedKeys, () => ({ blockedDates: form.blockedDates }))}
        >
          <div className="flex flex-wrap gap-2">
            {form.blockedDates.map((date) => (
              <span
                key={date}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-ivory pl-4 pr-2 text-[13px] text-ink"
              >
                <CalendarX className="size-3.5 text-stone" aria-hidden />
                {formatDateShort(date)}
                <button
                  type="button"
                  aria-label={`Unblock ${date}`}
                  onClick={() => update('blockedDates', form.blockedDates.filter((d) => d !== date))}
                  className="inline-flex size-7 items-center justify-center rounded-full text-stone transition-colors hover:bg-paper hover:text-error"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
            {form.blockedDates.length === 0 && (
              <p className="text-support text-stone">No blocked dates — you are open every configured day.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Block a date" className="w-52" hint="Today or later">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  min={today}
                  value={newBlocked}
                  onChange={(e) => setNewBlocked(e.target.value)}
                />
              )}
            </Field>
            <Button type="button" variant="secondary" onClick={addBlockedDate}>
              <Plus className="size-4" aria-hidden />
              Add date
            </Button>
          </div>
        </SectionCard>

        {/* Ordering */}
        <SectionCard
          title="Ordering"
          description="Pickup and delivery windows, fees and order limits."
          dirty={isDirty(orderingKeys)}
          valid={orderingValid}
          saving={savingSection === 'Ordering'}
          saveLabel="Save ordering"
          onSave={() =>
            void saveSection('Ordering', orderingKeys, () => ({
              acceptPickup: form.acceptPickup,
              acceptDelivery: form.acceptDelivery,
              deliveryFeeKes: form.deliveryFeeKes,
              freeDeliveryOverKes: form.freeDeliveryOverKes,
              serviceChargePercent: form.serviceChargePercent,
              maxItemsPerOrder: form.maxItemsPerOrder,
            }))
          }
        >
          <div className="border-b border-line">
            <ToggleRow
              label="Accept pickup orders"
              hint="Guests collect from the pass."
              checked={form.acceptPickup}
              onChange={(next) => update('acceptPickup', next)}
            />
            <ToggleRow
              label="Accept delivery orders"
              hint="Delivered inside your delivery area."
              checked={form.acceptDelivery}
              onChange={(next) => update('acceptDelivery', next)}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Delivery fee (KES)" error={form.deliveryFeeKes < 0 ? 'Cannot be negative.' : undefined}>
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={0}
                  value={String(form.deliveryFeeKes)}
                  onChange={(e) => setNumber('deliveryFeeKes', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Free delivery over (KES)"
              hint="Empty = never free"
              error={
                form.freeDeliveryOverKes !== null && form.freeDeliveryOverKes <= 0
                  ? 'Enter a positive amount.'
                  : undefined
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={0}
                  placeholder="Never"
                  value={form.freeDeliveryOverKes === null ? '' : String(form.freeDeliveryOverKes)}
                  onChange={(e) =>
                    update('freeDeliveryOverKes', e.target.value.trim() === '' ? null : Number(e.target.value))
                  }
                />
              )}
            </Field>
            <Field
              label="Service charge (%)"
              hint="Whole percent, added to every order"
              error={
                !Number.isInteger(form.serviceChargePercent) ||
                form.serviceChargePercent < 0 ||
                form.serviceChargePercent > 100
                  ? 'Enter 0–100 (whole numbers).'
                  : undefined
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  value={String(form.serviceChargePercent)}
                  onChange={(e) => setNumber('serviceChargePercent', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Max items per order"
              error={
                !Number.isInteger(form.maxItemsPerOrder) ||
                form.maxItemsPerOrder < 1 ||
                form.maxItemsPerOrder > 50
                  ? 'Enter 1–50.'
                  : undefined
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  step={1}
                  min={1}
                  max={50}
                  value={String(form.maxItemsPerOrder)}
                  onChange={(e) => setNumber('maxItemsPerOrder', e.target.value)}
                />
              )}
            </Field>
          </div>
        </SectionCard>

        {/* Payments */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-card">Payments</h2>
              <p className="mt-1 max-w-2xl text-support text-stone">
                Payment methods offered at checkout. This demo has no live processor connected.
              </p>
            </div>
            <Badge tone="champagne">Read only</Badge>
          </div>
          <ul className="mt-5 border-t border-line">
            {(settings?.paymentMethods ?? []).map((method) => (
              <li key={method} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3.5" aria-hidden />
                </span>
                <span className="text-[14px] text-ink">{PAYMENT_LABELS[method] ?? method}</span>
              </li>
            ))}
            {(settings?.paymentMethods ?? []).length === 0 && (
              <li className="py-3 text-support text-stone">No payment methods configured.</li>
            )}
          </ul>
        </Card>

        {/* Policies */}
        <SectionCard
          title="Policy texts"
          description="Shown to guests on the reservation, order and policy pages."
          dirty={isDirty(policyKeys)}
          valid
          saving={savingSection === 'Policy texts'}
          saveLabel="Save policy texts"
          onSave={() =>
            void saveSection('Policy texts', policyKeys, () => ({
              cancellationPolicy: form.cancellationPolicy,
              reservationNote: form.reservationNote,
            }))
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Cancellation policy" hint="How guests may cancel a reservation">
              {(id) => (
                <Textarea
                  id={id}
                  rows={6}
                  maxLength={2000}
                  value={form.cancellationPolicy}
                  onChange={(e) => update('cancellationPolicy', e.target.value)}
                />
              )}
            </Field>
            <Field label="Reservation note" hint="Short line shown under the booking form">
              {(id) => (
                <Textarea
                  id={id}
                  rows={6}
                  maxLength={1000}
                  value={form.reservationNote}
                  onChange={(e) => update('reservationNote', e.target.value)}
                />
              )}
            </Field>
          </div>
        </SectionCard>

        <p className="flex items-center gap-2 text-support text-stone">
          <Clock className="size-4" aria-hidden />
          Changes apply to new availability only. Existing reservations are never rewritten.{' '}
          <Link to="/admin/reservations" className="font-medium text-ink underline-offset-4 hover:underline">
            Review reservations →
          </Link>
        </p>
      </div>
    </>
  )
}
