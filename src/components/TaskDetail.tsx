import { useState, useEffect, useRef } from 'react'
import { X, Trash2, RotateCcw, Star, Plus, Calendar, Tag, Hourglass, Play, LayoutGrid } from 'lucide-react'
import { useStore, LABEL_COLORS } from '../store/useStore'
import LabelChip, { dotColor } from './LabelChip'
import type { RecurringPattern, RecurringConfig, TaskStatus } from '../types'

const RECURRING_OPTIONS: { value: RecurringPattern; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'monthly-nth-weekday', label: 'Monthly (nth)' },
]

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const NTH_OPTIONS: { value: RecurringConfig['nth']; label: string }[] = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
]

const DAY_OPTIONS: { value: RecurringConfig['weekday']; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const pillClass = (active: boolean) => `text-xs px-3 py-1 rounded-full border transition-colors
  ${active
    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
  }`

const sectionLabel = 'flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide'

// Invisible padding around small controls so they're easy to hit with a finger
const hitArea = "relative after:absolute after:content-['']"

export default function TaskDetail() {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    labels,
    updateTask,
    deleteTask,
    moveTaskStatus,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    addLabel,
  } = useStore()

  const task = tasks.find(t => t.id === selectedTaskId)
  const [newSubtask, setNewSubtask] = useState('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNewSubtask('')
    setShowLabelPicker(false)
  }, [selectedTaskId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedTaskId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedTaskId])

  // Move focus into the panel (not the title, so phones don't raise the keyboard), and back out on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })
    return () => previous?.focus?.({ preventScroll: true })
  }, [])

  if (!task) return null

  const taskLabels = labels.filter(l => task.labelIds.includes(l.id))
  const availableLabels = labels.filter(l => !task.labelIds.includes(l.id))
  const canHover = window.matchMedia('(hover: hover)').matches

  function handleAddSubtask() {
    if (!newSubtask.trim()) return
    addSubtask(task!.id, newSubtask.trim())
    setNewSubtask('')
  }

  function handleAddNewLabel() {
    if (!newLabelName.trim()) return
    const id = addLabel(newLabelName.trim(), newLabelColor)
    updateTask(task!.id, { labelIds: [...task!.labelIds, id] })
    setNewLabelName('')
    setNewLabelColor('blue')
    setShowLabelPicker(false)
  }

  function onDragStart(e: React.TouchEvent) {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    dragStartY.current = e.touches[0].clientY
    setDragging(true)
  }

  function onDragMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current))
  }

  function onDragEnd() {
    if (dragStartY.current === null) return
    dragStartY.current = null
    setDragging(false)
    if (dragY > 80) setSelectedTaskId(null)
    else setDragY(0)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/10 dark:bg-black/30"
        onClick={() => setSelectedTaskId(null)}
      />

      {/* Panel — right sheet on desktop, bottom sheet on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        tabIndex={-1}
        style={{ translate: dragY ? `0 ${dragY}px` : undefined, transition: dragging ? 'none' : 'translate 0.2s ease-out' }}
        className="task-detail-panel fixed z-30 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden focus:outline-none
          bottom-[calc(60px_+_env(safe-area-inset-bottom))] left-0 right-0 max-h-[85dvh] rounded-t-2xl border-t border-gray-100 dark:border-gray-800
          md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:w-96 md:max-h-none md:rounded-none md:border-t-0 md:border-l"
      >
        {/* Drag handle + header: swipe down to close on phones */}
        <div
          className="flex-shrink-0 touch-none md:touch-auto"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          onTouchCancel={onDragEnd}
        >
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => updateTask(task.id, { starred: !task.starred })}
              className={`${hitArea} after:-inset-2.5 p-1 rounded-lg transition-colors ${task.starred ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-400'}`}
              aria-label={task.starred ? 'Unstar task' : 'Star task'}
              aria-pressed={task.starred}
            >
              <Star size={16} className={task.starred ? 'fill-yellow-400' : ''} />
            </button>
            <button
              onClick={() => setSelectedTaskId(null)}
              className={`${hitArea} after:-inset-2.5 p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors`}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title */}
          <div>
            <textarea
              value={task.title}
              onChange={e => updateTask(task.id, { title: e.target.value })}
              rows={2}
              aria-label="Task title"
              className="w-full text-lg font-semibold text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 leading-snug"
              placeholder="Task title"
            />
          </div>

          {/* Notes */}
          <div>
            <textarea
              value={task.notes}
              onChange={e => updateTask(task.id, { notes: e.target.value })}
              rows={4}
              aria-label="Notes"
              className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
              placeholder="Add notes…"
            />
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <label htmlFor="task-start-date" className={sectionLabel}>
              <Play size={12} /> Start date
            </label>
            <input
              id="task-start-date"
              type="date"
              value={task.startDate ?? ''}
              max={task.dueDate}
              onChange={e => updateTask(task.id, { startDate: e.target.value || undefined })}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500">Shows in Today from this day until it's done.</p>
          </div>

          {/* Due date & time */}
          <div className="space-y-2">
            <label htmlFor="task-due-date" className={sectionLabel}>
              <Calendar size={12} /> Due date
            </label>
            <div className="flex gap-2">
              <input
                id="task-due-date"
                type="date"
                value={task.dueDate ?? ''}
                onChange={e => updateTask(task.id, { dueDate: e.target.value || undefined })}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
              />
              <input
                type="time"
                value={task.dueTime ?? ''}
                onChange={e => updateTask(task.id, { dueTime: e.target.value || undefined })}
                aria-label="Due time"
                className="w-28 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <span className={sectionLabel}>
              <RotateCcw size={12} /> Repeat
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateTask(task.id, { recurring: undefined })}
                className={pillClass(!task.recurring)}
                aria-pressed={!task.recurring}
              >
                None
              </button>
              {RECURRING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateTask(task.id, {
                    recurring: opt.value === 'monthly-nth-weekday'
                      ? { pattern: 'monthly-nth-weekday', nth: task.recurring?.nth ?? 1, weekday: task.recurring?.weekday ?? 0 }
                      : { pattern: opt.value }
                  })}
                  className={pillClass(task.recurring?.pattern === opt.value)}
                  aria-pressed={task.recurring?.pattern === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {task.recurring?.pattern === 'monthly-nth-weekday' && (
              <div className="flex gap-2 mt-1">
                <select
                  value={task.recurring.nth ?? 1}
                  onChange={e => updateTask(task.id, { recurring: { ...task.recurring!, nth: Number(e.target.value) as RecurringConfig['nth'] } })}
                  aria-label="Which week of the month"
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {NTH_OPTIONS.map(o => <option key={o.value} value={o.value!}>{o.label}</option>)}
                </select>
                <select
                  value={task.recurring.weekday ?? 0}
                  onChange={e => updateTask(task.id, { recurring: { ...task.recurring!, weekday: Number(e.target.value) as RecurringConfig['weekday'] } })}
                  aria-label="Day of the week"
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {DAY_OPTIONS.map(o => <option key={o.value} value={o.value!}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <span className={sectionLabel}>
              <LayoutGrid size={12} /> Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => moveTaskStatus(task.id, opt.value)}
                  className={pillClass(task.status === opt.value)}
                  aria-pressed={task.status === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <span className={sectionLabel}>
              <Tag size={12} /> Labels
            </span>
            <div className="flex flex-wrap gap-1.5">
              {taskLabels.map(l => (
                <LabelChip
                  key={l.id}
                  label={l}
                  onRemove={() => updateTask(task.id, { labelIds: task.labelIds.filter(id => id !== l.id) })}
                />
              ))}
              <button
                onClick={() => setShowLabelPicker(v => !v)}
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-500 hover:text-gray-700 transition-colors"
                aria-expanded={showLabelPicker}
              >
                + Add
              </button>
            </div>

            {showLabelPicker && (
              <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                {availableLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableLabels.map(l => (
                      <button
                        key={l.id}
                        onClick={() => {
                          updateTask(task.id, { labelIds: [...task.labelIds, l.id] })
                          setShowLabelPicker(false)
                        }}
                      >
                        <LabelChip label={l} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-1 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create new label</p>
                  <input
                    autoFocus={canHover}
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddNewLabel() }}
                    placeholder="Label name"
                    aria-label="New label name"
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <div className="flex gap-4 flex-wrap py-1">
                    {LABEL_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewLabelColor(c)}
                        className={`${hitArea} after:-inset-y-3 after:-inset-x-2 w-4 h-4 rounded-full ${dotColor[c]} ${newLabelColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        aria-label={`${c} color`}
                        aria-pressed={newLabelColor === c}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddNewLabel}
                    className="text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg px-3 py-1 font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Waiting */}
          <div className="space-y-2">
            <span className={sectionLabel}>
              <Hourglass size={12} /> Waiting
            </span>
            <button
              onClick={() => updateTask(task.id, { waiting: !task.waiting, waitingOn: !task.waiting ? task.waitingOn : undefined })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                ${task.waiting
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-medium'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                }`}
              aria-pressed={!!task.waiting}
            >
              {task.waiting ? 'Waiting on someone' : 'Mark as waiting'}
            </button>
            {task.waiting && (
              <input
                value={task.waitingOn ?? ''}
                onChange={e => updateTask(task.id, { waitingOn: e.target.value || undefined })}
                placeholder="Who or what are you waiting on?"
                aria-label="Waiting on"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
              />
            )}
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <span className={sectionLabel}>
              Subtasks
            </span>

            <div className="space-y-1">
              {task.subtasks
                .slice()
                .sort((a, b) => a.order - b.order)
                .map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 group py-1 [@media(hover:none)]:py-1.5">
                    <button
                      onClick={() => toggleSubtask(task.id, sub.id)}
                      className={`${hitArea} after:-inset-3 flex-shrink-0 w-4 h-4 rounded border-2 transition-all flex items-center justify-center
                        ${sub.completed
                          ? 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
                          : 'border-gray-400 dark:border-gray-500 hover:border-gray-600'
                        }`}
                      aria-label={sub.completed ? `Mark "${sub.title}" not done` : `Mark "${sub.title}" done`}
                      aria-pressed={sub.completed}
                    >
                      {sub.completed && (
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                          <path d="M1 2.5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <input
                      value={sub.title}
                      onChange={e => updateSubtask(task.id, sub.id, { title: e.target.value })}
                      aria-label="Subtask"
                      className={`flex-1 text-sm bg-transparent focus:outline-none ${sub.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}
                    />
                    <button
                      onClick={() => deleteSubtask(task.id, sub.id)}
                      className={`${hitArea} after:-inset-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 text-gray-500 hover:text-red-500 transition-all`}
                      aria-label={`Delete subtask "${sub.title}"`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <Plus size={13} className="text-gray-500 flex-shrink-0" />
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
                placeholder="Add subtask…"
                aria-label="Add subtask"
                className="flex-1 text-sm bg-transparent text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Delete — kept well away from Close */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => deleteTask(task.id)}
              className="flex items-center gap-2 min-h-[40px] -mx-2 px-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={15} />
              Delete task
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-500">
          Created {new Date(task.createdAt).toLocaleDateString()}
          {task.updatedAt !== task.createdAt && ` · Updated ${new Date(task.updatedAt).toLocaleDateString()}`}
        </div>
      </div>
    </>
  )
}
