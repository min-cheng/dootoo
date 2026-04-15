import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, Label, ViewType, Subtask } from '../types'
import { todayStr } from '../utils/date'

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
async function syncTask(task: Task, userId: string) {
  const { error } = await supabase.from('tasks').upsert(taskToRow(task, userId))
  if (error) console.error('[dootoo] task sync failed:', error)
}
async function syncLabel(label: Label, userId: string) {
  const { error } = await supabase.from('labels').upsert({ ...label, user_id: userId })
  if (error) console.error('[dootoo] label sync failed:', error)
}

// --- UI prefs (per-device, stay in localStorage) ---
function loadPrefs() {
  try {
    const raw = localStorage.getItem('dootoo-prefs')
    if (raw) return JSON.parse(raw) as { darkMode: boolean; serifMode: boolean; view: ViewType }
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

  // Data lifecycle
  loadData: (userId: string) => Promise<void>
  setUserId: (id: string | null) => void

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

  setUserId: (id) => set({ userId: id }),

  loadData: async (userId) => {
    set({ loading: true })
    const [tasksRes, labelsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).order('order'),
      supabase.from('labels').select('*').eq('user_id', userId),
    ])

    const tasks = (tasksRes.data ?? []).map(rowToTask)
    const labels = (labelsRes.data ?? []).map(rowToLabel)

    // First-time migration: import tasks from old localStorage store
    if (tasks.length === 0 && labels.length === 0) {
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
            set({ tasks: oldTasks, labels: oldLabels, loading: false, userId })
            return
          }
        }
      } catch { /* ignore migration errors */ }
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
      dueDate: partial.dueDate,
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
    const { userId } = get()
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
    }))
    if (userId) supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[dootoo] task delete failed:', error)
    })
  },

  toggleTask: (id) => {
    const { userId } = get()
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const completed = !task.completed
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
    if (userId) supabase.from('labels').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[dootoo] label delete failed:', error)
    })
  },

  setView: (view) => {
    set({ view })
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

// Expose for sample tasks default on first load (used nowhere else)
export const _SAMPLE_TASK_TITLE = 'Welcome to Dootoo! 👋'
export { todayStr }
