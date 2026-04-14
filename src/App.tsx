import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import QuickAdd from './components/QuickAdd'
import BoardView from './components/BoardView'
import CalendarView from './components/CalendarView'

export default function App() {
  const { view, darkMode, serifMode, setQuickAddOpen, selectedTaskId } = useStore()

  // Apply dark/serif mode classes to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      // ⌘K or Q → quick add
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickAddOpen(true)
        return
      }
      if (e.key === 'q' && !editing && !e.metaKey && !e.ctrlKey) {
        setQuickAddOpen(true)
        return
      }

      // Escape → close detail / deselect
      if (e.key === 'Escape' && !editing) {
        useStore.getState().setSelectedTaskId(null)
        useStore.getState().setQuickAddOpen(false)
        return
      }

      // 1/2/3/4/5 → switch views (not in input)
      if (!editing && !e.metaKey && !e.ctrlKey) {
        if (e.key === '1') useStore.getState().setView('today')
        if (e.key === '2') useStore.getState().setView('upcoming')
        if (e.key === '3') useStore.getState().setView('all')
        if (e.key === '4') useStore.getState().setView('board')
        if (e.key === '5') useStore.getState().setView('calendar')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setQuickAddOpen])

  const isListView = view === 'today' || view === 'upcoming' || view === 'all' || view === 'starred' || (typeof view === 'string' && view.startsWith('label:'))

  return (
    <div className="h-full flex bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto min-w-0 ${serifMode ? 'font-serif-mode' : ''}`}>
        {isListView && (
          <div className="max-w-2xl mx-auto pb-24">
            <TaskList view={view} />
          </div>
        )}
        {view === 'board' && <BoardView />}
        {view === 'calendar' && <CalendarView />}
      </main>

      {/* Task detail panel */}
      {selectedTaskId && <TaskDetail />}

      {/* Quick add modal */}
      <QuickAdd />

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-4 right-4 z-10 hidden lg:flex items-center gap-1.5 text-xs text-gray-300 dark:text-gray-700 pointer-events-none select-none">
        <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-600">Q</kbd>
        <span>or</span>
        <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-600">⌘K</kbd>
        <span>to add</span>
      </div>
    </div>
  )
}
