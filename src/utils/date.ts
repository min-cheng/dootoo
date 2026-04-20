import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  startOfDay,
  addDays,
  addMonths,
  isBefore,
  isAfter,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'
import type { RecurringConfig } from '../types'

export { isToday, isTomorrow, startOfDay, addDays, isBefore, isAfter, parseISO, differenceInCalendarDays }

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateFromStr(str: string): Date {
  return parseISO(str)
}

export function formatDueDate(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  const diff = differenceInCalendarDays(d, new Date())
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE')
  if (isThisYear(d)) return format(d, 'MMM d')
  return format(d, 'MMM d, yyyy')
}

export function isOverdue(dateStr: string): boolean {
  const d = parseISO(dateStr)
  return isBefore(startOfDay(d), startOfDay(new Date()))
}

export function getUpcomingDays(count = 7): string[] {
  return Array.from({ length: count }, (_, i) =>
    format(addDays(new Date(), i + 1), 'yyyy-MM-dd')
  )
}

export function getDayLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEEE, MMM d')
  if (isThisYear(d)) return format(d, 'EEEE, MMM d')
  return format(d, 'EEEE, MMM d yyyy')
}

function nthWeekdayOfMonth(nth: number, weekday: number, year: number, month: number): Date {
  if (nth === -1) {
    const lastDay = new Date(year, month + 1, 0)
    let d = lastDay
    while (d.getDay() !== weekday) d = addDays(d, -1)
    return d
  }
  const firstDay = new Date(year, month, 1)
  let d = firstDay
  while (d.getDay() !== weekday) d = addDays(d, 1)
  return addDays(d, (nth - 1) * 7)
}

export function getNextOccurrence(config: RecurringConfig, fromDate: string): string {
  const date = parseISO(fromDate)
  if (config.pattern === 'daily') return format(addDays(date, 1), 'yyyy-MM-dd')
  if (config.pattern === 'weekly') return format(addDays(date, 7), 'yyyy-MM-dd')
  if (config.pattern === 'monthly') return format(addMonths(date, 1), 'yyyy-MM-dd')
  if (config.pattern === 'weekdays') {
    let next = addDays(date, 1)
    while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
    return format(next, 'yyyy-MM-dd')
  }
  if (config.pattern === 'monthly-nth-weekday' && config.weekday !== undefined && config.nth !== undefined) {
    const nextMonth = addMonths(date, 1)
    return format(nthWeekdayOfMonth(config.nth, config.weekday, nextMonth.getFullYear(), nextMonth.getMonth()), 'yyyy-MM-dd')
  }
  return format(addDays(date, 1), 'yyyy-MM-dd')
}

export function formatRecurring(config: RecurringConfig): string {
  if (config.pattern === 'monthly-nth-weekday' && config.nth !== undefined && config.weekday !== undefined) {
    const nthLabel: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', [-1]: 'Last' }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `${nthLabel[config.nth]} ${dayNames[config.weekday]} of month`
  }
  const labels: Record<string, string> = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    weekdays: 'Weekdays',
  }
  return labels[config.pattern] ?? config.pattern
}

export function calendarMonthDays(year: number, month: number): (string | null)[] {
  // Returns an array of 42 cells (6 weeks), null for padding days
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = firstDay.getDay() // 0=Sun
  const cells: (string | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'))
  }
  while (cells.length < 42) cells.push(null)
  return cells
}
