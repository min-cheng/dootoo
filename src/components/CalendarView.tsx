import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO, isToday } from 'date-fns'
import { useStore } from '../store/useStore'
import { calendarMonthDays } from '../utils/date'
import InlineAddTask from './InlineAddTask'
import type { Task } from '../types'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayModalProps {
  dateStr: string
  tasks: Task[]
  onClose: () => void
}

function DayModal({ dateStr, tasks, onClose }: DayModalProps) {
  const { setSelectedTaskId } = useStore()
  const d = parseISO(dateStr)
  const active = tasks.filter(t => !t.completed)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{format(d, 'EEEE, MMMM d')}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{active.length} task{active.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {active.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelectedTaskId(t.id); onClose() }}
              className="w-full text-left px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0"
            >
              <p className="text-sm text-gray-800 dark:text-gray-200">{t.title}</p>
            </button>
          ))}
          {active.length === 0 && (
            <p className="px-5 py-3 text-sm text-gray-400 dark:text-gray-600">No tasks</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <InlineAddTask defaultDueDate={dateStr} onAdd={onClose} />
        </div>
      </div>
    </>
  )
}

export default function CalendarView() {
  const { tasks } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const cells = calendarMonthDays(year, month)

  const tasksByDate = (dateStr: string) =>
    tasks.filter(t => t.dueDate === dateStr).sort((a, b) => a.order - b.order)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedTasks = selectedDate ? tasksByDate(selectedDate) : []

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            {format(new Date(year, month, 1), 'MMMM yyyy')}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`pad-${i}`} className="bg-white dark:bg-gray-900 min-h-16 opacity-30" />
          }

          const dayTasks = tasksByDate(dateStr)
          const today = isToday(parseISO(dateStr))
          const dayNum = parseInt(dateStr.slice(-2))

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="bg-white dark:bg-gray-900 min-h-16 p-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors flex flex-col"
            >
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-start mb-1
                ${today ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-300'}`}>
                {dayNum}
              </span>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    className={`text-xs truncate px-1 py-0.5 rounded
                      ${t.completed
                        ? 'line-through text-gray-300 dark:text-gray-600'
                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-400 dark:text-gray-600 px-1">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <DayModal
          dateStr={selectedDate}
          tasks={selectedTasks}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
