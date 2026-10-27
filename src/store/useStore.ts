import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, Label, ViewType, Subtask } from '../types'
import { todayStr, shiftDate, daysBetween, firstOccurrence, nextOccurrenceAfter, withMonthlyAnchor } from '../utils/date'

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// --- DB mappers ---
function taskToRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    notes: task.notes,
    completed: task.completed,
    completed_at: task.completedAt ?? null,
    start_date: task.startDate ?? null,
    due_date: task.dueDate ?? null,
    due_time: task.dueTime ?? null,
    label_ids: task.labelIds,
    subtasks: task.subtasks,
    recurring: task.recurring ?? null,
    status: task.status,
    starred: task.starred,
    waiting: task.waiting ?? false,
    waiting_on: task.waitingOn ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    order: task.order,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title ?? '',
    notes: row.notes ?? '',
    completed: row.completed ?? false,
    completedAt: row.completed_at ?? undefined,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    dueTime: row.due_time ?? undefined,
    labelIds: row.label_ids ?? [],
    subtasks: row.subtasks ?? [],
    recurring: row.recurring ?? undefined,
    status: row.status ?? 'todo',
    starred: row.starred ?? false,
    waiting: row.waiting ?? false,
    waitingOn: row.waiting_on ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    order: row.order ?? 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLabel(row: any): Label {
  return { id: row.id, name: row.name, color: row.color }
}

// --- Sync helpers ---
// Ids whose last save failed (retried later) and ids with a save still on its way, so a
// background refresh doesn't overwrite local changes the server hasn't seen yet.
const failed = { tasks: new Set<string>(), labels: new Set<string>(), taskDeletes: new Set<string>(), labelDeletes: new Set<string>() }
const inFlight = { tasks: new Map<string, number>(), labels: new Map<string, number>(), deletes: new Set<string>() }

function refreshSaveError() {
  const hasFailures = Object.values(failed).some(s => s.size > 0)
  if (useStore.getState().saveError !== hasFailures) useStore.setState({ saveError: hasFailures })
}

function clearSyncState() {
  Object.values(failed).forEach(s => s.clear())
  inFlight.tasks.clear()
  inFlight.labels.clear()
  inFlight.deletes.clear()
}

async function trackedUpsert(kind: 'tasks' | 'labels', id: string, write: () => PromiseLike<{ error: unknown }>) {
  inFlight[kind].set(id, (inFlight[kind].get(id) ?? 0) + 1)
  let ok = false
  try {
    const { error } = await write()
    if (error) console.error(`[dootoo] ${kind} sync failed:`, error)
    ok = !error
  } catch (err) {
    console.error(`[dootoo] ${kind} sync failed:`, err)
  } finally {
    const n = (inFlight[kind].get(id) ?? 1) - 1
    if (n > 0) inFlight[kind].set(id, n)
    else inFlight[kind].delete(id)
  }
  if (ok) failed[kind].delete(id)
  else failed[kind].add(id)
  refreshSaveError()
}

function syncTask(task: Task, userId: string) {
  return trackedUpsert('tasks', task.id, () => supabase.from('tasks').upsert(taskToRow(task, userId)))
}
function syncLabel(label: Label, userId: string) {
  return trackedUpsert('labels', label.id, () => supabase.from('labels').upsert({ ...label, user_id: userId }))
}

async function deleteRow(table: 'tasks' | 'labels', id: string) {
  const failures = table === 'tasks' ? failed.taskDeletes : failed.labelDeletes
  inFlight.deletes.add(id)
  let ok = false
  try {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`[dootoo] ${table} delete failed:`, error)
    ok = !error
  } catch (err) {
    console.error(`[dootoo] ${table} delete failed:`, err)
  } finally {
    inFlight.deletes.delete(id)
  }
  if (ok) failures.delete(id)
  else failures.add(id)
  refreshSaveError()
}

// --- UI prefs (per-device, stay in localStorage) ---
function loadPrefs() {
  try {
    const raw = localStorage.getItem('dootoo-prefs')
    if (raw) {
      const prefs = JSON.parse(raw) as { darkMode: boolean; serifMode: boolean; view: ViewType }
      if (prefs.view === 'about') prefs.view = 'today'
      return prefs
    }
  } catch { /* ignore */ }
  return { darkMode: false, serifMode: false, view: 'today' as ViewType }
}
function savePrefs(prefs: { darkMode: boolean; serifMode: boolean; view: ViewType }) {
  localStorage.setItem('dootoo-prefs', JSON.stringify(prefs))
}

interface AppState {
  tasks: Task[]
  labels: Label[]
  view: ViewType
  darkMode: boolean
  serifMode: boolean
  selectedTaskId: string | null
  quickAddOpen: boolean
  userId: string | null
  loading: boolean
  lastDeleted: { task: Task; at: number } | null
  saveError: boolean

  // Data lifecycle
  loadData: (userId: string) => Promise<void>
  setUserId: (id: string | null) => void
  signOut: () => Promise<void>
  retrySaves: () => void
  undoDelete: () => void
  dismissUndo: () => void

  // Task actions
  addTask: (partial: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>>) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  reorderTasks: (orderedIds: string[]) => void
  moveTaskStatus: (id: string, status: Task['status']) => void

  // Subtask actions
  addSubtask: (taskId: string, title: string) => void
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void
  deleteSubtask: (taskId: string, subtaskId: string) => void
  toggleSubtask: (taskId: string, subtaskId: string) => void

  // Label actions
  addLabel: (name: string, color: string) => string
  updateLabel: (id: string, updates: Partial<Label>) => void
  deleteLabel: (id: string) => void

  // UI
  setView: (view: ViewType) => void
  toggleDarkMode: () => void
  toggleSerifMode: () => void
  setSelectedTaskId: (id: string | null) => void
  setQuickAddOpen: (open: boolean) => void
}

export const LABEL_COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'pink', 'yellow', 'teal']

const prefs = loadPrefs()

export const useStore = create<AppState>()((set, get) => ({
  tasks: [],
  labels: [],
  view: prefs.view,
  darkMode: prefs.darkMode,
  serifMode: prefs.serifMode,
  selectedTaskId: null,
  quickAddOpen: false,
  userId: null,
  loading: true,
  lastDeleted: null,
  saveError: false,

  setUserId: (id) => {
    if (id) {
      set({ userId: id })
      return
    }
    clearSyncState()
    set({ userId: null, tasks: [], labels: [], selectedTaskId: null, lastDeleted: null, saveError: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    clearSyncState()
    set({ tasks: [], labels: [], userId: null, selectedTaskId: null, lastDeleted: null, saveError: false })
  },

  retrySaves: () => {
    const { userId, tasks, labels } = get()
    if (!userId) return
    for (const id of [...failed.tasks]) {
      const task = tasks.find(t => t.id === id)
      if (task) syncTask(task, userId)
      else failed.tasks.delete(id)
    }
    for (const id of [...failed.labels]) {
      const label = labels.find(l => l.id === id)
      if (label) syncLabel(label, userId)
      else failed.labels.delete(id)
    }
    for (const id of [...failed.taskDeletes]) deleteRow('tasks', id)
    for (const id of [...failed.labelDeletes]) deleteRow('labels', id)
    refreshSaveError()
  },

  undoDelete: () => {
    const { lastDeleted, userId } = get()
    if (!lastDeleted) return
    const { task } = lastDeleted
    failed.taskDeletes.delete(task.id)
    set(s => ({
      tasks: s.tasks.some(t => t.id === task.id) ? s.tasks : [...s.tasks, task],
      lastDeleted: null,
    }))
    if (userId) syncTask(task, userId)
    refreshSaveError()
  },

  dismissUndo: () => set({ lastDeleted: null }),

  loadData: async (userId) => {
    // Only the first load for an account shows the spinner; coming back to the tab refreshes quietly
    const firstLoad = get().userId !== userId
    if (firstLoad) set({ loading: true })
    const [tasksRes, labelsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('order'),
      supabase.from('labels').select('*').eq('user_id', userId),
    ])

    // A failed refresh (e.g. offline) keeps what's on screen instead of emptying it
    if (!firstLoad && (tasksRes.error || labelsRes.error)) return

    let tasks = (tasksRes.data ?? []).map(rowToTask)
    let labels = (labelsRes.data ?? []).map(rowToLabel)

    if (firstLoad && tasks.length === 0 && labels.length === 0) {
      // One-time import from the pre-login version, which kept everything in this browser
      try {
        const raw = localStorage.getItem('dootoo-store')
        if (raw) {
          const stored = JSON.parse(raw)
          const oldTasks: Task[] = stored?.state?.tasks ?? []
          const oldLabels: Label[] = stored?.state?.labels ?? []
          if (oldTasks.length > 0 || oldLabels.length > 0) {
            await Promise.all([
              supabase.from('tasks').upsert(oldTasks.map(t => taskToRow(t, userId))),
              supabase.from('labels').upsert(oldLabels.map(l => ({ ...l, user_id: userId }))),
            ])
            localStorage.removeItem('dootoo-store')
            set({ tasks: oldTasks, labels: oldLabels, loading: false, userId })
            return
          }
        }
      } catch { /* ignore migration errors */ }
    } else if (tasks.length > 0 || labels.length > 0) {
      // This account already has data, so the old browser copy must never be imported into another account
      try { localStorage.removeItem('dootoo-store') } catch { /* ignore */ }
    }

    if (!firstLoad) {
      const local = get()
      const keepTask = (id: string) => failed.tasks.has(id) || inFlight.tasks.has(id)
      const keepLabel = (id: string) => failed.labels.has(id) || inFlight.labels.has(id)
      const deleted = (id: string) => inFlight.deletes.has(id) || failed.taskDeletes.has(id) || failed.labelDeletes.has(id)

      const serverTaskIds = new Set(tasks.map(t => t.id))
      tasks = tasks
        .filter(t => !deleted(t.id))
        .map(t => (keepTask(t.id) ? local.tasks.find(l => l.id === t.id) ?? t : t))
      tasks.push(...local.tasks.filter(t => !serverTaskIds.has(t.id) && keepTask(t.id)))

      const serverLabelIds = new Set(labels.map(l => l.id))
      labels = labels
        .filter(l => !deleted(l.id))
        .map(l => (keepLabel(l.id) ? local.labels.find(x => x.id === l.id) ?? l : l))
      labels.push(...local.labels.filter(l => !serverLabelIds.has(l.id) && keepLabel(l.id)))
    }

    set({ tasks, labels, loading: false, userId })
  },

  addTask: (partial) => {
    const id = uuid()
    const { tasks, userId } = get()
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order)) : -1
    const task: Task = {
      id,
      title: partial.title ?? 'Untitled',
      notes: partial.notes ?? '',
      completed: partial.completed ?? false,
      startDate: partial.startDate,
      // A repeating task typed without a date ("take vitamins every day") starts now
      dueDate: partial.dueDate ?? (partial.recurring && !partial.startDate ? firstOccurrence(partial.recurring, todayStr()) : undefined),
      dueTime: partial.dueTime,
      labelIds: partial.labelIds ?? [],
      subtasks: partial.subtasks ?? [],
      recurring: partial.recurring,
      status: partial.status ?? 'todo',
      starred: partial.starred ?? false,
      waiting: partial.waiting ?? false,
      waitingOn: partial.waitingOn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: maxOrder + 1,
    }
    set(s => ({ tasks: [...s.tasks, task] }))
    if (userId) syncTask(task, userId)
    return id
  },

  updateTask: (id, updates) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === id)
      if (updated) syncTask(updated, userId)
    }
  },

  deleteTask: (id) => {
    const { userId, tasks } = get()
    const task = tasks.find(t => t.id === id)
    if (!task) return
    failed.tasks.delete(id)
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
      lastDeleted: { task, at: Date.now() },
    }))
    if (userId) deleteRow('tasks', id)
  },

  toggleTask: (id) => {
    const { userId } = get()
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const completed = !task.completed

    if (completed && task.recurring) {
      const today = todayStr()
      const recurring = withMonthlyAnchor(task.recurring, task.dueDate ?? task.startDate)
      let dueDate = task.dueDate
      let startDate = task.startDate
      if (startDate && !dueDate) {
        startDate = nextOccurrenceAfter(recurring, startDate, today)
      } else {
        dueDate = nextOccurrenceAfter(recurring, task.dueDate ?? today, today)
        // Keep the same lead time between start and due on the next round
        if (startDate && task.dueDate) startDate = shiftDate(startDate, daysBetween(task.dueDate, dueDate))
      }
      set(s => ({
        tasks: s.tasks.map(t =>
          t.id === id
            ? { ...t, completed: false, status: 'todo', completedAt: undefined, dueDate, startDate, recurring, updatedAt: new Date().toISOString() }
            : t
        ),
      }))
      if (userId) {
        const updated = get().tasks.find(t => t.id === id)
        if (updated) syncTask(updated, userId)
      }
      return
    }

    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id
          ? {
              ...t,
              completed,
              status: completed ? 'done' : 'todo',
              completedAt: completed ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === id)
      if (updated) syncTask(updated, userId)
    }
  },

  reorderTasks: (orderedIds) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t => {
        const idx = orderedIds.indexOf(t.id)
        return idx >= 0 ? { ...t, order: idx } : t
      }),
    }))
    if (userId) {
      const affected = get().tasks.filter(t => orderedIds.includes(t.id))
      Promise.all(affected.map(t => syncTask(t, userId)))
    }
  },

  moveTaskStatus: (id, status) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === id
          ? {
              ...t,
              status,
              completed: status === 'done',
              completedAt: status === 'done' ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === id)
      if (updated) syncTask(updated, userId)
    }
  },

  addSubtask: (taskId, title) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t => {
        if (t.id !== taskId) return t
        const newSub: Subtask = { id: uuid(), title, completed: false, order: t.subtasks.length }
        return { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() }
      }),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === taskId)
      if (updated) syncTask(updated, userId)
    }
  },

  updateSubtask: (taskId, subtaskId, updates) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t => {
        if (t.id !== taskId) return t
        return {
          ...t,
          subtasks: t.subtasks.map(s => (s.id === subtaskId ? { ...s, ...updates } : s)),
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === taskId)
      if (updated) syncTask(updated, userId)
    }
  },

  deleteSubtask: (taskId, subtaskId) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t => {
        if (t.id !== taskId) return t
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId),
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === taskId)
      if (updated) syncTask(updated, userId)
    }
  },

  toggleSubtask: (taskId, subtaskId) => {
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.map(t => {
        if (t.id !== taskId) return t
        return {
          ...t,
          subtasks: t.subtasks.map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          ),
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
    if (userId) {
      const updated = get().tasks.find(t => t.id === taskId)
      if (updated) syncTask(updated, userId)
    }
  },

  addLabel: (name, color) => {
    const { userId } = get()
    const id = uuid()
    const label: Label = { id, name: name.toLowerCase().trim(), color }
    set(s => ({ labels: [...s.labels, label] }))
    if (userId) syncLabel(label, userId)
    return id
  },

  updateLabel: (id, updates) => {
    const { userId } = get()
    set(s => ({ labels: s.labels.map(l => (l.id === id ? { ...l, ...updates } : l)) }))
    if (userId) {
      const updated = get().labels.find(l => l.id === id)
      if (updated) syncLabel(updated, userId)
    }
  },

  deleteLabel: (id) => {
    const { userId } = get()
    set(s => ({
      labels: s.labels.filter(l => l.id !== id),
      tasks: s.tasks.map(t => ({ ...t, labelIds: t.labelIds.filter(lid => lid !== id) })),
    }))
    failed.labels.delete(id)
    if (userId) deleteRow('labels', id)
  },

  setView: (view) => {
    set({ view, selectedTaskId: null })
    const s = get()
    savePrefs({ darkMode: s.darkMode, serifMode: s.serifMode, view })
  },
  toggleDarkMode: () => {
    set(s => {
      const darkMode = !s.darkMode
      savePrefs({ darkMode, serifMode: s.serifMode, view: s.view })
      return { darkMode }
    })
  },
  toggleSerifMode: () => {
    set(s => {
      const serifMode = !s.serifMode
      savePrefs({ darkMode: s.darkMode, serifMode, view: s.view })
      return { serifMode }
    })
  },
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useStore.getState().retrySaves())
}

// Expose for sample tasks default on first load (used nowhere else)
export const _SAMPLE_TASK_TITLE = 'Welcome to Dootoo! 👋'
export { todayStr }
