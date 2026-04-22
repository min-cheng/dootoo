import { useState, useEffect, useRef } from 'react'
import { X, Trash2, RotateCcw, Star, Plus, Calendar, Tag, Hourglass } from 'lucide-react'
import { useStore, LABEL_COLORS } from '../store/useStore'
import LabelChip, { dotColor } from './LabelChip'
import type { RecurringPattern, RecurringConfig } from '../types'

const RECURRING_OPTIONS: { value: RecurringPattern; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'monthly-nth-weekday', label: 'Monthly (nth)' },
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

export default function TaskDetail() {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    labels,
    updateTask,
    deleteTask,
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

  if (!task) return null

  const taskLabels = labels.filter(l => task.labelIds.includes(l.id))
  const availableLabels = labels.filter(l => !task.labelIds.includes(l.id))

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
        className="task-detail-panel fixed z-30 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden
          bottom-14 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t border-gray-100 dark:border-gray-800
          md:inset-y-0 md:right-0 md:left-auto md:bottom-0 md:w-96 md:max-h-none md:rounded-none md:border-t-0 md:border-l"
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => updateTask(task.id, { starred: !task.starred })}
            className={`p-1 rounded-lg transition-colors ${task.starred ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'}`}
          >
            <Star size={16} className={task.starred ? 'fill-yellow-400' : ''} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { deleteTask(task.id) }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Delete task"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <X size={15} />
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
              className="w-full text-lg font-semibold text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-700 leading-snug"
              placeholder="Task title"
            />
          </div>

          {/* Notes */}
          <div>
            <textarea
              value={task.notes}
              onChange={e => updateTask(task.id, { notes: e.target.value })}
              rows={4}
              className="w-full text-sm text-gray-600 dark:text-gray-400 bg-transparent resize-none focus:outline-none placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed"
              placeholder="Add notes…"
            />
          </div>

          {/* Due date & time */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              <Calendar size={12} /> Due date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={e => updateTask(task.id, { dueDate: e.target.value || undefined })}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
              />
              <input
                type="time"
                value={task.dueTime ?? ''}
                onChange={e => updateTask(task.id, { dueTime: e.target.value || undefined })}
                className="w-28 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              <RotateCcw size={12} /> Repeat
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateTask(task.id, { recurring: undefined })}
                className={`text-xs px-3 py-1 rounded-full border transition-colors
                  ${!task.recurring
                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                  }`}
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
                  className={`text-xs px-3 py-1 rounded-full border transition-colors
                    ${task.recurring?.pattern === opt.value
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                    }`}
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
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {NTH_OPTIONS.map(o => <option key={o.value} value={o.value!}>{o.label}</option>)}
                </select>
                <select
                  value={task.recurring.weekday ?? 0}
                  onChange={e => updateTask(task.id, { recurring: { ...task.recurring!, weekday: Number(e.target.value) as RecurringConfig['weekday'] } })}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {DAY_OPTIONS.map(o => <option key={o.value} value={o.value!}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              <Tag size={12} /> Labels
            </label>
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
                className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-500 hover:text-gray-600 transition-colors"
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
                  <p className="text-xs text-gray-400">Create new label</p>
                  <input
                    autoFocus
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddNewLabel() }}
                    placeholder="Label name"
                    className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {LABEL_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewLabelColor(c)}
                        className={`w-4 h-4 rounded-full ${dotColor[c]} ${newLabelColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
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
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              <Hourglass size={12} /> Waiting
            </label>
            <button
              onClick={() => updateTask(task.id, { waiting: !task.waiting, waitingOn: !task.waiting ? task.waitingOn : undefined })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                ${task.waiting
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-medium'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                }`}
            >
              {task.waiting ? 'Waiting on someone' : 'Mark as waiting'}
            </button>
            {task.waiting && (
              <input
                value={task.waitingOn ?? ''}
                onChange={e => updateTask(task.id, { waitingOn: e.target.value || undefined })}
                placeholder="Who or what are you waiting on?"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
              />
            )}
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Subtasks
            </label>

            <div className="space-y-1">
              {task.subtasks
                .slice()
                .sort((a, b) => a.order - b.order)
                .map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 group py-1">
                    <button
                      onClick={() => toggleSubtask(task.id, sub.id)}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 transition-all flex items-center justify-center
                        ${sub.completed
                          ? 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-500'
                        }`}
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
                      className={`flex-1 text-sm bg-transparent focus:outline-none ${sub.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}
                    />
                    <button
                      onClick={() => deleteSubtask(task.id, sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <Plus size={13} className="text-gray-400 flex-shrink-0" />
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask() }}
                placeholder="Add subtask…"
                className="flex-1 text-sm bg-transparent text-gray-600 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-600">
          Created {new Date(task.createdAt).toLocaleDateString()}
          {task.updatedAt !== task.createdAt && ` · Updated ${new Date(task.updatedAt).toLocaleDateString()}`}
        </div>
      </div>
    </>
  )
}
