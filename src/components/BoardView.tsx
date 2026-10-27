import { useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../store/useStore'
import type { Task, TaskStatus } from '../types'
import LabelChip from './LabelChip'
import { formatDueDate, isOverdue } from '../utils/date'
import InlineAddTask from './InlineAddTask'
import { Hourglass } from 'lucide-react'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-800/60' },
  { id: 'inprogress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'done', label: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
]

function BoardCard({ task }: { task: Task }) {
  const { setSelectedTaskId, labels } = useStore()
  const taskLabels = labels.filter(l => task.labelIds.includes(l.id))
  const overdue = task.dueDate && !task.completed && isOverdue(task.dueDate)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    WebkitTouchCallout: 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedTaskId(task.id)}
      onKeyDown={e => {
        // Enter opens the card; Space (and arrows) stay with the keyboard drag
        if (e.key === 'Enter' && !isDragging) {
          e.preventDefault()
          setSelectedTaskId(task.id)
          return
        }
        listeners?.onKeyDown?.(e)
      }}
      className={`bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow space-y-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
        ${task.waiting
          ? 'border-l-[3px] border-l-amber-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 dark:border-l-amber-500 dark:border-t-gray-700 dark:border-r-gray-700 dark:border-b-gray-700'
          : 'border-gray-100 dark:border-gray-700'
        }`}
    >
      <p className={`text-sm leading-snug ${task.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
        {task.title}
      </p>

      {task.waiting && (
        <div className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 font-medium">
          <Hourglass size={10} />
          {task.waitingOn || 'Waiting'}
        </div>
      )}

      {(task.dueDate || taskLabels.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.dueDate && (
            <span className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-500'}`}>
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {taskLabels.map(l => <LabelChip key={l.id} label={l} size="xs" />)}
        </div>
      )}

      {task.subtasks.length > 0 && (
        <div className="text-xs text-gray-500">
          {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
        </div>
      )}
    </div>
  )
}

const DONE_PREVIEW_COUNT = 10

function Column({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const col = COLUMNS.find(c => c.id === status)!
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [showAll, setShowAll] = useState(false)

  const isDone = status === 'done'
  const displayTasks = isDone && !showAll ? tasks.slice(0, DONE_PREVIEW_COUNT) : tasks
  const hiddenCount = tasks.length - DONE_PREVIEW_COUNT

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl p-3 min-h-48 snap-start transition-colors ${col.color} ${isOver ? 'ring-2 ring-blue-300 dark:ring-blue-700' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{col.label}</h3>
        <span className="text-xs text-gray-500 tabular-nums">{tasks.length}</span>
      </div>

      <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {displayTasks.map(task => <BoardCard key={task.id} task={task} />)}
        </div>
      </SortableContext>

      {isDone && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-1.5"
        >
          {showAll ? 'Show less' : `Show ${hiddenCount} more completed`}
        </button>
      )}

      <div className="mt-2">
        <InlineAddTask defaultStatus={status} />
      </div>
    </div>
  )
}

export default function BoardView() {
  const { tasks, moveTaskStatus } = useStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Touch drags start after a short press so a swipe still scrolls the page
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const tasksByStatus = (status: TaskStatus) => {
    const filtered = tasks.filter(t => t.status === status)
    if (status === 'done') {
      return filtered.sort((a, b) => {
        if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt)
        if (a.completedAt) return -1
        if (b.completedAt) return 1
        return b.order - a.order
      })
    }
    return filtered.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return a.order - b.order
    })
  }

  const activeTask = tasks.find(t => t.id === activeId)

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveId(null)
    if (!over) return

    const fromTask = tasks.find(t => t.id === active.id)
    if (!fromTask) return

    // Dropped on a column
    const colIds = COLUMNS.map(c => c.id as string)
    if (colIds.includes(over.id as string)) {
      moveTaskStatus(fromTask.id, over.id as TaskStatus)
      return
    }

    // Dropped on another task — reorder within same column
    const toTask = tasks.find(t => t.id === over.id)
    if (!toTask || fromTask.status !== toTask.status) {
      if (toTask) moveTaskStatus(fromTask.id, toTask.status)
      return
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Board</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          <span className="md:hidden">Press and hold a card to move it</span>
          <span className="hidden md:inline">Drag tasks between columns</span>
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto px-4 md:px-6 pb-6 snap-x snap-mandatory scroll-px-4 md:snap-none">
          <div className="grid grid-cols-[repeat(3,minmax(260px,1fr))] md:grid-cols-3 gap-3 md:gap-4 md:min-w-[700px]">
            {COLUMNS.map(col => (
              <Column key={col.id} status={col.id} tasks={tasksByStatus(col.id)} />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-xl border border-gray-200 dark:border-gray-700 rotate-1 w-64">
              <p className="text-sm text-gray-800 dark:text-gray-100">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
