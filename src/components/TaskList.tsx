import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ViewType } from '../types'
import TaskItem from './TaskItem'
import InlineAddTask from './InlineAddTask'
import { todayStr, getUpcomingDays, getDayLabel, isOverdue, isInToday } from '../utils/date'
import { format, parseISO } from 'date-fns'

const COMPLETED_PREVIEW = 20

interface Props {
  view: ViewType
}

export default function TaskList({ view }: Props) {
  if (view === 'today') return <TodayView />
  if (view === 'upcoming') return <UpcomingView />
  if (view === 'all') return <AllView />
  if (view === 'starred') return <StarredView />
  if (view === 'waiting') return <WaitingView />
  if (typeof view === 'string' && view.startsWith('label:')) {
    const labelId = view.slice(6)
    return <LabelView labelId={labelId} />
  }
  return null
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-2 px-4 pt-5 pb-1.5">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
      {count !== undefined && (
        <span className="text-xs text-gray-500 dark:text-gray-500">{count}</span>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-500">
      {message}
    </div>
  )
}

// An Upcoming day with nothing on it: one slim row instead of a header, "No tasks" and "Add task"
function EmptyDay({ day }: { day: string }) {
  const [adding, setAdding] = useState(false)
  const label = getDayLabel(day)
  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-4 pt-2">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-500">{label}</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            aria-label={`Add a task for ${label}`}
          >
            <Plus size={12} />
            Add
          </button>
        )}
      </div>
      {adding && <InlineAddTask defaultDueDate={day} initiallyOpen onClose={() => setAdding(false)} />}
    </div>
  )
}

function TodayView() {
  const { tasks } = useStore()
  const today = todayStr()

  const overdue = tasks.filter(t => !t.completed && t.dueDate && isOverdue(t.dueDate) && t.dueDate !== today)
    .sort((a, b) => a.order - b.order)
  const todayTasks = tasks.filter(t => isInToday(t, today))
    .sort((a, b) => a.order - b.order)
  // completedAt is a UTC timestamp; compare its local calendar day
  const completed = tasks.filter(t => t.completed && t.completedAt && format(parseISO(t.completedAt), 'yyyy-MM-dd') === today)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const dayName = format(new Date(), 'EEEE')
  const dateLabel = format(new Date(), 'MMM d')

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-8 pb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{dayName}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 font-medium">{dateLabel}</p>
      </div>

      {overdue.length > 0 && (
        <>
          <SectionHeader title="Overdue" count={overdue.length} />
          {overdue.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}

      <SectionHeader title="Today" count={todayTasks.length} />
      {todayTasks.length === 0 && overdue.length === 0 && (
        <EmptyState message="Nothing due today. Enjoy your day! ☀️" />
      )}
      {todayTasks.map(t => <TaskItem key={t.id} task={t} />)}

      <InlineAddTask defaultDueDate={today} />

      {completed.length > 0 && (
        <>
          <SectionHeader title="Completed" count={completed.length} />
          {completed.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}

function UpcomingView() {
  const { tasks } = useStore()
  const days = getUpcomingDays(14)

  const withDate = tasks.filter(t => !t.completed && (t.dueDate || t.startDate))
  const noDate = tasks.filter(t => !t.completed && !t.dueDate && !t.startDate)

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Upcoming</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">Next 2 weeks</p>
      </div>

      {days.map(day => {
        const dayTasks = withDate.filter(t => (t.dueDate ?? t.startDate) === day).sort((a, b) => a.order - b.order)
        if (dayTasks.length === 0) return <EmptyDay key={day} day={day} />
        return (
          <div key={day}>
            <SectionHeader title={getDayLabel(day)} />
            {dayTasks.map(t => <TaskItem key={t.id} task={t} />)}
            <InlineAddTask defaultDueDate={day} />
          </div>
        )
      })}

      {noDate.length > 0 && (
        <>
          <SectionHeader title="No date" count={noDate.length} />
          {noDate.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}

function AllView() {
  const { tasks } = useStore()
  const [showAllCompleted, setShowAllCompleted] = useState(false)

  const active = tasks.filter(t => !t.completed).sort((a, b) => a.order - b.order)
  const completed = tasks.filter(t => t.completed).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const shownCompleted = showAllCompleted ? completed : completed.slice(0, COMPLETED_PREVIEW)

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">All Tasks</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">{active.length} remaining</p>
      </div>

      {active.length === 0 && <EmptyState message="All done! Nothing left to do." />}
      {active.map(t => <TaskItem key={t.id} task={t} />)}

      <InlineAddTask />

      {completed.length > 0 && (
        <>
          <SectionHeader title="Completed" count={completed.length} />
          {shownCompleted.map(t => <TaskItem key={t.id} task={t} />)}
          {completed.length > COMPLETED_PREVIEW && (
            <button
              onClick={() => setShowAllCompleted(v => !v)}
              className="mx-4 my-2 self-start text-sm text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 -ml-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              {showAllCompleted ? 'Show fewer' : `Show all ${completed.length}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function StarredView() {
  const { tasks } = useStore()

  const active = tasks.filter(t => !t.completed && t.starred).sort((a, b) => a.order - b.order)
  const completed = tasks.filter(t => t.completed && t.starred).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Starred</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
          {active.length > 0 ? `${active.length} starred task${active.length !== 1 ? 's' : ''}` : 'Your important tasks'}
        </p>
      </div>

      {active.length === 0 && (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl">☆</span>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No starred tasks yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 max-w-xs">
            Open any task and click the star icon to mark it as important. Starred tasks show up here.
          </p>
        </div>
      )}
      {active.map(t => <TaskItem key={t.id} task={t} />)}

      {completed.length > 0 && (
        <>
          <SectionHeader title="Completed" count={completed.length} />
          {completed.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}

function WaitingView() {
  const { tasks } = useStore()

  const active = tasks.filter(t => !t.completed && t.waiting).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Waiting</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">Tasks blocked on others</p>
      </div>

      {active.length === 0 && (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl">&#9203;</span>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nothing waiting</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 max-w-xs">
            Open any task and mark it as waiting to track tasks that are blocked on someone else.
          </p>
        </div>
      )}
      {active.map(t => <TaskItem key={t.id} task={t} />)}
    </div>
  )
}

function LabelView({ labelId }: { labelId: string }) {
  const { tasks, labels } = useStore()
  const label = labels.find(l => l.id === labelId)

  if (!label) return <EmptyState message="Label not found." />

  const active = tasks.filter(t => !t.completed && t.labelIds.includes(labelId)).sort((a, b) => a.order - b.order)
  const completed = tasks.filter(t => t.completed && t.labelIds.includes(labelId))

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight capitalize">{label.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">{active.length} task{active.length !== 1 ? 's' : ''}</p>
      </div>

      {active.length === 0 && <EmptyState message={`No tasks with #${label.name} yet.`} />}
      {active.map(t => <TaskItem key={t.id} task={t} />)}

      <InlineAddTask />

      {completed.length > 0 && (
        <>
          <div className="flex items-baseline gap-2 px-4 pt-5 pb-1.5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Completed</h2>
            <span className="text-xs text-gray-500 dark:text-gray-500">{completed.length}</span>
          </div>
          {completed.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}
