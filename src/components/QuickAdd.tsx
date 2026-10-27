import { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, RotateCcw, Star, Hourglass, Play } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseNL } from '../utils/nlp'
import { formatDueDate, formatRecurring, todayStr } from '../utils/date'

export default function QuickAdd() {
  const { quickAddOpen, setQuickAddOpen, addTask, labels, addLabel, view } = useStore()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const parsed = value.trim() ? parseNL(value) : null

  useEffect(() => {
    if (quickAddOpen) {
      returnFocusTo.current = document.activeElement as HTMLElement | null
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setValue('')
      const previous = returnFocusTo.current
      returnFocusTo.current = null
      if (previous && previous !== document.body && previous.id !== 'quick-add-input') previous.focus?.({ preventScroll: true })
    }
  }, [quickAddOpen])

  function handleAdd() {
    const trimmed = value.trim()
    if (!trimmed) { setQuickAddOpen(false); return }
    if (!parsed) return

    const labelIds: string[] = []
    for (const name of parsed.labelNames) {
      const existing = labels.find(l => l.name === name)
      if (existing) {
        labelIds.push(existing.id)
      } else {
        const colors = ['blue', 'green', 'red', 'purple', 'orange', 'pink', 'yellow', 'teal']
        const color = colors[labels.length % colors.length]
        const id = addLabel(name, color)
        labelIds.push(id)
      }
    }

    // Match the screen you're on: undated tasks added from Today land in Today; from a label view, they get that label
    const hasDate = parsed.dueDate || parsed.startDate || parsed.recurring
    if (typeof view === 'string' && view.startsWith('label:')) {
      const viewLabelId = view.slice(6)
      if (!labelIds.includes(viewLabelId)) labelIds.push(viewLabelId)
    }

    addTask({
      title: parsed.title || trimmed,
      startDate: parsed.startDate,
      dueDate: parsed.dueDate ?? (!hasDate && view === 'today' ? todayStr() : undefined),
      dueTime: parsed.dueTime,
      labelIds,
      recurring: parsed.recurring,
      starred: parsed.starred,
      waiting: parsed.waiting,
      waitingOn: parsed.waitingOn,
    })

    setValue('')
    setQuickAddOpen(false)
  }

  if (!quickAddOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/50"
        onClick={() => setQuickAddOpen(false)}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add task"
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 pl-5 pr-3 py-3">
          <Plus size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <input
            id="quick-add-input"
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setQuickAddOpen(false)
            }}
            enterKeyHint="done"
            aria-label="New task"
            placeholder="Add a task — try 'meet client tomorrow at 2pm #work'"
            className="flex-1 min-w-0 text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!value.trim()}
            className="flex-shrink-0 min-h-[40px] px-4 rounded-xl text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>

        {/* NLP preview */}
        {parsed && (parsed.dueDate || parsed.startDate || parsed.labelNames.length > 0 || parsed.recurring || parsed.starred || parsed.waiting) && (
          <div className="px-5 pb-3 pt-0 flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-800">
            {parsed.startDate && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                <Play size={11} />
                Starts {formatDueDate(parsed.startDate)}
              </span>
            )}
            {parsed.dueDate && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
                <Calendar size={11} />
                {parsed.startDate && 'Due '}{formatDueDate(parsed.dueDate)}
                {parsed.dueTime && ` at ${parsed.dueTime}`}
              </span>
            )}
            {parsed.recurring && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full">
                <RotateCcw size={11} />
                {formatRecurring(parsed.recurring)}
              </span>
            )}
            {parsed.starred && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                <Star size={11} />
                Starred
              </span>
            )}
            {parsed.waiting && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                <Hourglass size={11} />
                {parsed.waitingOn || 'Waiting'}
              </span>
            )}
            {parsed.labelNames.map(name => (
              <span key={name} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                #{name}
              </span>
            ))}
          </div>
        )}

        {/* Footer hints */}
        <div className="px-5 py-2.5 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center gap-3">
          <div className="hidden md:block text-xs text-gray-500 dark:text-gray-500 space-x-3 flex-shrink-0">
            <span><kbd className="font-mono">↵</kbd> to add</span>
            <span><kbd className="font-mono">Esc</kbd> to cancel</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            tomorrow · at 3pm · from monday · #label · !! · ~waiting
          </div>
        </div>
      </div>
    </div>
  )
}
