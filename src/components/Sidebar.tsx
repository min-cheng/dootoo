import { useState } from 'react'
import {
  Sun, Calendar, CalendarDays, LayoutGrid, List, Moon, Plus, ChevronDown, ChevronRight, Star, Pencil, Trash2, Check, X, CaseUpper,
} from 'lucide-react'
import { useStore, LABEL_COLORS } from '../store/useStore'
import type { ViewType, Label } from '../types'
import { dotColor } from './LabelChip'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  count?: number
  onClick: () => void
}

function NavItem({ icon, label, active, count, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all text-left
        ${active
          ? 'bg-gray-900 text-white font-medium dark:bg-white dark:text-gray-900'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-gray-200'
        }`}
    >
      <span className={active ? 'opacity-90' : 'opacity-70'}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs tabular-nums ${active ? 'opacity-60' : 'text-gray-400 dark:text-gray-500'}`}>{count}</span>
      )}
    </button>
  )
}

export default function Sidebar() {
  const { view, setView, labels, addLabel, updateLabel, deleteLabel, darkMode, toggleDarkMode, serifMode, toggleSerifMode, tasks } = useStore()
  const [labelsExpanded, setLabelsExpanded] = useState(true)
  const [addingLabel, setAddingLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('blue')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('blue')

  function startEdit(label: Label, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  function saveEdit() {
    if (editingId && editName.trim()) {
      updateLabel(editingId, { name: editName.trim(), color: editColor })
    }
    setEditingId(null)
  }

  function handleDeleteLabel(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    deleteLabel(id)
    if (view === `label:${id}`) setView('today')
  }

  const today = new Date().toISOString().slice(0, 10)

  const todayCount = tasks.filter(t => !t.completed && t.dueDate === today).length
  const allCount = tasks.filter(t => !t.completed).length

  const labelCount = (id: string) => tasks.filter(t => !t.completed && t.labelIds.includes(id)).length

  function handleAddLabel() {
    if (!newLabelName.trim()) return
    addLabel(newLabelName.trim(), newLabelColor)
    setNewLabelName('')
    setNewLabelColor('blue')
    setAddingLabel(false)
  }

  return (
    <aside className="w-56 flex-shrink-0 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 py-4 px-3 overflow-y-auto no-scrollbar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <svg viewBox="0 0 48 46" width="20" height="20" fill="none" className="flex-shrink-0">
          <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" />
        </svg>
        <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">dootoo</span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5">
        <NavItem
          icon={<Sun size={15} />}
          label="Today"
          active={view === 'today'}
          count={todayCount}
          onClick={() => setView('today')}
        />
        <NavItem
          icon={<CalendarDays size={15} />}
          label="Upcoming"
          active={view === 'upcoming'}
          onClick={() => setView('upcoming')}
        />
        <NavItem
          icon={<List size={15} />}
          label="All Tasks"
          active={view === 'all'}
          count={allCount}
          onClick={() => setView('all')}
        />
        <NavItem
          icon={<Star size={15} />}
          label="Starred"
          active={view === 'starred'}
          count={tasks.filter(t => !t.completed && t.starred).length || undefined}
          onClick={() => setView('starred')}
        />
      </nav>

      <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

      {/* Views */}
      <div className="flex flex-col gap-0.5">
        <NavItem
          icon={<LayoutGrid size={15} />}
          label="Board"
          active={view === 'board'}
          onClick={() => setView('board')}
        />
        <NavItem
          icon={<Calendar size={15} />}
          label="Calendar"
          active={view === 'calendar'}
          onClick={() => setView('calendar')}
        />
      </div>

      <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

      {/* Labels */}
      <div>
        <button
          className="w-full flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors mb-1"
          onClick={() => setLabelsExpanded(v => !v)}
        >
          {labelsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          LABELS
        </button>

        {labelsExpanded && (
          <div className="flex flex-col gap-0.5">
            {labels.map(label => (
              <div key={label.id}>
                {editingId === label.id ? (
                  <div className="px-3 py-1.5 flex flex-col gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {LABEL_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full ${dotColor[c]} ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md py-1 font-medium"
                      >
                        <Check size={11} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md py-1 text-gray-500"
                      >
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <button
                      onClick={() => setView(`label:${label.id}` as ViewType)}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left
                        ${view === `label:${label.id}`
                          ? 'text-gray-900 font-medium dark:text-white'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor[label.color] ?? 'bg-gray-400'}`} />
                      <span className="flex-1 truncate">{label.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums group-hover:hidden">
                        {labelCount(label.id) > 0 ? labelCount(label.id) : ''}
                      </span>
                    </button>
                    {/* Edit / delete — visible on hover */}
                    <div className="absolute right-2 hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={e => startEdit(label, e)}
                        className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                        title="Rename"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={e => handleDeleteLabel(label.id, e)}
                        className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                        title="Delete label"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addingLabel ? (
              <div className="px-3 py-1.5 flex flex-col gap-2">
                <input
                  autoFocus
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddLabel()
                    if (e.key === 'Escape') setAddingLabel(false)
                  }}
                  placeholder="Label name"
                  className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <div className="flex gap-1 flex-wrap">
                  {LABEL_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewLabelColor(c)}
                      className={`w-4 h-4 rounded-full ${dotColor[c]} ${newLabelColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleAddLabel}
                    className="flex-1 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md py-1 font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingLabel(false)}
                    className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md py-1 text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingLabel(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <Plus size={12} />
                New label
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Serif mode toggle */}
      <button
        onClick={toggleSerifMode}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors
          ${serifMode
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
      >
        <CaseUpper size={15} />
        Serif
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        {darkMode ? 'Light mode' : 'Dark mode'}
      </button>
    </aside>
  )
}
