import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheckBig, Clock, TriangleAlert, Users, X } from 'lucide-react'
import {
  createReservation,
  describeDay,
  getAvailability,
  isDateBlocked,
  type SlotAvailability,
} from '@/services/reservations.service'
import { useRestaurantData } from '@/hooks/data'
import { useToast } from '@/context/toast'
import type { Reservation, SeatingPreference } from '@/types'
import { addDaysToDateString, formatDateLong, formatTime12h, todayInTimezone } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Button, LinkButton } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'

const reservationSchema = z.object({
  name: z.string().min(1, 'Please tell us the name for the booking.'),
  email: z.email('Enter a valid email address.'),
  phone: z
    .string()
    .min(1, 'Please add a phone number we can confirm on.')
    .refine((value) => value.replace(/\D/g, '').length >= 9, 'Please enter a valid phone number.'),
  seating: z.enum(['any', 'indoor', 'terrace', 'window']),
  notes: z.string().max(600, 'Please keep notes under 600 characters.'),
  terms: z.boolean().refine((value) => value === true, 'Please accept the reservation terms to continue.'),
})

type ReservationFormValues = z.infer<typeof reservationSchema>

const RESERVATION_STEPS = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Time' },
  { n: 3, label: 'Guest' },
] as const

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const SEATING_LABELS: Record<SeatingPreference, string> = {
  any: 'No preference',
  indoor: 'Indoor dining room',
  terrace: 'Terrace',
  window: 'Window table',
}

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label="Reservation progress" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {RESERVATION_STEPS.map((s, index) => {
        const state = step === 4 || step > s.n ? 'done' : step === s.n ? 'active' : 'todo'
        return (
          <li key={s.n} className="flex items-center gap-3" aria-current={step === s.n ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-[12px] font-medium tabular-nums transition-colors duration-300',
                state === 'done' && 'border-ink bg-ink text-ivory',
                state === 'active' && 'border-ink bg-paper text-ink',
                state === 'todo' && 'border-line bg-paper text-stone',
              )}
            >
              {state === 'done' ? <Check className="size-3.5" aria-hidden /> : s.n}
            </span>
            <span
              className={cn(
                'text-[13px] font-medium tracking-[0.04em]',
                state === 'todo' ? 'text-stone' : 'text-ink',
              )}
            >
              {s.label}
            </span>
            {index < RESERVATION_STEPS.length - 1 && <span className="h-px w-6 bg-line sm:w-10" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

export default function ReservePage() {
  const { settings, loading: settingsLoading } = useRestaurantData()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [guestsChoice, setGuestsChoice] = useState(() => {
    const raw = Number(searchParams.get('guests'))
    return Number.isFinite(raw) && raw >= 1 && raw <= 8 ? Math.floor(raw) : 2
  })
  const [date, setDate] = useState(() => {
    const raw = searchParams.get('date')
    return raw && DATE_PATTERN.test(raw) ? raw : todayInTimezone()
  })
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotAvailability[] | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [booking, setBooking] = useState<Reservation | null>(null)

  const today = todayInTimezone()
  const maxDate = addDaysToDateString(today, settings ? settings.daysAhead : 30)

  /* Party size stays inside the restaurant's configured range (derived, no effect). */
  const partyMin = settings ? Math.max(1, settings.minPartySize) : 1
  const partyMax = settings ? Math.max(partyMin, settings.maxPartySize) : 8
  const guests = Math.min(Math.max(guestsChoice, partyMin), partyMax)
  const partyOptions = PARTY_SIZES.filter((n) => n >= partyMin && n <= partyMax)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { name: '', email: '', phone: '', seating: 'any', notes: '', terms: false },
  })

  async function loadAvailability(targetDate: string): Promise<SlotAvailability[] | null> {
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    try {
      const result = await getAvailability(targetDate, settings)
      setSlots(result)
      /* Drop a selection that just filled up or disappeared. */
      setTime((prev) => {
        if (!prev) return prev
        const stillBookable = result.find((slot) => slot.time === prev)
        return stillBookable && stillBookable.available ? prev : null
      })
      return result
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : 'We could not load available times. Please try again.',
      )
      return null
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function handleShowTimes() {
    setStepError(null)
    if (!settings) {
      setStepError('Reservations are still loading — please try again in a moment.')
      return
    }
    if (!DATE_PATTERN.test(date)) {
      setStepError('Please choose a valid date.')
      return
    }
    if (date < today) {
      setStepError('That date has already passed.')
      return
    }
    if (date > addDaysToDateString(today, settings.daysAhead)) {
      setStepError(`We only accept bookings up to ${settings.daysAhead} days ahead.`)
      return
    }
    if (isDateBlocked(settings, date)) {
      setStepError('We are closed on that date. Please choose another day.')
      return
    }
    if (guests < settings.minPartySize || guests > settings.maxPartySize) {
      setStepError(`We seat parties of ${settings.minPartySize}–${settings.maxPartySize} guests online.`)
      return
    }
    const result = await loadAvailability(date)
    if (result === null) {
      setStepError('We could not load available times. Please try again.')
      return
    }
    setTime(null)
    setStep(2)
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setStepError(null)
      if (!time) {
        setStep(2)
        return
      }
      try {
        const reservation = await createReservation({
          date,
          time,
          partySize: guests,
          guestName: values.name,
          guestPhone: values.phone,
          guestEmail: values.email,
          seatingPreference: values.seating,
          notes: values.notes,
          termsAccepted: values.terms,
        })
        setBooking(reservation)
        setStep(4)
        toast('Your reservation request has been sent.', 'success')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'We could not send your request. Please try again.'
        setStepError(message)
        toast(message, 'error')
        setStep(2)
        await loadAvailability(date)
      }
    },
    () => toast('Please check the highlighted fields.', 'error'),
  )

  const selectedSeating = useWatch({ control, name: 'seating' })
  const blocked = Boolean(settings && isDateBlocked(settings, date))
  const dayLabel = settings ? describeDay(settings, date) : ''

  return (
    <section className="editorial-width pt-10 pb-16 md:pt-14">
      <p className="label-caps mb-5 text-champagne">Reservations</p>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-page">
            Reserve a table<span className="text-champagne">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lead text-stone">
            Three short steps: your party and date, a seating time, then a few details. Every request is reviewed by our
            team before it becomes a booking.
          </p>
        </div>
        <p className="max-w-xs text-support text-stone md:text-right">
          {settings?.reservationNote ?? 'Requests are confirmed by our team.'}
        </p>
      </div>

      <div className="mt-9 rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-8">
          <StepIndicator step={step} />
        </div>

        <div className="px-5 py-7 sm:px-8 sm:py-9">
          {stepError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-error/30 bg-error-soft px-5 py-4"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
              <p className="flex-1 text-support text-error">{stepError}</p>
              <button
                type="button"
                onClick={() => setStepError(null)}
                aria-label="Dismiss message"
                className="rounded-full p-1 text-error/70 transition-colors hover:text-error"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-section">Plan your visit</h2>
                <p className="mt-3 max-w-lg text-body text-stone">
                  Choose your party size and preferred date — we will show the seating times we still have open.
                </p>
              </div>

              <fieldset>
                <legend className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <Users className="size-4 text-champagne" aria-hidden />
                  Party size
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {partyOptions.map((n) => {
                    const active = guests === n
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${n} ${n === 1 ? 'guest' : 'guests'}`}
                        onClick={() => {
                          setGuestsChoice(n)
                          setStepError(null)
                        }}
                        className={cn(
                          'flex size-12 items-center justify-center rounded-full border text-[15px] font-medium tabular-nums transition-colors duration-150',
                          active
                            ? 'border-ink bg-ink text-ivory'
                            : 'border-line bg-paper text-ink hover:border-stone/50',
                        )}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-support text-stone">
                  {settings
                    ? `We seat parties of ${settings.minPartySize}–${settings.maxPartySize} guests online — call us for larger tables.`
                    : 'Loading party size limits…'}
                </p>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Preferred date"
                  required
                  hint={settings ? `Book up to ${settings.daysAhead} days ahead.` : undefined}
                  error={blocked ? 'We are closed on that date.' : undefined}
                >
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={date}
                      min={today}
                      max={maxDate}
                      onChange={(e) => {
                        setDate(e.target.value)
                        setStepError(null)
                      }}
                    />
                  )}
                </Field>

                <div className="rounded-2xl border border-line bg-ivory px-5 py-4">
                  <p className="label-caps text-stone">That day</p>
                  <p className="mt-2 flex items-center gap-2 text-[15px]">
                    <Clock className="size-4 shrink-0 text-champagne" aria-hidden />
                    {settingsLoading && !settings ? (
                      <span className="block h-4 w-40 animate-pulse rounded bg-line/50" aria-hidden />
                    ) : (
                      <span>{dayLabel || 'Opening hours unavailable'}</span>
                    )}
                  </p>
                  <p className="mt-1 text-support text-stone">{formatDateLong(date)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                <Link to="/" className="text-[13px] font-medium text-stone underline-offset-4 hover:text-ink hover:underline">
                  ← Back to home
                </Link>
                <Button size="lg" onClick={handleShowTimes} loading={availabilityLoading}>
                  Check available times
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-section">Choose a time</h2>
                  <p className="mt-3 text-support text-stone">
                    {formatDateLong(date)}
                    {dayLabel ? ` · ${dayLabel}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Change details
                </Button>
              </div>

              {availabilityError && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-error/30 bg-error-soft px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
                    <p className="text-support text-error">{availabilityError}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => void loadAvailability(date)}>
                    Try again
                  </Button>
                </div>
              )}

              {availabilityLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : slots && slots.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {slots.map((slot) => {
                      const active = time === slot.time
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          aria-pressed={active}
                          onClick={() => setTime(slot.time)}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-2xl border px-4 py-3 transition-colors duration-150',
                            !slot.available
                              ? 'cursor-not-allowed border-line bg-ivory/70 text-stone/60'
                              : active
                                ? 'border-ink bg-ink text-ivory'
                                : 'border-line bg-paper hover:border-ink/40',
                          )}
                        >
                          <span className="text-[15px] font-medium tabular-nums">
                            {formatTime12h(slot.time)}
                          </span>
                          <span className={cn('text-[11px]', active && slot.available ? 'text-ivory/70' : 'text-stone')}>
                            {slot.available
                              ? `${slot.remaining} ${slot.remaining === 1 ? 'seat' : 'seats'}`
                              : 'Full'}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {!slots.some((slot) => slot.available) && (
                    <p className="rounded-2xl bg-error-soft px-4 py-3 text-support text-error">
                      Every seating time is taken on this date — try another day.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                    <p className="text-support text-stone">
                      {time ? (
                        <>
                          Selected · <span className="font-medium text-ink">{formatTime12h(time)}</span>
                        </>
                      ) : (
                        'Select a seating time to continue.'
                      )}
                    </p>
                    <Button
                      size="lg"
                      disabled={!time}
                      onClick={() => {
                        setStepError(null)
                        setStep(3)
                      }}
                    >
                      Continue
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </>
              ) : !availabilityError ? (
                <EmptyState
                  icon={<CalendarDays className="size-5" aria-hidden />}
                  title={dayLabel === 'Closed that day' ? 'We are closed on that date' : 'No seating times available'}
                  description={
                    dayLabel === 'Closed that day'
                      ? 'That day falls outside our opening hours — please choose another date.'
                      : 'Every seat is taken on this date — please choose another day.'
                  }
                  action={
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      Change date
                    </Button>
                  }
                />
              ) : null}
            </div>
          )}

          {step === 3 && (
            <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-12">
              <aside className="lg:order-2 lg:col-span-5">
                <div className="rounded-2xl border border-line bg-ivory p-6 lg:sticky lg:top-32">
                  <p className="label-caps text-stone">Your booking</p>
                  <dl className="mt-4 space-y-3 text-[15px]">
                    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                      <dt className="text-stone">Date</dt>
                      <dd className="text-right font-medium">{formatDateLong(date)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                      <dt className="text-stone">Time</dt>
                      <dd className="font-medium tabular-nums">{time ? formatTime12h(time) : '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                      <dt className="text-stone">Party</dt>
                      <dd className="font-medium tabular-nums">
                        {guests} {guests === 1 ? 'guest' : 'guests'}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-stone">Seating</dt>
                      <dd className="text-right font-medium">{SEATING_LABELS[selectedSeating]}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 border-t border-line pt-4 text-support text-stone">
                    {settings?.reservationNote ?? 'Requests are confirmed by our team.'}
                  </p>
                </div>
              </aside>

              <div className="space-y-6 lg:order-1 lg:col-span-7">
                <div>
                  <h2 className="text-section">Your details</h2>
                  <p className="mt-3 text-body text-stone">
                    We use these only to confirm your table — by phone or text.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" required error={errors.name?.message}>
                    {(id) => (
                      <Input
                        id={id}
                        autoComplete="name"
                        placeholder="Full name"
                        invalid={Boolean(errors.name)}
                        {...register('name')}
                      />
                    )}
                  </Field>
                  <Field label="Phone" required error={errors.phone?.message} hint="We confirm by phone or text.">
                    {(id) => (
                      <Input
                        id={id}
                        type="tel"
                        autoComplete="tel"
                        placeholder="07xx xxx xxx"
                        invalid={Boolean(errors.phone)}
                        {...register('phone')}
                      />
                    )}
                  </Field>
                  <Field label="Email" required error={errors.email?.message} className="sm:col-span-2">
                    {(id) => (
                      <Input
                        id={id}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        invalid={Boolean(errors.email)}
                        {...register('email')}
                      />
                    )}
                  </Field>
                  <Field label="Seating preference" error={errors.seating?.message}>
                    {(id) => (
                      <Select id={id} {...register('seating')}>
                        {(['any', 'indoor', 'terrace', 'window'] as SeatingPreference[]).map((value) => (
                          <option key={value} value={value}>
                            {SEATING_LABELS[value]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field
                    label="Notes for the team"
                    hint="Optional — allergies, an occasion, accessibility."
                    error={errors.notes?.message}
                    className="sm:col-span-2"
                  >
                    {(id) => <Textarea id={id} rows={4} placeholder="Anything we should know?" {...register('notes')} />}
                  </Field>
                </div>

                <div>
                  <Checkbox
                    {...register('terms')}
                    label={
                      <span>
                        I accept the{' '}
                        <Link to="/terms" className="underline underline-offset-4 hover:text-ink">
                          terms of service
                        </Link>{' '}
                        and the{' '}
                        <Link to="/cancellation-policy" className="underline underline-offset-4 hover:text-ink">
                          cancellation policy
                        </Link>
                        .
                      </span>
                    }
                  />
                  {errors.terms && (
                    <p role="alert" className="mt-2 text-support text-error">
                      {errors.terms.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
                  <Button type="submit" size="lg" loading={isSubmitting}>
                    Request this table
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep(2)
                      void loadAvailability(date)
                    }}
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Back to times
                  </Button>
                </div>
              </div>
            </form>
          )}

          {step === 4 && booking && (
            <div className="mx-auto max-w-2xl py-4 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
                <CircleCheckBig className="size-8" aria-hidden />
              </div>
              <p className="label-caps mt-6 text-champagne">Request received</p>
              <h2 className="text-section mt-3">
                Thank you, {booking.guestName.split(' ')[0] || booking.guestName}.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-body text-stone">
                Your request is pending — our team will confirm by phone or text.
              </p>

              <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {[
                  { label: 'Reference', value: booking.reference, tabular: true },
                  { label: 'Date', value: formatDateLong(booking.date), tabular: false },
                  { label: 'Time', value: formatTime12h(booking.time), tabular: true },
                  {
                    label: 'Party',
                    value: `${booking.partySize} ${booking.partySize === 1 ? 'guest' : 'guests'}`,
                    tabular: true,
                  },
                ].map((cell) => (
                  <div key={cell.label} className="bg-paper px-5 py-5 text-left">
                    <dt className="label-caps text-stone">{cell.label}</dt>
                    <dd className={cn('mt-1.5 text-[15px] font-medium', cell.tabular && 'tabular-nums')}>
                      {cell.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 text-support text-stone">
                {settings?.reservationNote ?? 'Requests are confirmed by our team.'}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <LinkButton to="/">Back to home</LinkButton>
                <LinkButton to="/experiences" variant="secondary">
                  View experiences
                </LinkButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
