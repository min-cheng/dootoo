import { format, addDays, addMonths, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns'
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

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const NEXT_DAY_FNS: Record<string, (d: Date) => Date> = {
  sunday: nextSunday,
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
}

// "next friday": the next one after today, even if today is Friday
function nextWeekday(name: string, from: Date): Date {
  return NEXT_DAY_FNS[name.toLowerCase()](from)
}

// "friday": today if it's Friday, otherwise the coming Friday
function comingWeekday(name: string, from: Date): Date {
  return from.getDay() === DAY_NAMES.indexOf(name.toLowerCase()) ? from : nextWeekday(name, from)
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
  // Without am/pm, "at 3" means mid-afternoon, not 3 in the morning
  if (!meridiem && h >= 1 && h <= 7) h += 12
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4,
  june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
}
const MONTH_ALT = Object.keys(MONTHS).join('|')
const DAY_ALT = DAY_NAMES.join('|')
const MONTH_DAY_RE = new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i')
const DATE_PHRASE = `today|tomorrow|next\\s+week|next\\s+month|(?:next\\s+)?(?:${DAY_ALT})|(?:${MONTH_ALT})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?`
const START_RE = new RegExp(`\\b(?:from|starting|start)\\s+(${DATE_PHRASE})\\b`, 'i')
const DUE_RE = new RegExp(`\\b(?:by|due)\\s+(${DATE_PHRASE})\\b`, 'i')
const EVERY_WEEKDAY_RE = new RegExp(`\\bevery\\s+(${DAY_ALT})s?\\b`, 'i')

function findDate(text: string): { date: string; index: number; length: number } | null {
  const today = new Date()

  // "Month Day" first, e.g. "june 1", "Dec 25th", "sept 3"
  const md = text.match(MONTH_DAY_RE)
  if (md && md.index !== undefined) {
    const monthIdx = MONTHS[md[1].toLowerCase()]
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
    [/\bnext\s+month\b/i, () => addMonths(today, 1)],
    ...DAY_NAMES.map<[RegExp, () => Date]>(d => [new RegExp(`\\bnext\\s+${d}\\b`, 'i'), () => nextWeekday(d, today)]),
    ...DAY_NAMES.map<[RegExp, () => Date]>(d => [new RegExp(`\\b${d}\\b`, 'i'), () => comingWeekday(d, today)]),
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

  // ~name marks it as waiting on someone; the name is one word ("~Min", "~design-team"), "~" alone means just waiting
  const waitingMatch = text.match(/~([\p{L}\p{N}_.@-]*)/u)
  if (waitingMatch && waitingMatch.index !== undefined) {
    waiting = true
    if (waitingMatch[1]) waitingOn = waitingMatch[1]
    text = text.slice(0, waitingMatch.index) + text.slice(waitingMatch.index + waitingMatch[0].length)
  }

  // Extract !! for starred
  if (text.includes('!!')) {
    starred = true
    text = text.replace(/!!/g, '').trim()
  }

  // Extract #labels (must start with a letter, so "#42" stays in the title)
  text = text.replace(/#(\p{L}[\p{L}\p{N}_]*)/gu, (_, name: string) => {
    labelNames.push(name.toLowerCase())
    return ''
  })

  // Extract recurring patterns (must come before date so "every monday" doesn't conflict)
  const nthWords: Record<string, 1 | 2 | 3 | 4 | -1> = {
    first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, last: -1,
  }
  const nthWeekdayRe = new RegExp(`\\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\\s+(${DAY_ALT})\\s+of\\s+(?:every\\s+)?(?:the\\s+)?month\\b`, 'i')
  const nthMatch = text.match(nthWeekdayRe)
  if (nthMatch) {
    recurring = {
      pattern: 'monthly-nth-weekday',
      nth: nthWords[nthMatch[1].toLowerCase()],
      weekday: DAY_NAMES.indexOf(nthMatch[2].toLowerCase()) as RecurringConfig['weekday'],
    }
    text = text.replace(nthMatch[0], '').trim()
  }

  // "every monday" repeats weekly, starting this Monday (today if it's Monday)
  if (!recurring) {
    const everyDay = text.match(EVERY_WEEKDAY_RE)
    if (everyDay) {
      recurring = { pattern: 'weekly' }
      dueDate = format(comingWeekday(everyDay[1], new Date()), 'yyyy-MM-dd')
      text = text.replace(everyDay[0], '').trim()
    }
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
  const due = takeDate(text, DUE_RE) ?? (dueDate ? null : takeDate(text))
  if (due) {
    dueDate = due.date
    text = due.rest
  }

  // Clean up extra spaces
  const title = text.replace(/\s{2,}/g, ' ').trim()

  return { title, startDate, dueDate, dueTime, labelNames, recurring, starred, waiting: waiting || undefined, waitingOn }
}
