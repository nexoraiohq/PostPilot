import { format, isValid, parseISO } from 'date-fns'

export function formatKes(amountKes: number): string {
  return `KES ${Math.round(amountKes).toLocaleString('en-KE')}`
}

export function formatDateLong(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return ''
  return format(date, 'EEEE d MMMM yyyy')
}

export function formatDateShort(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return ''
  return format(date, 'd MMM yyyy')
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatTimestamp(value: number | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  return format(date, 'd MMM yyyy, h:mm a')
}

export function formatRelativeDay(value: number): string {
  const date = toDate(value)
  if (!date) return ''
  return format(date, 'EEEE d MMM')
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value)
  return isValid(date) ? date : null
}

/** Today's date in the restaurant's local timezone as YYYY-MM-DD. */
export function todayInTimezone(timezone = 'Africa/Nairobi'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** HH:mm now in the restaurant's local timezone. */
export function nowInTimezone(timezone = 'Africa/Nairobi'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function addDaysToDateString(dateString: string, days: number): string {
  const date = parseISO(dateString)
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}
