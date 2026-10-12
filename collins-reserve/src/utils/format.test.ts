import { describe, expect, it } from 'vitest'
import {
  addDaysToDateString,
  formatDateLong,
  formatDateShort,
  formatKes,
  formatRelativeDay,
  formatTime12h,
  formatTimestamp,
  nowInTimezone,
  todayInTimezone,
} from './format'

describe('formatKes', () => {
  it('formats whole thousands with rounding', () => {
    expect(formatKes(0)).toBe('KES 0')
    expect(formatKes(1234.6)).toBe('KES 1,235')
    expect(formatKes(499999.4)).toBe('KES 499,999')
    expect(formatKes(1200000)).toBe('KES 1,200,000')
  })
})

describe('formatTime12h', () => {
  it('formats 24h times as 12h clock times', () => {
    expect(formatTime12h('00:00')).toBe('12:00 AM')
    expect(formatTime12h('09:05')).toBe('9:05 AM')
    expect(formatTime12h('12:00')).toBe('12:00 PM')
    expect(formatTime12h('13:05')).toBe('1:05 PM')
    expect(formatTime12h('23:59')).toBe('11:59 PM')
  })

  it('returns the input unchanged when it is not a time', () => {
    expect(formatTime12h('oops')).toBe('oops')
    expect(formatTime12h('')).toBe('')
  })
})

describe('formatDateLong / formatDateShort / formatRelativeDay', () => {
  it('formats ISO dates', () => {
    expect(formatDateLong('2026-10-12')).toBe('Monday 12 October 2026')
    expect(formatDateShort('2026-10-12')).toBe('12 Oct 2026')
    expect(formatRelativeDay(Date.UTC(2026, 9, 12, 9))).toBe('Monday 12 Oct')
  })

  it('returns an empty string for invalid input', () => {
    expect(formatDateLong('nope')).toBe('')
    expect(formatDateShort('')).toBe('')
    expect(formatRelativeDay(Number.NaN)).toBe('')
  })
})

describe('formatTimestamp', () => {
  it('formats epoch milliseconds', () => {
    expect(formatTimestamp(Date.UTC(2026, 9, 12, 15, 30))).toMatch(/^\d{1,2} \w{3} \d{4}, \d{1,2}:\d{2} [AP]M$/)
  })

  it('returns an empty string for null', () => {
    expect(formatTimestamp(null)).toBe('')
    expect(formatTimestamp(undefined)).toBe('')
  })
})

describe('addDaysToDateString', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysToDateString('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateString('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDaysToDateString('2026-06-15', 0)).toBe('2026-06-15')
    expect(addDaysToDateString('2026-06-15', 30)).toBe('2026-07-15')
  })
})

describe('todayInTimezone / nowInTimezone', () => {
  it('produce machine-readable local shapes for Africa/Nairobi', () => {
    expect(todayInTimezone()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(nowInTimezone()).toMatch(/^\d{2}:\d{2}$/)
  })
})
