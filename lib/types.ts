export type Role = 'admin' | 'planner' | 'viewer'
export type EventStatus = 'planning' | 'finalized'

// Using `type` (not `interface`) so Row extends Record<string, unknown> passes
// Supabase's GenericSchema conditional type check.

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  active: boolean
  created_at: string
}

export type Department = {
  id: string
  name: string
  color: string
  sort_order: number
  active: boolean
  created_at: string
}

export type DepartmentRecipient = {
  id: string
  department_id: string
  name: string
  email: string
  created_at: string
}

export type Event = {
  id: string
  name: string
  event_date: string        // 'YYYY-MM-DD' — never parse with new Date()
  start_time: string | null // 'HH:MM'
  end_time: string | null
  location: string | null
  description: string | null
  status: EventStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type Assignment = {
  id: string
  event_id: string
  department_id: string
  task: string
  task_date: string  // 'YYYY-MM-DD'
  task_time: string  // 'HH:MM'
  notes: string | null
  completed_at: string | null
  completed_by: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Department, 'id'>>
        Relationships: []
      }
      department_recipients: {
        Row: DepartmentRecipient
        Insert: Omit<DepartmentRecipient, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<DepartmentRecipient, 'id'>>
        Relationships: []
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Event, 'id'>>
        Relationships: []
      }
      assignments: {
        Row: Assignment
        Insert: Omit<Assignment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Assignment, 'id'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
