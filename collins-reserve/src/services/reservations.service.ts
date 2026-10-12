import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/services/firebase'
import {
  RESTAURANT_ID,
  type Reservation,
  type ReservationSlot,
  type ReservationStatus,
  type RestaurantSettings,
  type SeatingPreference,
} from '@/types'
import { addDaysToDateString, nowInTimezone, todayInTimezone } from '@/utils/format'
import { generateReservationReference } from '@/utils/order'

export interface SlotAvailability {
  time: string
  capacity: number
  taken: number
  remaining: number
  available: boolean
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function slotIdFor(date: string, time: string): string {
  return `${date}--${time}`
}

function isDateBlocked(settings: RestaurantSettings | null, date: string): boolean {
  return settings?.blockedDates.includes(date) ?? false
}

function dayHours(settings: RestaurantSettings, date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay()
  return settings.openingHours.find((h) => h.day === weekday) ?? null
}

/** Validates a booking request against configuration. Throws a user-facing message when invalid. */
export function assertSlotBookable(settings: RestaurantSettings | null, date: string, time: string, partySize: number): void {
  if (!settings) throw new Error('Reservations are not configured yet.')
  const todayStr = todayInTimezone()
  if (date < todayStr) throw new Error('That date has already passed.')
  if (date > addDaysToDateString(todayStr, settings.daysAhead)) {
    throw new Error(`We only accept bookings up to ${settings.daysAhead} days ahead.`)
  }
  if (isDateBlocked(settings, date)) throw new Error('We are closed on that date.')
  if (partySize < settings.minPartySize || partySize > settings.maxPartySize) {
    throw new Error(`We seat parties of ${settings.minPartySize}–${settings.maxPartySize} guests online.`)
  }
  const hours = dayHours(settings, date)
  if (!hours || hours.closed) throw new Error('We are closed that day.')
  if (!settings.slotTimes.includes(time)) throw new Error('That seating time is not offered.')
  if (date === todayStr && time <= nowInTimezone()) {
    throw new Error('That seating time has already passed today.')
  }
}

/** Realtime-free availability snapshot for a date. */
export async function getAvailability(
  date: string,
  settings: RestaurantSettings | null,
): Promise<SlotAvailability[]> {
  if (!settings) return []
  if (isDateBlocked(settings, date)) return []
  const hours = dayHours(settings, date)
  if (!hours || hours.closed) return []

  const db = getDb()
  const todayStr = todayInTimezone()
  const nowStr = nowInTimezone()

  // One plain read for the whole day — no transaction needed, since nothing
  // is written here. Locking happens in the booking transaction instead.
  const takenByTime = new Map<string, number>()
  const snap = await getDocs(query(collection(db, 'reservationSlots'), where('date', '==', date)))
  for (const slotDoc of snap.docs) {
    const data = slotDoc.data()
    takenByTime.set(String(data.time ?? ''), Number(data.taken ?? 0))
  }

  return settings.slotTimes
    .filter((time) => {
      if (date < todayStr) return false
      if (date === todayStr && time <= nowStr) return false
      return time >= hours.open && time <= hours.close
    })
    .map((time) => {
      const taken = takenByTime.get(time) ?? 0
      const remaining = Math.max(0, settings.seatsPerSlot - taken)
      return {
        time,
        capacity: settings.seatsPerSlot,
        taken,
        remaining,
        available: remaining > 0,
      }
    })
}

export interface CreateReservationInput {
  date: string
  time: string
  partySize: number
  guestName: string
  guestPhone: string
  guestEmail: string
  seatingPreference: SeatingPreference
  notes: string
  termsAccepted: boolean
}

/**
 * Books a table in a transaction with slot locking.
 * The reservation slot document is the concurrency lock: two racing bookings
 * cannot both claim the last remaining seats (Security Rules re-verify).
 * New reservations are created as `pending` — staff confirm them in the dashboard.
 */
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const db = getDb()
  const settingsRef = doc(db, 'settings', RESTAURANT_ID)

  return runTransaction(db, async (tx) => {
    const settingsSnap = await tx.get(settingsRef)
    const settings = settingsSnap.exists() ? ({ id: settingsSnap.id, ...settingsSnap.data() } as RestaurantSettings) : null

    assertSlotBookable(settings, input.date, input.time, input.partySize)
    if (!settings) throw new Error('Reservations are not configured yet.')
    if (!input.termsAccepted) throw new Error('Please accept the reservation terms.')

    const phone = input.guestPhone.replace(/\D/g, '')
    if (phone.length < 9) throw new Error('Please enter a valid phone number.')
    if (!input.guestName.trim()) throw new Error('Please tell us the name for the booking.')

    const slotRef = doc(db, 'reservationSlots', slotIdFor(input.date, input.time))
    const slotSnap = await tx.get(slotRef)
    const capacity = settings.seatsPerSlot
    const taken = slotSnap.exists() ? Number(slotSnap.data().taken ?? 0) : 0
    if (taken + input.partySize > capacity) {
      throw new Error('That seating time has just filled up. Please choose another time.')
    }

    const reference = generateReservationReference()
    const now = Date.now()
    const reservation: Reservation = {
      id: reference,
      restaurantId: RESTAURANT_ID,
      reference,
      guestName: input.guestName.trim(),
      guestPhone: phone,
      guestEmail: input.guestEmail.trim().toLowerCase(),
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      seatingPreference: input.seatingPreference,
      notes: input.notes.trim(),
      status: 'pending',
      slotId: slotIdFor(input.date, input.time),
      termsAccepted: true,
      createdAt: now,
      updatedAt: now,
    }

    tx.set(doc(db, 'reservations', reference), {
      ...reservation,
      createdAtTs: serverTimestamp(),
    })

    if (slotSnap.exists()) {
      tx.update(slotRef, { taken: taken + input.partySize, updatedAt: now })
    } else {
      tx.set(slotRef, {
        id: slotRef.id,
        restaurantId: RESTAURANT_ID,
        date: input.date,
        time: input.time,
        capacity,
        taken: input.partySize,
        updatedAt: now,
      } satisfies ReservationSlot & { id: string; updatedAt: number })
    }

    return reservation
  })
}

export interface ReservationFilters {
  status?: ReservationStatus | null
  /** 'today' | 'upcoming' | 'all' or a YYYY-MM-DD date */
  dateRange?: 'today' | 'upcoming' | 'all' | string
  search?: string
}

export function subscribeToReservations(
  filters: ReservationFilters,
  cb: (reservations: Reservation[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(getDb(), 'reservations'),
      where('restaurantId', '==', RESTAURANT_ID),
      orderBy('createdAt', 'desc'),
      limit(300),
    ),
    (snap) => {
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation))
      if (filters.status) rows = rows.filter((r) => r.status === filters.status)
      if (filters.dateRange && filters.dateRange !== 'all') {
        const todayStr = todayInTimezone()
        if (filters.dateRange === 'today') rows = rows.filter((r) => r.date === todayStr)
        else if (filters.dateRange === 'upcoming') rows = rows.filter((r) => r.date >= todayStr)
        else rows = rows.filter((r) => r.date === filters.dateRange)
      }
      if (filters.search?.trim()) {
        const term = filters.search.trim().toLowerCase()
        rows = rows.filter(
          (r) =>
            r.reference.toLowerCase().includes(term) ||
            r.guestName.toLowerCase().includes(term) ||
            r.guestPhone.includes(term),
        )
      }
      cb(rows)
    },
    onError,
  )
}

const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
}

export async function updateReservationStatus(
  reservationId: string,
  to: ReservationStatus,
  note?: string,
): Promise<void> {
  const db = getDb()
  const ref = doc(db, 'reservations', reservationId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Reservation not found.')
    const reservation = { id: snap.id, ...snap.data() } as Reservation
    if (!RESERVATION_TRANSITIONS[reservation.status].includes(to)) {
      throw new Error(`A reservation cannot move from “${reservation.status}” to “${to}”.`)
    }

    const now = Date.now()
    tx.update(ref, { status: to, updatedAt: now, ...(note ? { statusNote: note } : {}) })

    // Free the locked seats when a booking is cancelled.
    if (to === 'cancelled' && reservation.status !== 'cancelled') {
      const slotRef = doc(db, 'reservationSlots', reservation.slotId)
      const slotSnap = await tx.get(slotRef)
      if (slotSnap.exists()) {
        const taken = Number(slotSnap.data().taken ?? 0)
        tx.update(slotRef, { taken: Math.max(0, taken - reservation.partySize), updatedAt: now })
      }
    }
  })
}

export function subscribeToSlot(
  slotId: string,
  cb: (slot: ReservationSlot | null) => void,
): Unsubscribe {
  return onSnapshot(doc(getDb(), 'reservationSlots', slotId), (snap) =>
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as ReservationSlot) : null),
  )
}

/** Today's opening/closing summary used by the reservation hero. */
export function describeDay(settings: RestaurantSettings | null, date: string): string {
  if (!settings) return ''
  const hours = dayHours(settings, date)
  if (!hours || hours.closed) return 'Closed that day'
  return `${DAY_NAMES[new Date(`${date}T12:00:00`).getDay()]} · ${hours.open}–${hours.close}`
}

export { dayHours, isDateBlocked }
