import { useState, useEffect, useRef } from 'react'
import { Search, Calendar, RotateCcw, Star } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseNL } from '../utils/nlp'
import { formatDueDate } from '../utils/date'

export default function QuickAdd() {
  const { quickAddOpen, setQuickAddOpen, addTask, labels, addLabel } = useStore()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const parsed = value.trim() ? parseNL(value) : null

  useEffect(() => {
    if (quickAddOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setValue('')
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

    addTask({
      title: parsed.title || trimmed,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      labelIds,
      recurring: parsed.recurring,
      starred: parsed.starred,
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
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setQuickAddOpen(false)
            }}
            placeholder="Add a task — try 'meet client tomorrow at 2pm #work'"
            className="flex-1 text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
          />
        </div>

        {/* NLP preview */}
        {parsed && (parsed.dueDate || parsed.labelNames.length > 0 || parsed.recurring || parsed.starred) && (
          <div className="px-5 pb-3 pt-0 flex flex-wrap gap-2 border-t border-gray-50 dark:border-gray-800">
            {parsed.dueDate && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                <Calendar size={11} />
                {formatDueDate(parsed.dueDate)}
                {parsed.dueTime && ` at ${parsed.dueTime}`}
              </span>
            )}
            {parsed.recurring && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full">
                <RotateCcw size={11} />
                {parsed.recurring.pattern}
              </span>
            )}
            {parsed.starred && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                <Star size={11} />
                Starred
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
        <div className="px-5 py-2.5 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
          <div className="text-xs text-gray-400 dark:text-gray-600 space-x-3">
            <span><kbd className="font-mono">↵</kbd> to add</span>
            <span><kbd className="font-mono">Esc</kbd> to cancel</span>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-600 space-x-2">
            <span className="opacity-60">tomorrow · next monday · at 3pm · #label · !!</span>
          </div>
        </div>
      </div>
    </div>
  )
}
