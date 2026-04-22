import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import QuickAdd from './components/QuickAdd'
import BoardView from './components/BoardView'
import CalendarView from './components/CalendarView'

export default function App() {
  const { view, darkMode, serifMode, setQuickAddOpen, selectedTaskId, loadData, setUserId, loading } = useStore()
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined) // undefined = still checking

  // Apply dark mode to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setAuthUser(user)
      if (user) loadData(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setAuthUser(user)
      if (user) loadData(user.id)
      else setUserId(null)
    })

    return () => subscription.unsubscribe()
  }, [loadData, setUserId])

  // Re-sync when tab becomes visible again (cross-device sync)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        const uid = useStore.getState().userId
        if (uid) loadData(uid)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [loadData])

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const editing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickAddOpen(true)
        return
      }
      if (e.key === 'q' && !editing && !e.metaKey && !e.ctrlKey) {
        setQuickAddOpen(true)
        return
      }
      if (e.key === 'Escape' && !editing) {
        useStore.getState().setSelectedTaskId(null)
        useStore.getState().setQuickAddOpen(false)
        return
      }
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

  // Still checking session
  if (authUser === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!authUser) return <Auth />

  const isListView = view === 'today' || view === 'upcoming' || view === 'all' || view === 'starred' || view === 'waiting' || (typeof view === 'string' && view.startsWith('label:'))

  // Loading data
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar />

      <main className={`flex-1 overflow-y-auto min-w-0 pb-14 md:pb-0 ${serifMode ? 'font-serif-mode' : ''}`}>
        {isListView && (
          <div className="max-w-2xl mx-auto pb-24">
            <TaskList view={view} />
          </div>
        )}
        {view === 'board' && <BoardView />}
        {view === 'calendar' && <CalendarView />}
      </main>

      {selectedTaskId && <TaskDetail />}
      <QuickAdd />
      <BottomNav />

      {/* Mobile FAB */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="md:hidden fixed right-4 z-40 rounded-full bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white shadow-lg flex items-center justify-center transition-colors"
        style={{ width: 52, height: 52, bottom: 'calc(68px + env(safe-area-inset-bottom))' }}
        aria-label="Add task"
      >
        <Plus size={24} />
      </button>

      <div className="fixed bottom-4 right-4 z-10 hidden lg:flex items-center gap-1.5 text-xs text-gray-300 dark:text-gray-700 pointer-events-none select-none">
        <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-600">Q</kbd>
        <span>or</span>
        <kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-600">⌘K</kbd>
        <span>to add</span>
      </div>
    </div>
  )
}
