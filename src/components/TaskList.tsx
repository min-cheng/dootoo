import { useStore } from '../store/useStore'
import type { ViewType } from '../types'
import TaskItem from './TaskItem'
import InlineAddTask from './InlineAddTask'
import { todayStr, getUpcomingDays, getDayLabel, isOverdue } from '../utils/date'
import { format } from 'date-fns'

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
        <span className="text-xs text-gray-400 dark:text-gray-600">{count}</span>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
      {message}
    </div>
  )
}

function TodayView() {
  const { tasks } = useStore()
  const today = todayStr()

  const overdue = tasks.filter(t => !t.completed && t.dueDate && isOverdue(t.dueDate) && t.dueDate !== today)
    .sort((a, b) => a.order - b.order)
  const todayTasks = tasks.filter(t => !t.completed && t.dueDate === today)
    .sort((a, b) => a.order - b.order)
  const completed = tasks.filter(t => t.completed && t.completedAt && t.completedAt.slice(0, 10) === today)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  const dayName = format(new Date(), 'EEEE')
  const dateLabel = format(new Date(), 'MMM d')

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-8 pb-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{dayName}</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">{dateLabel}</p>
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

  const withDate = tasks.filter(t => !t.completed && t.dueDate)
  const noDate = tasks.filter(t => !t.completed && !t.dueDate)

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Upcoming</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Next 2 weeks</p>
      </div>

      {days.map(day => {
        const dayTasks = withDate.filter(t => t.dueDate === day).sort((a, b) => a.order - b.order)
        return (
          <div key={day}>
            <SectionHeader title={getDayLabel(day)} />
            {dayTasks.length === 0
              ? <div className="px-4 py-1 text-xs text-gray-300 dark:text-gray-700 italic">No tasks</div>
              : dayTasks.map(t => <TaskItem key={t.id} task={t} />)
            }
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

  const active = tasks.filter(t => !t.completed).sort((a, b) => a.order - b.order)
  const completed = tasks.filter(t => t.completed).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">All Tasks</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{active.length} remaining</p>
      </div>

      {active.length === 0 && <EmptyState message="All done! Nothing left to do." />}
      {active.map(t => <TaskItem key={t.id} task={t} />)}

      <InlineAddTask />

      {completed.length > 0 && (
        <>
          <SectionHeader title="Completed" count={completed.length} />
          {completed.slice(0, 20).map(t => <TaskItem key={t.id} task={t} />)}
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          {active.length > 0 ? `${active.length} starred task${active.length !== 1 ? 's' : ''}` : 'Your important tasks'}
        </p>
      </div>

      {active.length === 0 && (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl">☆</span>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No starred tasks yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xs">
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Tasks blocked on others</p>
      </div>

      {active.length === 0 && (
        <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
          <span className="text-3xl">&#9203;</span>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nothing waiting</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xs">
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{active.length} task{active.length !== 1 ? 's' : ''}</p>
      </div>

      {active.length === 0 && <EmptyState message={`No tasks with #${label.name} yet.`} />}
      {active.map(t => <TaskItem key={t.id} task={t} />)}

      <InlineAddTask />

      {completed.length > 0 && (
        <>
          <div className="flex items-baseline gap-2 px-4 pt-5 pb-1.5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Completed</h2>
            <span className="text-xs text-gray-400">{completed.length}</span>
          </div>
          {completed.map(t => <TaskItem key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}
