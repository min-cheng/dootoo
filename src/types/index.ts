export interface Subtask {
  id: string
  title: string
  completed: boolean
  order: number
}

export type RecurringPattern = 'daily' | 'weekly' | 'monthly' | 'weekdays'

export interface RecurringConfig {
  pattern: RecurringPattern
}

export type TaskStatus = 'todo' | 'inprogress' | 'done'

export interface Task {
  id: string
  title: string
  notes: string
  completed: boolean
  completedAt?: string
  dueDate?: string   // YYYY-MM-DD
  dueTime?: string   // HH:MM
  labelIds: string[]
  subtasks: Subtask[]
  recurring?: RecurringConfig
  status: TaskStatus // used for board view
  starred: boolean
  createdAt: string
  updatedAt: string
  order: number
}

export interface Label {
  id: string
  name: string
  color: string // tailwind color class base e.g. 'blue', 'green', 'red'
}

export type ViewType =
  | 'today'
  | 'upcoming'
  | 'all'
  | 'starred'
  | 'board'
  | 'calendar'
  | `label:${string}`
