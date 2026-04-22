import { useState } from 'react'
import {
  Sun, CalendarDays, List, LayoutGrid, MoreHorizontal,
  Star, Hourglass, Calendar, X, Moon, CaseUpper, Tag,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ViewType } from '../types'
import { dotColor } from './LabelChip'

export default function BottomNav() {
  const {
    view, setView, tasks, labels,
    darkMode, toggleDarkMode, serifMode, toggleSerifMode,
  } = useStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = tasks.filter(t => !t.completed && t.dueDate === today).length

  const mainNav: { id: ViewType; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'today', icon: <Sun size={22} />, label: 'Today', badge: todayCount || undefined },
    { id: 'upcoming', icon: <CalendarDays size={22} />, label: 'Upcoming' },
    { id: 'all', icon: <List size={22} />, label: 'All' },
    { id: 'board', icon: <LayoutGrid size={22} />, label: 'Board' },
  ]

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mainNav.map(item => (
          <button
            key={item.id}
            onClick={() => { setView(item.id); setMoreOpen(false) }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors
              ${view === item.id && !moreOpen
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-gray-500'
              }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-2 right-[calc(50%-16px)] min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-violet-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors
            ${moreOpen ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* More sheet backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet */}
      <div
        className={`fixed left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-t-2xl px-4 pt-4 transition-transform duration-200 ease-out
          ${moreOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: '16px',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">More views</span>
          <button onClick={() => setMoreOpen(false)} className="text-gray-400 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'starred' as ViewType, icon: <Star size={20} />, label: 'Starred', badge: tasks.filter(t => !t.completed && t.starred).length || undefined },
            { id: 'waiting' as ViewType, icon: <Hourglass size={20} />, label: 'Waiting', badge: tasks.filter(t => !t.completed && t.waiting).length || undefined },
            { id: 'calendar' as ViewType, icon: <Calendar size={20} />, label: 'Calendar' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setMoreOpen(false) }}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors relative
                ${view === item.id
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold bg-violet-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {labels.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag size={12} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Labels</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => { setView(`label:${label.id}` as ViewType); setMoreOpen(false) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
                    ${view === `label:${label.id}`
                      ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor[label.color] ?? 'bg-gray-400'}`} />
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={toggleDarkMode}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={toggleSerifMode}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors
              ${serifMode
                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
          >
            <CaseUpper size={16} />
            Serif
          </button>
        </div>
      </div>
    </>
  )
}
