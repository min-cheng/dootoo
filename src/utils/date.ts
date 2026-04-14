import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isThisYear,
  startOfDay,
  addDays,
  isBefore,
  isAfter,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns'

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
