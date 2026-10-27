import { useRef, useState } from 'react'
import { RotateCcw, Star, ListChecks, Hourglass } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Task } from '../types'
import LabelChip from './LabelChip'
import { formatDueDate, isOverdue, formatRecurring, todayStr } from '../utils/date'

function lowerRelative(label: string) {
  return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label
}

interface Props {
  task: Task
  focused?: boolean
}

export default function TaskItem({ task, focused }: Props) {
  const { toggleTask, updateTask, setSelectedTaskId, labels } = useStore()
  const [completing, setCompleting] = useState(false)
  const taskLabels = labels.filter(l => task.labelIds.includes(l.id))
  const subtasksDone = task.subtasks.filter(s => s.completed).length
  const hasSubtasks = task.subtasks.length > 0
  const overdue = task.dueDate && !task.completed && isOverdue(task.dueDate)
  const notStarted = !!task.startDate && !task.completed && task.startDate > todayStr()
  const checkRef = useRef<HTMLButtonElement>(null)

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation()
    if (task.completed) {
      // Un-completing: instant
      toggleTask(task.id)
      return
    }
    // Completing: animate first, then commit
    setCompleting(true)
    setTimeout(() => {
      toggleTask(task.id)
      setCompleting(false)
    }, 650)
  }

  return (
    <div
      tabIndex={0}
      className={`task-row group flex items-start gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors select-none
        ${focused ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}
        ${task.completed ? 'opacity-50 task-completed-enter' : ''}
        ${completing ? 'task-completing' : ''}`}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button') === checkRef.current) return
        setSelectedTaskId(task.id)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setSelectedTaskId(task.id)
        }
      }}
    >
      {/* Checkbox */}
      <button
        ref={checkRef}
        onClick={handleCheck}
        className={`relative after:absolute after:-inset-2.5 after:content-[''] mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center
          ${task.completed || completing
            ? 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
            : 'border-gray-400 dark:border-gray-500 hover:border-gray-600 dark:hover:border-gray-300'
          }`}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {(task.completed || completing) && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Title — with animated strikethrough on completing */}
          <span className={`relative text-sm leading-snug
            ${task.completed
              ? 'line-through text-gray-400 dark:text-gray-500'
              : completing
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-100'
            }`}
          >
            {task.title}
            {completing && <span className="strike-line" />}
          </span>

          <button
            onClick={e => { e.stopPropagation(); updateTask(task.id, { starred: !task.starred }) }}
            className={`p-0.5 rounded transition-all
              ${task.starred
                ? 'text-yellow-400 opacity-100'
                : 'text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden hover:text-yellow-400 dark:hover:text-yellow-400'
              }`}
            aria-label={task.starred ? 'Unstar task' : 'Star task'}
          >
            <Star size={12} className={task.starred ? 'fill-yellow-400' : ''} />
          </button>
        </div>

        {/* Meta row */}
        {(task.dueDate || notStarted || taskLabels.length > 0 || hasSubtasks || task.recurring || task.waiting) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {notStarted && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Starts {lowerRelative(formatDueDate(task.startDate!))}
              </span>
            )}
            {task.dueDate && (
              <span className={`text-xs ${overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {task.startDate && !overdue ? `Due ${lowerRelative(formatDueDate(task.dueDate))}` : formatDueDate(task.dueDate)}
                {task.dueTime && ` · ${task.dueTime}`}
              </span>
            )}
            {task.waiting && (
              <span className="flex items-center gap-0.5 text-xs text-amber-500 dark:text-amber-400 font-medium">
                <Hourglass size={10} />
                {task.waitingOn || 'Waiting'}
              </span>
            )}
            {task.recurring && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                <RotateCcw size={10} />
                {formatRecurring(task.recurring)}
              </span>
            )}
            {hasSubtasks && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400" aria-label={`${subtasksDone} of ${task.subtasks.length} subtasks done`}>
                <ListChecks size={10} />
                {subtasksDone}/{task.subtasks.length}
              </span>
            )}
            {taskLabels.map(l => <LabelChip key={l.id} label={l} size="xs" />)}
          </div>
        )}
      </div>
    </div>
  )
}
