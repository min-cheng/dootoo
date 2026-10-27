import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday, isMonday, isTuesday, isWednesday, isThursday, isFriday, isSaturday, isSunday } from 'date-fns'
import type { RecurringConfig } from '../types'

export interface ParsedTask {
  title: string
  startDate?: string
  dueDate?: string
  dueTime?: string
  labelNames: string[]
  recurring?: RecurringConfig
  starred: boolean
  waiting?: boolean
  waitingOn?: string
}

function nextWeekday(name: string, from: Date = new Date()): Date {
  const fns: Record<string, (d: Date) => Date> = {
    monday: nextMonday,
    tuesday: nextTuesday,
    wednesday: nextWednesday,
    thursday: nextThursday,
    friday: nextFriday,
    saturday: nextSaturday,
    sunday: nextSunday,
  }
  const checks: Record<string, (d: Date) => boolean> = {
    monday: isMonday,
    tuesday: isTuesday,
    wednesday: isWednesday,
    thursday: isThursday,
    friday: isFriday,
    saturday: isSaturday,
    sunday: isSunday,
  }
  const lc = name.toLowerCase()
  if (checks[lc]?.(from)) return fns[lc](from) // if today is that day, get next occurrence
  return fns[lc]?.(from) ?? from
}

function parseTime(raw: string): string | undefined {
  // HH:MM or H:MMam/pm or Ham/pm
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return undefined
  let h = parseInt(match[1])
  const m = parseInt(match[2] ?? '0')
  const meridiem = match[3]?.toLowerCase()
  if (meridiem === 'pm' && h < 12) h += 12
  if (meridiem === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_DAY_RE = new RegExp(`\\b(${MONTH_NAMES.join('|')})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i')
const DATE_PHRASE = `today|tomorrow|next\\s+week|next\\s+month|(?:next\\s+)?(?:${DAY_NAMES.join('|')})|(?:${MONTH_NAMES.join('|')})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?`
const START_RE = new RegExp(`\\b(?:from|starting|start)\\s+(${DATE_PHRASE})\\b`, 'i')
const DUE_RE = new RegExp(`\\b(?:by|due)\\s+(${DATE_PHRASE})\\b`, 'i')

function findDate(text: string): { date: string; index: number; length: number } | null {
  const today = new Date()

  // "Month Day" first, e.g. "june 1", "December 25th"
  const md = text.match(MONTH_DAY_RE)
  if (md && md.index !== undefined) {
    const monthIdx = MONTH_NAMES.indexOf(md[1].toLowerCase())
    const day = parseInt(md[2])
    const candidate = new Date(today.getFullYear(), monthIdx, day)
    // If the date has already passed this year, use next year
    const resolved = candidate < today ? new Date(today.getFullYear() + 1, monthIdx, day) : candidate
    return { date: format(resolved, 'yyyy-MM-dd'), index: md.index, length: md[0].length }
  }

  const patterns: Array<[RegExp, () => Date]> = [
    [/\btoday\b/i, () => today],
    [/\btomorrow\b/i, () => addDays(today, 1)],
    [/\bnext\s+week\b/i, () => addDays(today, 7)],
    [/\bnext\s+month\b/i, () => addDays(today, 30)],
    ...DAY_NAMES.map<[RegExp, () => Date]>(d => [new RegExp(`\\bnext\\s+${d}\\b`, 'i'), () => nextWeekday(d, today)]),
    ...DAY_NAMES.map<[RegExp, () => Date]>(d => [new RegExp(`\\b${d}\\b`, 'i'), () => nextWeekday(d, today)]),
  ]
  for (const [re, getDate] of patterns) {
    const m = text.match(re)
    if (m && m.index !== undefined) return { date: format(getDate(), 'yyyy-MM-dd'), index: m.index, length: m[0].length }
  }
  return null
}

// With a wrapper ("from …"/"by …"), only a date inside that phrase counts, and the whole phrase is removed
function takeDate(text: string, wrapper?: RegExp): { date: string; rest: string } | null {
  if (wrapper) {
    const m = text.match(wrapper)
    if (!m || m.index === undefined) return null
    const found = findDate(m[1])
    if (!found) return null
    return { date: found.date, rest: text.slice(0, m.index) + text.slice(m.index + m[0].length) }
  }
  const found = findDate(text)
  if (!found) return null
  return { date: found.date, rest: text.slice(0, found.index) + text.slice(found.index + found.length) }
}

export function parseNL(input: string): ParsedTask {
  let text = input.trim()
  const labelNames: string[] = []
  let startDate: string | undefined
  let dueDate: string | undefined
  let dueTime: string | undefined
  let recurring: RecurringConfig | undefined
  let starred = false
  let waiting = false
  let waitingOn: string | undefined

  // Extract ~waitingOn (e.g. ~design team or just ~)
  const waitingMatch = text.match(/~([^#!]*?)(?=\s*[#!]|\s*$)/)
  if (waitingMatch) {
    waiting = true
    const who = waitingMatch[1].trim()
    if (who) waitingOn = who
    text = text.replace(waitingMatch[0], '').trim()
  }

  // Extract !! for starred
  if (text.includes('!!')) {
    starred = true
    text = text.replace(/!!/g, '').trim()
  }

  // Extract #labels
  text = text.replace(/#(\w+)/g, (_, name) => {
    labelNames.push(name.toLowerCase())
    return ''
  })

  // Extract recurring patterns (must come before date so "every monday" doesn't conflict)
  const nthWords: Record<string, 1 | 2 | 3 | 4 | -1> = {
    first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, last: -1,
  }
  const dayWords: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  }
  const nthWeekdayRe = /\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+(?:every\s+)?(?:the\s+)?month\b/i
  const nthMatch = text.match(nthWeekdayRe)
  if (nthMatch) {
    recurring = {
      pattern: 'monthly-nth-weekday',
      nth: nthWords[nthMatch[1].toLowerCase()],
      weekday: dayWords[nthMatch[2].toLowerCase()],
    }
    text = text.replace(nthMatch[0], '').trim()
  }

  if (!recurring) {
    const recurringPatterns: Array<[RegExp, RecurringConfig]> = [
      [/\bevery\s+day\b|\bdaily\b/i, { pattern: 'daily' }],
      [/\bevery\s+week\b|\bweekly\b/i, { pattern: 'weekly' }],
      [/\bevery\s+month\b|\bmonthly\b/i, { pattern: 'monthly' }],
      [/\bevery\s+weekday\b|\bweekdays\b/i, { pattern: 'weekdays' }],
    ]
    for (const [re, config] of recurringPatterns) {
      if (re.test(text)) {
        recurring = config
        text = text.replace(re, '').trim()
        break
      }
    }
  }

  // Extract time: "at 3pm", "at 3:30pm", "at 15:00"
  const timeMatch = text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
  if (timeMatch) {
    dueTime = parseTime(timeMatch[1].trim())
    text = text.replace(timeMatch[0], '').trim()
  }

  // "from wednesday" sets the start date; "by friday", "due friday" or a bare date sets the due date
  const start = takeDate(text, START_RE)
  if (start) {
    startDate = start.date
    text = start.rest
  }
  const due = takeDate(text, DUE_RE) ?? takeDate(text)
  if (due) {
    dueDate = due.date
    text = due.rest
  }

  // Clean up extra spaces
  const title = text.replace(/\s{2,}/g, ' ').trim()

  return { title, startDate, dueDate, dueTime, labelNames, recurring, starred, waiting: waiting || undefined, waitingOn }
}
