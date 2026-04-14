import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, Label, ViewType, Subtask } from '../types'
import { todayStr } from '../utils/date'

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface AppState {
  tasks: Task[]
  labels: Label[]
  view: ViewType
  darkMode: boolean
  serifMode: boolean
  selectedTaskId: string | null
  quickAddOpen: boolean

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

const LABEL_COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'pink', 'yellow', 'teal']

const DEFAULT_LABELS: Label[] = [
  { id: 'work', name: 'work', color: 'blue' },
  { id: 'personal', name: 'personal', color: 'green' },
  { id: 'errands', name: 'errands', color: 'orange' },
]

const SAMPLE_TASKS: Task[] = [
  {
    id: 'sample1',
    title: 'Welcome to Dootoo! 👋',
    notes: 'This is your new task manager. Press Q or ⌘K to quickly add tasks with natural language.',
    completed: false,
    dueDate: todayStr(),
    labelIds: [],
    subtasks: [
      { id: 's1', title: 'Try adding a task with Q or ⌘K', completed: false, order: 0 },
      { id: 's2', title: 'Try the Board and Calendar views', completed: false, order: 1 },
      { id: 's3', title: 'Create a label and tag your tasks', completed: false, order: 2 },
    ],
    recurring: undefined,
    status: 'todo',
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  },
]

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: SAMPLE_TASKS,
      labels: DEFAULT_LABELS,
      view: 'today',
      darkMode: false,
      serifMode: false,
      selectedTaskId: null,
      quickAddOpen: false,

      addTask: (partial) => {
        const id = uuid()
        const tasks = get().tasks
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: maxOrder + 1,
        }
        set(s => ({ tasks: [...s.tasks, task] }))
        return id
      },

      updateTask: (id, updates) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }))
      },

      deleteTask: (id) => {
        set(s => ({
          tasks: s.tasks.filter(t => t.id !== id),
          selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
        }))
      },

      toggleTask: (id) => {
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
      },

      reorderTasks: (orderedIds) => {
        set(s => ({
          tasks: s.tasks.map(t => {
            const idx = orderedIds.indexOf(t.id)
            return idx >= 0 ? { ...t, order: idx } : t
          }),
        }))
      },

      moveTaskStatus: (id, status) => {
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
      },

      addSubtask: (taskId, title) => {
        set(s => ({
          tasks: s.tasks.map(t => {
            if (t.id !== taskId) return t
            const order = t.subtasks.length
            const newSub: Subtask = { id: uuid(), title, completed: false, order }
            return { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() }
          }),
        }))
      },

      updateSubtask: (taskId, subtaskId, updates) => {
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
      },

      deleteSubtask: (taskId, subtaskId) => {
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
      },

      toggleSubtask: (taskId, subtaskId) => {
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
      },

      addLabel: (name, color) => {
        const id = uuid()
        const label: Label = { id, name: name.toLowerCase().trim(), color }
        set(s => ({ labels: [...s.labels, label] }))
        return id
      },

      updateLabel: (id, updates) => {
        set(s => ({ labels: s.labels.map(l => (l.id === id ? { ...l, ...updates } : l)) }))
      },

      deleteLabel: (id) => {
        set(s => ({
          labels: s.labels.filter(l => l.id !== id),
          tasks: s.tasks.map(t => ({ ...t, labelIds: t.labelIds.filter(lid => lid !== id) })),
        }))
      },

      setView: (view) => set({ view }),
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      toggleSerifMode: () => set(s => ({ serifMode: !s.serifMode })),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setQuickAddOpen: (open) => set({ quickAddOpen: open }),
    }),
    {
      name: 'dootoo-store',
      version: 1,
    }
  )
)

export { LABEL_COLORS }
