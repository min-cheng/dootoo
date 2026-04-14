import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseNL } from '../utils/nlp'
import type { TaskStatus } from '../types'

interface Props {
  defaultDueDate?: string
  defaultStatus?: TaskStatus
  onAdd?: (id: string) => void
}

export default function InlineAddTask({ defaultDueDate, defaultStatus, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const { addTask, labels, addLabel } = useStore()

  function handleAdd() {
    const trimmed = value.trim()
    if (!trimmed) { setOpen(false); return }

    const parsed = parseNL(trimmed)

    // Resolve label names to IDs, creating new ones as needed
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

    const id = addTask({
      title: parsed.title || trimmed,
      dueDate: parsed.dueDate ?? defaultDueDate,
      dueTime: parsed.dueTime,
      labelIds,
      recurring: parsed.recurring,
      starred: parsed.starred,
      status: defaultStatus ?? 'todo',
    })

    onAdd?.(id)
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors w-full"
      >
        <Plus size={15} className="flex-shrink-0" />
        Add task
      </button>
    )
  }

  return (
    <div className="px-4 py-2">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd()
          if (e.key === 'Escape') { setValue(''); setOpen(false) }
        }}
        onBlur={() => { if (!value) setOpen(false) }}
        placeholder="Task name — try 'call mom tomorrow at 3pm #work'"
        className="w-full text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none border-b border-gray-200 dark:border-gray-700 py-1 pb-2"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleAdd}
          className="text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1 rounded-lg font-medium hover:opacity-90"
        >
          Add
        </button>
        <button
          onClick={() => { setValue(''); setOpen(false) }}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
