import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const UNDO_MS = 6000

function Toast({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  return (
    <div className="pointer-events-auto w-full flex items-center justify-between gap-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg px-4 py-2.5 text-sm">
      <span>{message}</span>
      <button
        onClick={onAction}
        className="font-semibold text-violet-300 dark:text-violet-700 hover:underline px-2 py-1.5 -mr-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        {action}
      </button>
    </div>
  )
}

export default function Toasts() {
  const { lastDeleted, undoDelete, dismissUndo, saveError, retrySaves } = useStore()
  const deletedAt = lastDeleted?.at

  useEffect(() => {
    if (deletedAt === undefined) return
    const timer = setTimeout(() => {
      if (useStore.getState().lastDeleted?.at === deletedAt) dismissUndo()
    }, UNDO_MS)
    return () => clearTimeout(timer)
  }, [deletedAt, dismissUndo])

  // z-34: above the task sheet (30), below the phone More menu (35) so it never covers its buttons
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[34] w-[calc(100%-32px)] max-w-sm flex flex-col items-center gap-2 pointer-events-none bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6"
    >
      {saveError && <Toast message="Some changes didn't save." action="Retry" onAction={retrySaves} />}
      {lastDeleted && <Toast key={lastDeleted.at} message="Task deleted" action="Undo" onAction={undoDelete} />}
    </div>
  )
}
